"use client";

import { useEffect, useRef, useState } from "react";
import { cn, useTheme, type ThemePreference } from "@corvus/ui";
import { Avatar, Input, Toggle } from "@/shared/components/ui";
import { useAuthStore, type User } from "@/features/auth/store/auth-store";
import { requestPasswordReset, updateEmail } from "@/features/auth/api/auth";
import { playNotificationTone, showSystemNotification } from "@/shared/lib/notifications";
import { NOTIFICATION_SOUNDS, type NotificationKind } from "@/shared/lib/sounds";
import { API_URL } from "@/shared/lib/endpoints";
import { fetchUserSettings, saveUserSettings } from "@/shared/lib/api";

/**
 * User/app settings sections (brief §Settings) — every control here reads and
 * writes real state: the Supabase-backed auth store, the theme provider, the
 * sound engine, media devices, or persisted local preferences.
 */

/* ── Shared bits ────────────────────────────────────────────────────── */

const LABEL = "font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={cn(LABEL, "mb-1.5")}>{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-text-muted">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-4">
      <div className="pr-6">
        <div className="text-[14px] text-text-primary">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] text-text-muted">{hint}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}

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

/** A local preference persisted to localStorage, read once on mount. */
type Widen<T> = T extends boolean ? boolean : T extends number ? number : T extends string ? string : T;

function useLocalPref<T extends string | number | boolean>(key: string, fallback: T) {
  const [value, setValue] = useState<Widen<T>>(fallback as Widen<T>);
  const signedIn = useAuthStore((s) => !!s.user);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as Widen<T>);
    } catch {
      /* unreadable pref — keep fallback */
    }
    if (!signedIn) return;
    fetchUserSettings()
      .then(({ settings }) => {
        const remote = settings[key];
        if (typeof remote === typeof fallback) {
          setValue(remote as Widen<T>);
          localStorage.setItem(key, JSON.stringify(remote));
        }
      })
      .catch(() => {});
  }, [fallback, key, signedIn]);
  const update = (next: Widen<T>) => {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage full/blocked — state still applies for the session */
    }
    if (signedIn) {
      void fetchUserSettings()
        .then(({ settings }) => saveUserSettings({ ...settings, [key]: next }))
        .catch(() => {});
    }
  };
  return [value, update] as const;
}

function SignedOutNote() {
  return (
    <p className="mt-6 rounded-md border border-border bg-surface-raised px-4 py-3 text-[13px] leading-[1.6] text-text-secondary">
      You&apos;re viewing the design preview. Sign in to load and edit your real account.
    </p>
  );
}

import { AccountSettings } from "@/features/profile/components/AccountSettings";

/* ── My Account — identity, sign-in & security ──────────────────────── */
export const MyAccountSettings = AccountSettings;

/* ── Profile — public identity ──────────────────────────────────────── */

export function ProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const checkUsername = useAuthStore((s) => s.checkUsername);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [classYear, setClassYear] = useState(user?.classYear ?? "");
  const [section, setSection] = useState(user?.section ?? "");
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl ?? "");
  const [interestsText, setInterestsText] = useState((user?.interests || []).join(", "));
  const [skillsText, setSkillsText] = useState((user?.skills || []).join(", "));

  const [availability, setAvailability] = useState<null | "checking" | "available" | "taken" | "invalid">(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setUsername(user.username || "");
      setBio(user.bio ?? "");
      setAvatar(user.avatar ?? "");
      setClassYear(user.classYear ?? "");
      setSection(user.section ?? "");
      setGithubUrl(user.githubUrl ?? "");
      setLinkedinUrl(user.linkedinUrl ?? "");
      setWebsiteUrl(user.websiteUrl ?? "");
      setInterestsText((user.interests || []).join(", "));
      setSkillsText((user.skills || []).join(", "));
    }
  }, [user]);

  if (!user) return <SignedOutNote />;

  const onUsernameChange = (val: string) => {
    setUsername(val);
    setErrorMessage(null);
    if (checkTimer.current) clearTimeout(checkTimer.current);

    const normalized = val.trim().toLowerCase();
    if (normalized === user.username.toLowerCase()) {
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

  const dirty =
    displayName !== (user.displayName || "") ||
    username.trim().toLowerCase() !== user.username.toLowerCase() ||
    bio !== (user.bio ?? "") ||
    avatar !== (user.avatar ?? "") ||
    classYear !== (user.classYear ?? "") ||
    section !== (user.section ?? "") ||
    githubUrl !== (user.githubUrl ?? "") ||
    linkedinUrl !== (user.linkedinUrl ?? "") ||
    websiteUrl !== (user.websiteUrl ?? "") ||
    interestsText !== (user.interests || []).join(", ") ||
    skillsText !== (user.skills || []).join(", ");

  const save = async () => {
    setSaving(true);
    setErrorMessage(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalizedUsername)) {
      setErrorMessage("Username must be 3–30 characters using letters, numbers, or underscores.");
      setSaving(false);
      return;
    }

    const interestsArray = interestsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const skillsArray = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const token = useAuthStore.getState().token;
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          displayName: displayName.trim() || user.displayName,
          username: normalizedUsername,
          bio: bio.trim() || null,
          avatar: avatar.trim() || null,
          classYear: classYear.trim() || null,
          section: section.trim() || null,
          githubUrl: githubUrl.trim() || null,
          linkedinUrl: linkedinUrl.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          interests: interestsArray,
          skills: skillsArray,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update profile.");
      }

      if (json.user) {
        updateUser(json.user);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { uploadImage } = await import("@/shared/lib/api");
      const url = await uploadImage(file, "avatar");
      if (url) {
        setAvatar(url);
        updateUser({ avatar: url });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Live Preview Card */}
      <div>
        <p className={cn(LABEL, "mb-2")}>Live Profile Card Preview</p>
        <div className="flex flex-col sm:flex-row items-start gap-4 rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
          <Avatar src={avatar || null} name={displayName || username || user.username} size={54} radius={14} />
          <div className="min-w-0 flex-1 leading-tight space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[16px] font-bold text-text-primary">
                {displayName || username || user.username}
              </p>
              {(classYear || section) && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/15 text-accent border border-accent/20">
                  {[classYear, section].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <p className="font-mono text-[12px] text-text-muted">@{username || user.username}</p>
            {bio && <p className="mt-1 text-[13px] leading-[1.5] text-text-secondary">{bio}</p>}

            {(githubUrl || linkedinUrl || websiteUrl) && (
              <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap items-center gap-3 text-xs font-mono text-accent">
                {githubUrl && <span>GitHub: {githubUrl}</span>}
                {linkedinUrl && <span>LinkedIn: {linkedinUrl}</span>}
                {websiteUrl && <span>Web: {websiteUrl}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Basic Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Display Name" hint="Shown on your messages, posts, and member directories.">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Maya Chen" />
        </Field>

        <div>
          <Field label="Username" hint="Unique handle across AIIC (@handle).">
            <Input value={username} onChange={(e) => onUsernameChange(e.target.value)} placeholder="e.g. mayachen" />
          </Field>
          <p
            className={cn(
              "mt-1 min-h-[16px] truncate font-mono text-[11px]",
              availability === "available"
                ? "text-success"
                : availability === "taken" || availability === "invalid"
                ? "text-danger"
                : "text-text-muted"
            )}
          >
            {availability === "checking"
              ? "checking availability…"
              : availability === "available"
              ? `@${username.trim().toLowerCase()} is available`
              : availability === "taken"
              ? `@${username.trim().toLowerCase()} is already taken`
              : availability === "invalid"
              ? "3–30 characters · letters, numbers, underscores"
              : `@${user.username}`}
          </p>
        </div>
      </div>

      {/* Avatar */}
      <div>
        <p className={cn(LABEL, "mb-1.5")}>Avatar Picture</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={avatar} placeholder="https://…" onChange={(e) => setAvatar(e.target.value)} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 shrink-0 rounded-md border border-border px-3 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
          >
            {uploading ? "Uploading…" : "Upload file"}
          </button>
        </div>
      </div>

      {/* Bio */}
      <Field label="Bio" hint="Up to 190 characters, shown on your profile card.">
        <textarea
          value={bio}
          maxLength={190}
          rows={3}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A brief introduction about your focus, background, and projects..."
          className="w-full resize-none rounded-md border border-border bg-surface-input px-3 py-2.5 text-[14px] leading-[1.5] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-border-active"
        />
      </Field>

      {/* Academic / Section Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Class Year" hint="e.g. 2026, 2027, or Alumni">
          <Input value={classYear} onChange={(e) => setClassYear(e.target.value)} placeholder="e.g. 2026" />
        </Field>

        <Field label="Section" hint="e.g. Section A, AI Batch 1">
          <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Section B" />
        </Field>
      </div>

      {/* Social & Professional Links */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <span className={cn(LABEL, "block")}>Social &amp; Professional Links</span>

        <Field label="GitHub Profile URL" hint="Direct link to your GitHub profile.">
          <Input
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/your-username"
          />
        </Field>

        <Field label="LinkedIn Profile URL" hint="Direct link to your LinkedIn profile.">
          <Input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/your-profile"
          />
        </Field>

        <Field label="Personal Website / Portfolio URL" hint="Personal domain, blog, or portfolio.">
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
          />
        </Field>
      </div>

      {/* Interests & Skills */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <span className={cn(LABEL, "block")}>Skills &amp; Interests</span>

        <Field label="Skills" hint="Comma-separated skills (e.g. TypeScript, Next.js, PyTorch, DevOps)">
          <Input
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="TypeScript, Next.js, PostgreSQL, Docker"
          />
        </Field>

        <Field label="Interests" hint="Comma-separated interests (e.g. Machine Learning, WebRTC, Robotics, Distributed Systems)">
          <Input
            value={interestsText}
            onChange={(e) => setInterestsText(e.target.value)}
            placeholder="AI Agents, Cyber Security, Quantum Computing"
          />
        </Field>
      </div>

      {/* Save Action */}
      <div className="pt-2">
        <SaveButton onClick={save} busy={saving} done={saved}>
          {saving ? "Saving Changes..." : "Save Profile Changes"}
        </SaveButton>
      </div>
    </div>
  );
}

/* ── Privacy ────────────────────────────────────────────────────────── */

export function PrivacySettings() {
  const [readReceipts, setReadReceipts] = useLocalPref("corvus-privacy-read-receipts", true);
  const [typing, setTyping] = useLocalPref("corvus-privacy-typing", true);
  const [presence, setPresence] = useLocalPref("corvus-privacy-presence", true);
  const [dmsFromSpaces, setDmsFromSpaces] = useLocalPref("corvus-privacy-dms", true);

  return (
    <div className="mt-6 flex flex-col">
      <ToggleRow
        label="Send read receipts"
        hint="Let others see when you've read their messages."
        checked={readReceipts}
        onChange={setReadReceipts}
      />
      <ToggleRow
        label="Show typing indicator"
        hint="Others see “typing…” while you compose."
        checked={typing}
        onChange={setTyping}
      />
      <ToggleRow
        label="Share presence"
        hint="Show your online/idle status to friends and space members."
        checked={presence}
        onChange={setPresence}
      />
      <ToggleRow
        label="Allow DMs from space members"
        hint="People who share a space with you can message you directly."
        checked={dmsFromSpaces}
        onChange={setDmsFromSpaces}
      />
    </div>
  );
}

/* ── Notifications ──────────────────────────────────────────────────── */

const KIND_LABEL: Record<NotificationKind, { label: string; hint: string }> = {
  message: { label: "Messages", hint: "New messages in unmuted channels and DMs." },
  mention: { label: "Mentions", hint: "When someone @mentions you." },
  other: { label: "Everything else", hint: "Friend requests, invites, system events." },
};

export function NotificationsSettings() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [soundsOn, setSoundsOn] = useLocalPref("corvus-notif-sounds", true);
  const [volume, setVolume] = useLocalPref("corvus-notif-volume", 55);
  const [messageSound, setMessageSound] = useLocalPref("corvus-notif-sound-message", "chime");
  const [mentionSound, setMentionSound] = useLocalPref("corvus-notif-sound-mention", "sparkle");
  const [otherSound, setOtherSound] = useLocalPref("corvus-notif-sound-other", "soft");

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const soundFor: Record<NotificationKind, [string, (v: string) => void]> = {
    message: [messageSound, setMessageSound],
    mention: [mentionSound, setMentionSound],
    other: [otherSound, setOtherSound],
  };

  return (
    <div className="mt-6 flex flex-col gap-7">
      {/* Desktop notifications */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="pr-6">
          <div className="text-[14px] text-text-primary">Desktop notifications</div>
          <div className="mt-0.5 font-mono text-[11px] text-text-muted">
            permission: {permission}
          </div>
        </div>
        {permission === "granted" ? (
          <button
            type="button"
            onClick={() => void showSystemNotification("AIIC", "Notifications are working.")}
            className="h-8 rounded-md border border-border px-3 text-[13px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
          >
            Send test
          </button>
        ) : permission === "default" ? (
          <button
            type="button"
            onClick={() => void Notification.requestPermission().then(setPermission)}
            className="h-8 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            Enable
          </button>
        ) : (
          <span className="text-[12px] text-text-muted">
            {permission === "denied" ? "Blocked in browser settings" : "Not supported here"}
          </span>
        )}
      </div>

      <ToggleRow
        label="Notification sounds"
        hint="Play a tone with each notification."
        checked={soundsOn}
        onChange={setSoundsOn}
      />

      {soundsOn && (
        <>
          <div>
            <p className={cn(LABEL, "mb-2")}>Volume — {volume}%</p>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full max-w-[320px]"
            />
          </div>

          <div>
            <p className={cn(LABEL, "mb-1")}>Tones</p>
            {(Object.keys(KIND_LABEL) as NotificationKind[]).map((kind) => {
              const [value, set] = soundFor[kind];
              return (
                <div key={kind} className="flex items-center justify-between border-b border-border py-3.5">
                  <div className="pr-6">
                    <div className="text-[14px] text-text-primary">{KIND_LABEL[kind].label}</div>
                    <div className="mt-0.5 text-[12px] text-text-muted">{KIND_LABEL[kind].hint}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="h-8 rounded-md border border-border bg-surface-input px-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-active"
                    >
                      {NOTIFICATION_SOUNDS[kind].map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Preview ${KIND_LABEL[kind].label} tone`}
                      onClick={() => void playNotificationTone(kind, volume, value)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border font-mono text-[11px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Appearance ─────────────────────────────────────────────────────── */

const THEMES: { id: ThemePreference; label: string; hint: string }[] = [
  { id: "system", label: "System", hint: "Follow the OS" },
  { id: "dark", label: "Dark", hint: "Obsidian" },
  { id: "light", label: "Light", hint: "Cool paper" },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [compact, setCompact] = useLocalPref("corvus-appearance-compact", false);
  const [reduceMotion, setReduceMotion] = useLocalPref("corvus-appearance-reduce-motion", false);

  const handleThemeChange = (newTheme: ThemePreference) => {
    setTheme(newTheme);
    void import("@/shared/lib/user-settings-supabase").then(({ saveUserAppearance }) => {
      void saveUserAppearance({ theme: newTheme, compactMode: compact });
    });
  };

  const handleCompactChange = (newCompact: boolean) => {
    setCompact(newCompact);
    void import("@/shared/lib/user-settings-supabase").then(({ saveUserAppearance }) => {
      void saveUserAppearance({ theme, compactMode: newCompact });
    });
  };

  return (
    <div className="mt-6 flex flex-col gap-7">
      <div>
        <p className={cn(LABEL, "mb-2")}>Theme</p>
        <div className="grid max-w-[420px] grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              data-active={theme === t.id}
              onClick={() => handleThemeChange(t.id)}
              className={cn(
                "rounded-[10px] border px-3 py-3 text-left transition-colors",
                theme === t.id
                  ? "border-accent-muted bg-accent-soft"
                  : "border-border bg-surface-raised hover:border-border-active"
              )}
            >
              <p className={cn("text-[13px] font-medium", theme === t.id ? "text-accent" : "text-text-primary")}>
                {t.label}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-text-muted">{t.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <ToggleRow
          label="Compact message layout"
          hint="Tighter spacing between messages."
          checked={compact}
          onChange={handleCompactChange}
        />
        <ToggleRow
          label="Reduce motion"
          hint="Minimise non-essential animations (also honors your OS setting)."
          checked={reduceMotion}
          onChange={setReduceMotion}
        />
      </div>
    </div>
  );
}

/* ── Keybindings — the shortcuts that actually exist ─────────────────── */

const BINDINGS: { keys: string; action: string }[] = [
  { keys: "Ctrl F", action: "Search the current space" },
  { keys: "Ctrl Shift R", action: "Record an async clip" },
  { keys: "Enter", action: "Send message" },
  { keys: "Shift Enter", action: "New line in the composer" },
  { keys: "@", action: "Mention a member" },
  { keys: "/", action: "Insert a block (docs editor)" },
  { keys: "Esc", action: "Close panel / dialog" },
];

export function KeybindingsSettings() {
  return (
    <div className="mt-6">
      <p className="text-[13px] text-text-secondary">
        Built-in shortcuts. Custom bindings are on the roadmap.
      </p>
      <div className="mt-4 flex flex-col">
        {BINDINGS.map((b) => (
          <div key={b.action} className="flex h-11 items-center justify-between border-b border-border px-1">
            <span className="text-[13px] text-text-primary">{b.action}</span>
            <span className="flex gap-1">
              {b.keys.split(" ").map((k) => (
                <kbd
                  key={k}
                  className="rounded-[4px] border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-text-secondary"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Devices — real media-device enumeration ────────────────────────── */

export function DevicesSettings() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [mic, setMic] = useLocalPref("corvus-device-mic", "default");
  const [speaker, setSpeaker] = useLocalPref("corvus-device-speaker", "default");
  const [camera, setCamera] = useLocalPref("corvus-device-camera", "default");

  const refresh = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices(list);
    // Without permission, labels come back empty.
    setNeedsPermission(list.some((d) => d.kind === "audioinput") && list.every((d) => !d.label));
  };

  useEffect(() => {
    void refresh();
  }, []);

  const requestAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* declined — keep generic labels */
    }
    void refresh();
  };

  const pick = (kind: MediaDeviceKind, value: string, set: (v: string) => void) => {
    const options = devices.filter((d) => d.kind === kind);
    return (
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className="h-9 w-full max-w-[360px] rounded-md border border-border bg-surface-input px-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-active"
      >
        <option value="default">System default</option>
        {options.map((d, i) => (
          <option key={d.deviceId || i} value={d.deviceId}>
            {d.label || `${d.kind} ${i + 1}`}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      {needsPermission && (
        <div className="flex items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3">
          <span className="text-[13px] text-text-secondary">
            Allow microphone/camera access to see device names.
          </span>
          <button
            type="button"
            onClick={() => void requestAccess()}
            className="h-8 shrink-0 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            Allow
          </button>
        </div>
      )}
      <Field label="Microphone">{pick("audioinput", mic, setMic)}</Field>
      <Field label="Speakers">{pick("audiooutput", speaker, setSpeaker)}</Field>
      <Field label="Camera">{pick("videoinput", camera, setCamera)}</Field>
      <p className="text-[12px] text-text-muted">
        Selections apply to new calls and voice channels.
      </p>
    </div>
  );
}

/* ── Advanced ───────────────────────────────────────────────────────── */

export function AdvancedSettings() {
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const diagnostics = () =>
    [
      `corvus web`,
      `api: ${API_URL || "(not configured)"}`,
      `ua: ${navigator.userAgent}`,
      `theme: ${document.documentElement.getAttribute("data-theme")}`,
      `viewport: ${window.innerWidth}×${window.innerHeight}`,
    ].join("\n");

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Field label="API endpoint" hint="Set via NEXT_PUBLIC_API_URL at build time.">
        <code className="block truncate rounded-md border border-border bg-surface-raised px-3 py-2.5 font-mono text-[12px] text-text-secondary">
          {API_URL || "not configured"}
        </code>
      </Field>

      <div className="flex items-center justify-between border-y border-border py-4">
        <div className="pr-6">
          <div className="text-[14px] text-text-primary">Diagnostics</div>
          <div className="mt-0.5 text-[12px] text-text-muted">
            Environment details for bug reports — no message content included.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(diagnostics());
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={cn(
            "h-8 shrink-0 rounded-md border px-3 text-[13px] transition-colors",
            copied
              ? "border-success/40 text-success"
              : "border-border text-text-secondary hover:border-border-active hover:text-text-primary"
          )}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="flex items-center justify-between pb-2">
        <div className="pr-6">
          <div className="text-[14px] text-text-primary">Clear local data</div>
          <div className="mt-0.5 text-[12px] text-text-muted">
            Resets cached preferences and signs you out on this device. Server data is untouched.
          </div>
        </div>
        {confirmClear ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                location.reload();
              }}
              className="h-8 rounded-md border border-danger/40 px-3 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="h-8 rounded-md border border-border px-3 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="h-8 shrink-0 rounded-md border border-danger/40 px-3 text-[13px] text-danger transition-colors hover:bg-danger/10"
          >
            Clear…
          </button>
        )}
      </div>
    </div>
  );
}
