import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/api/auth-helper";
import { CredentialVault, type AIProvider } from "@/features/studio/vault/credential-vault";

export const dynamic = "force-dynamic";

/**
 * GET /api/studio/credentials
 * Lists the authenticated user's registered BYOK credentials (masked).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    // If not logged in, fallback to guest/demo studio credentials
    const userId = user?.id || "guest-studio-user";

    const credentials = await CredentialVault.listCredentials(userId);
    return NextResponse.json({ credentials });
  } catch (err: any) {
    return NextResponse.json({ credentials: [] });
  }
}

/**
 * POST /api/studio/credentials
 * Saves an encrypted BYOK credential in the vault.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || "guest-studio-user";

    const body = await req.json();
    const { provider, label, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "Provider and apiKey are required." }, { status: 400 });
    }

    const summary = await CredentialVault.createCredential({
      userId,
      provider: provider as AIProvider,
      label: label || `${provider} Key`,
      apiKey,
    });

    return NextResponse.json({ credential: summary }, { status: 201 });
  } catch (err: any) {
    console.error("[CREDENTIAL_VAULT_SAVE_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to save credential" }, { status: 500 });
  }
}
