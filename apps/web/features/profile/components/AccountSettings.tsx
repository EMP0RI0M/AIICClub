"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { Input } from "@/shared/components/ui";
import { useAuthStore, type User } from "@/features/auth/store/auth-store";
import { requestPasswordReset, updateEmail } from "@/features/auth/api/auth";
import { useRouter } from "next/navigation";

const LABEL = "font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary";

const STATUS_OPTIONS: { id: User["status"]; label: string; dot: string }[] = [
  { id: "online", label: "Online", dot: "bg-status-online" },
  { id: "idle", label: "Idle", dot: "bg-status-idle" },
  { id: "dnd", label: "Do not disturb", dot: "bg-status-dnd" },
  { id: "invisible", label: "Invisible", dot: "bg-text-faint" },
];

function SaveButton({
  onClick,
  busy,
  done,
  children = "Save",
}: {
  onClick: () => void;
  busy?: boolean;
  done?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "h-9 shrink-0 rounded-md px-4 text-[13px] font-medium transition-colors",
        done
          ? "border border-success/40 text-success"
          : "bg-accent text-on-accent hover:bg-accent-violet-bright",
        busy && "opacity-60"
      )}
    >
      {done ? "Saved" : busy ? "Saving…" : children}
    </button>
  );
}

function SignedOutNote() {
  const router = useRouter();
  return (
    <div className="mt-6 rounded-xl border border-border bg-surface-raised p-6 text-center">
      <p className="text-[14px] text-text-secondary">
        Please sign in to access and manage your account settings.
      </p>
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-xs font-semibold text-on-accent hover:bg-accent-violet-bright transition-colors"
      >
        Sign In
      </button>
    </div>
  );
}

/**
 * Reusable Account Settings Component.
 * Single source of truth shared between:
 * 1. Spaces / Chat Settings Modal
 * 2. Profile Settings Route (/profile/settings)
 */
export function AccountSettings() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setStatus = useAuthStore((s) => s.setStatus);
  const changeUsername = useAuthStore((s) => s.changeUsername);
  const checkUsername = useAuthStore((s) => s.checkUsername);
  const logout = useAuthStore((s) => s.logout);

  const [username, setUsername] = useState(user?.username ?? "");
  const [availability, setAvailability] = useState<null | "checking" | "available" | "taken" | "invalid">(null);
  const [usernameState, setUsernameState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [usernameError, setUsernameError] = useState("");

  const [email, setEmail] = useState(user?.email ?? "");
  const [emailState, setEmailState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  const [resetState, setResetState] = useState<"idle" | "busy" | "sent">("idle");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  if (!user) return <SignedOutNote />;

  const onUsernameInput = (next: string) => {
    setUsername(next);
    setUsernameState("idle");
    setUsernameError("");
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const normalized = next.trim().toLowerCase();
    if (normalized === user.username) {
      setAvailability(null);
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalized)) {
      setAvailability("invalid");
      return;
    }
    setAvailability("checking");
    checkTimer.current = setTimeout(async () => {
      const free = await checkUsername(normalized);
      setAvailability(free === null ? null : free ? "available" : "taken");
    }, 350);
  };

  const saveUsername = async () => {
    setUsernameState("busy");
    try {
      await changeUsername(username);
      setUsernameState("done");
      setAvailability(null);
    } catch (err) {
      setUsernameState("error");
      setUsernameError(err instanceof Error ? err.message : "Could not change username.");
    }
  };

  const saveEmail = async () => {
    setEmailState("busy");
    try {
      await updateEmail(email.trim());
      setEmailState("sent");
    } catch {
      setEmailState("error");
    }
  };

  const sendReset = async () => {
    setResetState("busy");
    try {
      await requestPasswordReset(user.email);
      setResetState("sent");
    } catch {
      setResetState("idle");
    }
  };

  const handleSignOut = async () => {
    logout();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-hidden">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-text-primary">My Account</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Manage your personal identity, availability status, credentials, and session.
        </p>
      </div>

      {/* Status */}
      <div className="w-full">
        <p className={cn(LABEL, "mb-2")}>Status</p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              data-active={user.status === s.id}
              onClick={() => setStatus(s.id)}
              className={cn(
                "flex h-9 items-center justify-center gap-2 rounded-md px-3 font-mono text-[12px] tracking-[0.04em] transition-colors sm:h-8 sm:justify-start",
                user.status === s.id
                  ? "border border-accent-muted bg-accent-soft text-accent font-semibold"
                  : "border border-border text-text-secondary hover:border-border-active hover:text-text-primary"
              )}
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Username */}
      <div className="w-full">
        <p className={cn(LABEL, "mb-1.5")}>Username</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Input value={username} onChange={(e) => onUsernameInput(e.target.value)} />
          </div>
          {username.trim().toLowerCase() !== user.username && availability === "available" && (
            <SaveButton onClick={saveUsername} busy={usernameState === "busy"} done={usernameState === "done"} />
          )}
        </div>
        <p
          className={cn(
            "mt-1.5 min-h-[16px] truncate font-mono text-[11px]",
            availability === "available"
              ? "text-success"
              : availability === "taken" || availability === "invalid" || usernameState === "error"
                ? "text-danger"
                : "text-text-muted"
          )}
        >
          {usernameState === "error"
            ? usernameError
            : availability === "checking"
              ? "checking…"
              : availability === "available"
                ? `@${username.trim().toLowerCase()} is available`
                : availability === "taken"
                  ? `@${username.trim().toLowerCase()} is taken`
                  : availability === "invalid"
                    ? "3–30 characters · letters, numbers, underscores"
                    : `@${user.username}`}
        </p>
      </div>

      {/* Email */}
      <div className="w-full">
        <p className={cn(LABEL, "mb-1.5")}>Email</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Input value={email} type="email" onChange={(e) => { setEmail(e.target.value); setEmailState("idle"); }} />
          </div>
          {email.trim() !== user.email && (
            <SaveButton onClick={saveEmail} busy={emailState === "busy"} done={emailState === "sent"}>
              Update
            </SaveButton>
          )}
        </div>
        <p className={cn("mt-1.5 min-h-[16px] truncate font-mono text-[11px]", emailState === "error" ? "text-danger" : "text-text-muted")}>
          {emailState === "sent"
            ? "verification sent — check both inboxes"
            : emailState === "error"
              ? "could not update email"
              : "used for sign-in and recovery"}
        </p>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-text-primary">Password</div>
          <div className="mt-0.5 break-words text-[12px] text-text-muted">
            We&apos;ll email {user.email} a secure reset link.
          </div>
        </div>
        <button
          type="button"
          onClick={sendReset}
          disabled={resetState !== "idle"}
          className={cn(
            "h-9 shrink-0 rounded-md border px-4 text-[13px] font-medium transition-colors sm:h-8",
            resetState === "sent"
              ? "border-success/40 text-success"
              : "border-border text-text-secondary hover:border-border-active hover:text-text-primary"
          )}
        >
          {resetState === "sent" ? "Email sent" : resetState === "busy" ? "Sending…" : "Send reset email"}
        </button>
      </div>

      {/* Session / Sign Out */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleSignOut}
          className="h-9 shrink-0 rounded-md border border-border px-4 text-[13px] font-medium text-text-secondary transition-colors hover:border-danger hover:text-danger"
        >
          Sign out
        </button>
        <span className="break-words text-[12px] text-text-muted">
          Account deletion is handled by your instance admin.
        </span>
      </div>
    </div>
  );
}

export default AccountSettings;
