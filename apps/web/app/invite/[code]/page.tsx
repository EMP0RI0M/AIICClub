"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { joinInvite } from "@/shared/lib/api";
import { Users, Sparkles, ArrowRight, AlertCircle, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface InviteDetails {
  id: string;
  code: string;
  serverId: string;
  serverName: string;
  serverIcon?: string | null;
  serverDescription?: string | null;
  memberCount: number;
  inviterName: string;
  expiresAt?: string | null;
  maxUses?: number | null;
  uses?: number;
  isMember?: boolean;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params?.code as string) || "";
  const code = rawCode.replace(/\/+$/, "").trim();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inviteData, setInviteData] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("No invite code provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorReason(null);

    fetch(`/api/invites/${encodeURIComponent(code)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.error || "Invite not found or invalid.");
          (err as any).reason = data.reason;
          (err as any).serverName = data.serverName;
          throw err;
        }
        return data;
      })
      .then((data) => {
        setInviteData(data.invite);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("[INVITE_PAGE_RESOLVE_ERROR]", { code, err });
        setError(err.message || "Invalid invite link");
        setErrorReason(err.reason || "unknown");
        setLoading(false);
      });
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;

    if (!isAuthenticated) {
      router.push(`/login?redirect=/join/${encodeURIComponent(code)}`);
      return;
    }

    // If already a member, navigate directly
    if (inviteData?.isMember && inviteData.serverId) {
      router.push(`/spaces/${inviteData.serverId}`);
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const res = await joinInvite(code);
      if (res?.server?.id) {
        router.push(`/spaces/${res.server.id}`);
      } else {
        router.push("/spaces");
      }
    } catch (err: any) {
      console.error("[INVITE_PAGE_JOIN_ERROR]", { code, err });
      setError(err?.message || "Failed to join space. Please try again.");
      setJoining(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#090c12] p-4 text-text-primary overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-accent/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[400px] w-[500px] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-[420px] rounded-[28px] border border-white/[0.1] bg-[#121722]/85 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-accent" />
            <p className="mt-4 font-mono text-xs text-text-muted">Resolving invite link...</p>
          </div>
        ) : error || !inviteData ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
              <AlertCircle size={28} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-text-primary">
              {errorReason === "expired"
                ? "Invite Link Expired"
                : errorReason === "maxed"
                ? "Usage Limit Reached"
                : "Invalid Invite Link"}
            </h2>
            <p className="mt-2 text-xs text-text-muted leading-relaxed">
              {error || "This invite link may have expired or been revoked by the space administrator."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/spaces"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 font-mono text-xs font-semibold text-on-accent hover:opacity-90 transition-all"
              >
                Go to AIIC Spaces
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            {/* Inviter label */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/40 px-3 py-1 font-mono text-[10.5px] font-semibold text-accent backdrop-blur-md">
              <Sparkles size={11} />
              <span>Invited by {inviteData.inviterName}</span>
            </div>

            {/* Space Icon & Name */}
            <div className="mt-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.12] bg-gradient-to-b from-white/[0.08] to-transparent shadow-lg overflow-hidden">
              {inviteData.serverIcon ? (
                <img
                  src={inviteData.serverIcon}
                  alt={inviteData.serverName}
                  className="h-full w-full rounded-3xl object-cover"
                />
              ) : (
                <span className="font-mono text-2xl font-black text-accent">
                  {inviteData.serverName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-xl font-bold tracking-tight text-text-primary">
              {inviteData.serverName}
            </h1>

            {inviteData.serverDescription && (
              <p className="mt-1.5 text-xs text-text-secondary line-clamp-2">
                {inviteData.serverDescription}
              </p>
            )}

            <div className="mt-3 flex items-center justify-center gap-3 font-mono text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-accent" />
                <span>{inviteData.memberCount} {inviteData.memberCount === 1 ? "Member" : "Members"}</span>
              </span>
              {inviteData.isMember && (
                <span className="flex items-center gap-1 text-success font-semibold">
                  <ShieldCheck size={13} />
                  <span>Member</span>
                </span>
              )}
            </div>

            {/* CTA Button */}
            <div className="mt-8 w-full">
              {isAuthenticated ? (
                inviteData.isMember ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-success/30 bg-success/10 p-2.5 font-mono text-xs text-success flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} /> You are already a member of this space.
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/spaces/${inviteData.serverId}`)}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-mono text-xs font-bold text-on-accent shadow-[0_4px_24px_rgba(var(--c-accent-rgb,138,92,246),0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>Open Space</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={joining}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-mono text-xs font-bold text-on-accent shadow-[0_4px_24px_rgba(var(--c-accent-rgb,138,92,246),0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {joining ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Joining Space...</span>
                      </>
                    ) : (
                      <>
                        <span>Accept Invite &amp; Enter Space</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                )
              ) : (
                <div className="space-y-2.5">
                  <Link
                    href={`/login?redirect=/join/${encodeURIComponent(code)}`}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-mono text-xs font-bold text-on-accent shadow-[0_4px_24px_rgba(var(--c-accent-rgb,138,92,246),0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Sign In to Accept Invite</span>
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    href={`/register?redirect=/join/${encodeURIComponent(code)}`}
                    className="flex h-9 w-full items-center justify-center font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
                  >
                    Don&apos;t have an account? Create one
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
