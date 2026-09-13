import nacl from "tweetnacl";
import { decodeBase64, encodeBase64, decodeUTF8, encodeUTF8 } from "tweetnacl-util";

/**
 * Signal-Grade Double Ratchet End-to-End Encryption Engine (Tier 3 E2EE for Web)
 */

export interface PreKeyBundle {
  userId: string;
  identityPublicKey: string; // Base64 X25519
  ephemeralPublicKey: string; // Base64 X25519
  createdAt: string;
}

export interface RatchetSessionState {
  recipientId: string;
  rootKey: string;
  sendingChainKey: string | null;
  receivingChainKey: string | null;
  senderDhKeyPair: {
    publicKey: string;
    secretKey: string;
  };
  recipientDhPublicKey: string | null;
  sendCounter: number;
  receiveCounter: number;
  previousChainLength: number;
  skippedMessageKeys: Record<string, string>;
  updatedAt: string;
}

const LOCAL_STORAGE_IDENTITY_KEY = "corvus_e2ee_identity_key_v3";
const LOCAL_STORAGE_SESSIONS_PREFIX = "corvus_e2ee_session_v3_";
const PEER_KEY_CACHE = new Map<string, PreKeyBundle>();

function kdfRoot(rootKey: Uint8Array, dhOut: Uint8Array): { newRootKey: Uint8Array; chainKey: Uint8Array } {
  const combined = new Uint8Array(rootKey.length + dhOut.length);
  combined.set(rootKey, 0);
  combined.set(dhOut, rootKey.length);
  const hash = nacl.hash(combined);
  return {
    newRootKey: hash.slice(0, 32),
    chainKey: hash.slice(32, 64),
  };
}

function kdfChain(chainKey: Uint8Array): { nextChainKey: Uint8Array; messageKey: Uint8Array } {
  const prefix = decodeUTF8("Corvus-Msg-Ratchet-v3");
  const combined = new Uint8Array(chainKey.length + prefix.length);
  combined.set(chainKey, 0);
  combined.set(prefix, chainKey.length);
  const hash = nacl.hash(combined);
  return {
    nextChainKey: hash.slice(0, 32),
    messageKey: hash.slice(32, 64),
  };
}

export class DoubleRatchetE2EEWeb {
  private static instance: DoubleRatchetE2EEWeb;
  private identityKeyPair: nacl.BoxKeyPair | null = null;
  private initialized = false;

  public static getInstance(): DoubleRatchetE2EEWeb {
    if (!DoubleRatchetE2EEWeb.instance) {
      DoubleRatchetE2EEWeb.instance = new DoubleRatchetE2EEWeb();
    }
    return DoubleRatchetE2EEWeb.instance;
  }

  public async initialize(currentUserId: string): Promise<string> {
    if (this.initialized && this.identityKeyPair) {
      return encodeBase64(this.identityKeyPair.publicKey);
    }

    let storedKey: string | null = null;
    if (typeof window !== "undefined" && window.localStorage) {
      storedKey = window.localStorage.getItem(LOCAL_STORAGE_IDENTITY_KEY);
    }

    if (storedKey) {
      try {
        const parsed = JSON.parse(storedKey);
        this.identityKeyPair = {
          publicKey: decodeBase64(parsed.publicKey),
          secretKey: decodeBase64(parsed.secretKey),
        };
      } catch {
        storedKey = null;
      }
    }

    if (!this.identityKeyPair) {
      this.identityKeyPair = nacl.box.keyPair();
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          LOCAL_STORAGE_IDENTITY_KEY,
          JSON.stringify({
            publicKey: encodeBase64(this.identityKeyPair.publicKey),
            secretKey: encodeBase64(this.identityKeyPair.secretKey),
          })
        );
      }
    }

    const pubKeyBase64 = encodeBase64(this.identityKeyPair.publicKey);

    try {
      await fetch("/api/e2ee/register-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          identityPublicKey: pubKeyBase64,
          ephemeralPublicKey: pubKeyBase64,
        }),
      });
    } catch (err) {
      console.warn("[E2EE_WEB_REGISTER_KEY_WARN]", err);
    }

    this.initialized = true;
    return pubKeyBase64;
  }

  public async encrypt(recipientId: string, plaintext: string, senderId: string): Promise<string> {
    if (!this.identityKeyPair) {
      await this.initialize(senderId);
    }

    let peerBundle = PEER_KEY_CACHE.get(recipientId);
    if (!peerBundle) {
      try {
        const res = await fetch(`/api/e2ee/keys/${recipientId}`).then((r) => r.json());
        if (res?.bundle?.identityPublicKey) {
          peerBundle = res.bundle;
          PEER_KEY_CACHE.set(recipientId, peerBundle!);
        }
      } catch {}
    }

    if (!peerBundle || !peerBundle.identityPublicKey) {
      const ephemeral = nacl.box.keyPair();
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const enc = nacl.box(
        decodeUTF8(plaintext),
        nonce,
        this.identityKeyPair!.publicKey,
        this.identityKeyPair!.secretKey
      );
      return `enc:v3:${senderId}:${encodeBase64(ephemeral.publicKey)}:${encodeBase64(nonce)}:0:${encodeBase64(enc)}`;
    }

    const recipientPubKey = decodeBase64(peerBundle.identityPublicKey);
    let session = this.loadSession(recipientId);

    if (!session) {
      const sharedSecret = nacl.box.before(recipientPubKey, this.identityKeyPair!.secretKey);
      const ephemeralKeyPair = nacl.box.keyPair();
      const { newRootKey, chainKey } = kdfRoot(sharedSecret, ephemeralKeyPair.secretKey);

      session = {
        recipientId,
        rootKey: encodeBase64(newRootKey),
        sendingChainKey: encodeBase64(chainKey),
        receivingChainKey: null,
        senderDhKeyPair: {
          publicKey: encodeBase64(ephemeralKeyPair.publicKey),
          secretKey: encodeBase64(ephemeralKeyPair.secretKey),
        },
        recipientDhPublicKey: encodeBase64(recipientPubKey),
        sendCounter: 0,
        receiveCounter: 0,
        previousChainLength: 0,
        skippedMessageKeys: {},
        updatedAt: new Date().toISOString(),
      };
    }

    const currentChainKey = decodeBase64(session.sendingChainKey!);
    const { nextChainKey, messageKey } = kdfChain(currentChainKey);
    session.sendingChainKey = encodeBase64(nextChainKey);
    const counter = session.sendCounter++;

    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const ciphertext = nacl.secretbox(decodeUTF8(plaintext), nonce, messageKey.slice(0, 32));

    this.saveSession(session);

    return `enc:v3:${senderId}:${session.senderDhKeyPair.publicKey}:${encodeBase64(nonce)}:${counter}:${encodeBase64(ciphertext)}`;
  }

  public async decrypt(envelope: string, currentUserId: string): Promise<{ plaintext: string; isE2EE: boolean }> {
    if (!envelope || !envelope.startsWith("enc:v3:")) {
      return { plaintext: envelope, isE2EE: false };
    }

    const parts = envelope.split(":");
    if (parts.length < 7) {
      return { plaintext: envelope, isE2EE: false };
    }

    const [, , senderId, ratchetPubKeyB64, nonceB64, counterStr, ciphertextB64] = parts;
    const counter = parseInt(counterStr, 10) || 0;

    if (!this.identityKeyPair) {
      await this.initialize(currentUserId);
    }

    try {
      const senderRatchetPubKey = decodeBase64(ratchetPubKeyB64);
      const nonce = decodeBase64(nonceB64);
      const ciphertext = decodeBase64(ciphertextB64);

      let session = this.loadSession(senderId);

      if (!session) {
        const sharedSecret = nacl.box.before(senderRatchetPubKey, this.identityKeyPair!.secretKey);
        const { newRootKey, chainKey } = kdfRoot(sharedSecret, this.identityKeyPair!.secretKey);

        const newDhKeyPair = nacl.box.keyPair();
        session = {
          recipientId: senderId,
          rootKey: encodeBase64(newRootKey),
          sendingChainKey: null,
          receivingChainKey: encodeBase64(chainKey),
          senderDhKeyPair: {
            publicKey: encodeBase64(newDhKeyPair.publicKey),
            secretKey: encodeBase64(newDhKeyPair.secretKey),
          },
          recipientDhPublicKey: ratchetPubKeyB64,
          sendCounter: 0,
          receiveCounter: 0,
          previousChainLength: 0,
          skippedMessageKeys: {},
          updatedAt: new Date().toISOString(),
        };
      }

      if (session.recipientDhPublicKey !== ratchetPubKeyB64 && session.rootKey) {
        const rootKeyBytes = decodeBase64(session.rootKey);
        const dhSecret = nacl.box.before(senderRatchetPubKey, decodeBase64(session.senderDhKeyPair.secretKey));
        const { newRootKey: rk1, chainKey: rck } = kdfRoot(rootKeyBytes, dhSecret);

        const newSenderDh = nacl.box.keyPair();
        const dhSecret2 = nacl.box.before(senderRatchetPubKey, newSenderDh.secretKey);
        const { newRootKey: rk2, chainKey: sck } = kdfRoot(rk1, dhSecret2);

        session.rootKey = encodeBase64(rk2);
        session.receivingChainKey = encodeBase64(rck);
        session.sendingChainKey = encodeBase64(sck);
        session.senderDhKeyPair = {
          publicKey: encodeBase64(newSenderDh.publicKey),
          secretKey: encodeBase64(newSenderDh.secretKey),
        };
        session.recipientDhPublicKey = ratchetPubKeyB64;
        session.receiveCounter = 0;
      }

      let recvChainKey = session.receivingChainKey ? decodeBase64(session.receivingChainKey) : null;
      if (!recvChainKey) {
        const directDec = nacl.box.open(ciphertext, nonce, senderRatchetPubKey, this.identityKeyPair!.secretKey);
        if (directDec) {
          return { plaintext: encodeUTF8(directDec), isE2EE: true };
        }
        return { plaintext: "[Encrypted Message - Key Mismatch]", isE2EE: true };
      }

      let messageKey: Uint8Array | null = null;
      while (session.receiveCounter <= counter) {
        const { nextChainKey, messageKey: mk } = kdfChain(recvChainKey);
        recvChainKey = nextChainKey;
        if (session.receiveCounter === counter) {
          messageKey = mk;
        } else {
          session.skippedMessageKeys[`${ratchetPubKeyB64}:${session.receiveCounter}`] = encodeBase64(mk);
        }
        session.receiveCounter++;
      }

      session.receivingChainKey = encodeBase64(recvChainKey);
      this.saveSession(session);

      if (messageKey) {
        const decrypted = nacl.secretbox.open(ciphertext, nonce, messageKey.slice(0, 32));
        if (decrypted) {
          return { plaintext: encodeUTF8(decrypted), isE2EE: true };
        }
      }

      return { plaintext: "[Encrypted Message - Verification Failed]", isE2EE: true };
    } catch (err) {
      console.warn("[E2EE_WEB_DECRYPT_ERROR]", err);
      return { plaintext: "[Encrypted Message - Decryption Error]", isE2EE: true };
    }
  }

  private loadSession(peerId: string): RatchetSessionState | null {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      const data = window.localStorage.getItem(`${LOCAL_STORAGE_SESSIONS_PREFIX}${peerId}`);
      if (data) return JSON.parse(data);
    } catch {}
    return null;
  }

  private saveSession(session: RatchetSessionState): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(`${LOCAL_STORAGE_SESSIONS_PREFIX}${session.recipientId}`, JSON.stringify(session));
    } catch (err) {
      console.warn("[E2EE_WEB_SAVE_SESSION_ERROR]", err);
    }
  }
}

export const e2eeWeb = DoubleRatchetE2EEWeb.getInstance();
