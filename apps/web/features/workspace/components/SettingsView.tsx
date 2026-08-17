import React, { Component, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@corvus/ui";
import { X, Trash2, ShieldAlert, ExternalLink, Check } from "lucide-react";
import { Avatar, ChannelGlyph, Input } from "@/shared/components/ui";
import { ConfirmModal } from "@/shared/components/ui/Modal";
import { createInvite, fetchInvites, revokeInvite } from "@/shared/lib/api";
import { usePermissions } from "@/shared/lib/permissions";
import { AutomationsSettings, WebhooksSettings } from "./AutomationsSettings";
import { RolesGovernanceSettings, AuditHistorySettings } from "./OrganizationGovernance";
import {
  MyAccountSettings,
  ProfileSettings,
  PrivacySettings,
  NotificationsSettings,
  AppearanceSettings,
  KeybindingsSettings,
  DevicesSettings,
  AdvancedSettings,
} from "./UserSettings";
import type { ChannelSection, MemberRef } from "./types";

/**
 * Settings (brief §Settings). Two-column layout — 240px nav + content — not a
 * modal. Rendered as a full-surface overlay inside the shell.
 */
const USER_SECTIONS = [
  { group: "User Settings", items: ["My Account", "Profile", "Privacy"] },
  { group: "App Preferences", items: ["Notifications", "Appearance", "Keybindings"] },
  { group: "System", items: ["Devices", "Advanced"] },
];

interface ErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SettingsSectionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`[SETTINGS_SECTION_ERROR] ${this.props.sectionName}:`, error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.sectionName !== this.props.sectionName && this.state.hasError) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-danger/30 bg-danger/[0.04] p-6 text-center backdrop-blur-md">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/30 mb-3">
            <ShieldAlert size={20} />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Unable to load {this.props.sectionName}</h3>
          <p className="mt-1 text-xs text-text-muted">
            {this.state.error?.message || "An unexpected error occurred while rendering this section."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-4 rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-1.5 font-mono text-xs font-semibold text-text-primary hover:bg-white/[0.1] transition-all"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function SettingsView({
  spaceId,
  spaceName,
  sections,
  members,
  mode = "all",
  initialSection,
  onClose,
  onRenameSpace,
  onDeleteSpace,
  onDeleteChannel,
  onAddChannel,
  onRemoveMember,
}: {
  spaceId?: string;
  spaceName?: string;
  /** The active space's sections — powers the Channels overview. */
  sections?: ChannelSection[];
  members?: MemberRef[];
  /** Control whether opening User Settings, Space Settings, or All */
  mode?: "user" | "space" | "all";
  initialSection?: string;
  onClose?: () => void;
  onRenameSpace?: (name: string) => void;
  onDeleteSpace?: () => void;
  onDeleteChannel?: (channelId: string) => void;
  /** Open the add-channel dialog for a section. */
  onAddChannel?: (sectionId: string) => void;
  onRemoveMember?: (memberId: string) => void;
}) {
  const { can, role: myRole } = usePermissions(spaceId);

  // Compute allowed space settings items according to granular permissions (memoized)
  const allowedSpaceItems = useMemo(() => {
    const r = (myRole || "").toLowerCase().trim();
    if (["president_admin", "admin", "president"].includes(r)) {
      return [
        "Space profile",
        "Roles & Governance",
        "Audit Logs",
        "Channels",
        "Members",
        "Integrations",
        "Automations",
        "Webhooks",
        "Danger zone",
      ];
    }
    return [
      (can("SPACE_MANAGE_SETTINGS") || can("INVITE_MANAGE") || can("INVITE_CREATE")) ? "Space profile" : null,
      (can("ORG_MANAGE_ROLES") || can("ORG_MANAGE_LEADERSHIP") || can("ORG_MANAGE_TEAMS")) ? "Roles & Governance" : null,
      can("SPACE_VIEW_AUDIT_LOGS") ? "Audit Logs" : null,
      (can("CHANNEL_CREATE_TEXT") || can("CHANNEL_EDIT") || can("CHANNEL_DELETE")) ? "Channels" : null,
      (can("MEMBER_KICK") || can("MEMBER_BAN") || can("NICKNAME_MANAGE")) ? "Members" : null,
      can("SPACE_MANAGE_MODULES") ? "Integrations" : null,
      can("AUTOMATIONS_MANAGE_RULES") ? "Automations" : null,
      can("AUTOMATIONS_MANAGE_WEBHOOKS") ? "Webhooks" : null,
      can("SPACE_OWNER_DELETE") ? "Danger zone" : null,
    ].filter(Boolean) as string[];
  }, [can, myRole]);

  const dynamicSpaceSections = useMemo(() => {
    return allowedSpaceItems.length > 0 ? [{ group: "Space Settings", items: allowedSpaceItems }] : [];
  }, [allowedSpaceItems]);

  const effectiveSections = useMemo(() => {
    if (mode === "user") return USER_SECTIONS;
    if (mode === "space" && spaceId) return dynamicSpaceSections;
    if (spaceId) return [...USER_SECTIONS, ...dynamicSpaceSections];
    return USER_SECTIONS;
  }, [mode, spaceId, dynamicSpaceSections]);

  const allAvailableItems = useMemo(() => {
    return effectiveSections.flatMap((s) => s.items);
  }, [effectiveSections]);

  const defaultSection = useMemo(() => {
    if (initialSection && allAvailableItems.includes(initialSection)) return initialSection;
    if (mode === "space") return allowedSpaceItems[0] || "My Account";
    return "My Account";
  }, [initialSection, allAvailableItems, mode, allowedSpaceItems]);

  const [active, setActive] = useState<string>(() => {
    return initialSection || (mode === "space" ? "Space profile" : "My Account");
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync initialSection only when initialSection prop changes externally
  const prevInitialSectionRef = useRef(initialSection);
  useEffect(() => {
    if (initialSection && initialSection !== prevInitialSectionRef.current) {
      prevInitialSectionRef.current = initialSection;
      if (allAvailableItems.includes(initialSection)) {
        setActive(initialSection);
      }
    }
  }, [initialSection, allAvailableItems]);



  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="fixed inset-0 z-50 flex w-full max-w-[100dvw] overflow-hidden bg-background"
    >
      {/* Mobile Header Bar (< md) */}
      <div className="absolute left-0 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface-raised px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-text-primary"
        >
          <span className="font-mono text-[11px] text-text-muted">Section:</span>
          <span className="truncate max-w-[140px]">{active}</span>
          <span className="text-[10px] text-text-muted">▼</span>
        </button>

        <button
          type="button"
          aria-label="Close settings"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-muted hover:bg-hover-row hover:text-text-primary"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav (Sidebar on >= md, Drawer/Dropdown on < md) */}
      <nav
        className={cn(
          "flex flex-col overflow-y-auto border-r border-border bg-surface-raised py-4 transition-all",
          "hidden md:flex md:w-[220px] lg:w-[240px] md:shrink-0",
          mobileMenuOpen &&
            "absolute inset-x-0 bottom-0 top-14 z-30 flex w-full bg-surface-raised/95 backdrop-blur-md px-2 md:relative md:top-0 md:bg-surface-raised"
        )}
      >
        {effectiveSections.map((section) => (
          <div key={section.group} className="mb-2">
            <p className="px-4 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
              {section.group}
            </p>
            {section.items.map((item) => (
              <button
                key={item}
                type="button"
                data-active={item === active}
                onClick={() => {
                  setActive(item);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "mx-2 flex h-9 items-center rounded-md px-3 text-left text-[14px] transition-colors",
                  item === active
                    ? "bg-surface-overlay font-medium text-text-primary"
                    : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Content */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-14 md:pt-0">
        <button
          type="button"
          aria-label="Close settings"
          onClick={onClose}
          className="absolute right-4 top-4 hidden h-8 w-8 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary md:flex"
        >
          <X size={18} />
        </button>

        <div className="w-full max-w-[640px] px-4 py-6 sm:px-8 md:mx-auto md:px-10 md:py-8">
          {mode === "space" && allowedSpaceItems.length === 0 ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-8 text-center backdrop-blur-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 mb-4">
                <ShieldAlert size={24} />
              </div>
              <h2 className="text-lg font-bold text-text-primary">Access Restricted</h2>
              <p className="mt-2 text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                You do not have administrative permissions (Staff, Teacher, VP, President, or Admin) to manage space settings.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-xl bg-white/[0.06] border border-white/[0.1] px-5 py-2 font-mono text-xs font-bold text-text-primary hover:bg-white/[0.1] transition-all"
              >
                Close Settings
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold text-text-primary sm:text-[24px]">{active}</h1>
              <div className="mt-4 h-px w-full bg-border" />

              <SettingsSectionErrorBoundary sectionName={active}>
                {active === "Space profile" ? (
                  <SpaceProfileSettings spaceId={spaceId} spaceName={spaceName} onRename={onRenameSpace} />
                ) : active === "Roles & Governance" ? (
                  <RolesGovernanceSettings spaceId={spaceId ?? "default"} />
                ) : active === "Audit Logs" ? (
                  <AuditHistorySettings spaceId={spaceId ?? "default"} />
                ) : active === "Channels" ? (
                  <ChannelsSettings
                    sections={sections ?? []}
                    onDeleteChannel={onDeleteChannel}
                    onAddChannel={onAddChannel}
                  />
                ) : active === "Members" ? (
                  <MembersSettings members={members ?? []} onRemove={onRemoveMember} />
                ) : active === "Danger zone" ? (
                  <DangerZoneSettings spaceName={spaceName} onDeleteSpace={onDeleteSpace} />
                ) : active === "Automations" ? (
                  <AutomationsSettings spaceId={spaceId} />
                ) : active === "Webhooks" ? (
                  <WebhooksSettings spaceId={spaceId} />
                ) : active === "Integrations" ? (
                  <IntegrationsSettings spaceId={spaceId} />
                ) : active === "My Account" ? (
                  <MyAccountSettings />
                ) : active === "Profile" ? (
                  <ProfileSettings />
                ) : active === "Privacy" ? (
                  <PrivacySettings />
                ) : active === "Notifications" ? (
                  <NotificationsSettings />
                ) : active === "Appearance" ? (
                  <AppearanceSettings />
                ) : active === "Keybindings" ? (
                  <KeybindingsSettings />
                ) : active === "Devices" ? (
                  <DevicesSettings />
                ) : (
                  <AdvancedSettings />
                )}
              </SettingsSectionErrorBoundary>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

/** Space profile & Full Invite Link Management with Database Persistence */
function SpaceProfileSettings({
  spaceId,
  spaceName,
  onRename,
}: {
  spaceId?: string;
  spaceName?: string;
  onRename?: (name: string) => void;
}) {
  const { can } = usePermissions(spaceId);
  const [name, setName] = useState(spaceName ?? "Space");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);


  // Invites State
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New Invite Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newMaxUses, setNewMaxUses] = useState<string>("unlimited");
  const [newExpiresIn, setNewExpiresIn] = useState<string>("never");

  const origin = typeof window !== "undefined" ? window.location.origin : "https://aiic-bbs.vercel.app";

  const loadInvites = async () => {
    if (!spaceId) return;
    setLoadingInvites(true);
    try {
      const data = await fetchInvites(spaceId);
      setInvites(data.invites || []);
    } catch (err: any) {
      console.error("[LOAD_INVITES_ERROR]", err);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (spaceId) {
      void loadInvites();
    }
  }, [spaceId]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId) return;
    setCreating(true);
    setError(null);

    const maxUsesVal = newMaxUses === "unlimited" ? undefined : parseInt(newMaxUses, 10);
    const expiresVal = newExpiresIn === "never" ? undefined : parseInt(newExpiresIn, 10);

    try {
      await createInvite(spaceId, {
        label: newLabel.trim() || undefined,
        code: newCode.trim() || undefined,
        maxUses: maxUsesVal,
        expiresInHours: expiresVal,
      });

      setNewLabel("");
      setNewCode("");
      setNewMaxUses("unlimited");
      setNewExpiresIn("never");
      setShowCreateForm(false);
      await loadInvites();
    } catch (err: any) {
      console.error("[CREATE_INVITE_ERROR]", err);
      const msg = err?.message || "Failed to create invite";
      setError(msg.includes("403") || msg.toLowerCase().includes("permission")
        ? "You do not have permission to manage invites in this space."
        : msg.includes("409") || msg.toLowerCase().includes("already in use")
        ? "That invite code is already in use. Please choose another."
        : msg);
    } finally {
      setCreating(false);
    }
  };

  const handleQuickGenerate = async () => {
    if (!spaceId) return;
    setCreating(true);
    try {
      await createInvite(spaceId, {});
      await loadInvites();
    } catch (err: any) {
      setError(err?.message || "Failed to generate invite");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (code: string) => {
    try {
      await revokeInvite(code);
      await loadInvites();
    } catch (err: any) {
      console.error("[REVOKE_INVITE_ERROR]", err);
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    void navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };


  return (
    <div className="mt-6 flex flex-col gap-8">
      {/* Space Name Field */}
      {can("SPACE_MANAGE_SETTINGS") ? (
        <Field label="Space name" hint="Shown in the rail and at the top of the space sidebar.">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(e.target.value.trim() !== (spaceName ?? "Space") && e.target.value.trim().length > 0);
              }}
            />
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                onRename?.(name.trim());
                setSaved(true);
                setDirty(false);
                setTimeout(() => setSaved(false), 1500);
              }}
              className={cn(
                "h-9 shrink-0 rounded-xl px-4 font-mono text-xs font-semibold transition-all",
                dirty
                  ? "bg-accent text-on-accent hover:opacity-90 active:scale-95"
                  : "border border-white/[0.08] bg-white/[0.04] text-text-muted cursor-not-allowed"
              )}
            >
              {saved ? "Saved" : "Save Name"}
            </button>
          </div>
        </Field>
      ) : (
        <Field label="Space name" hint="Space name (read-only for unprivileged roles)">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 text-xs font-semibold text-text-primary">
            {spaceName ?? "Space"}
          </div>
        </Field>
      )}

      {/* ─── Full Invite Links Management ─── */}
      {(can("INVITE_MANAGE") || can("INVITE_CREATE")) && (
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div>
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                Space Invite Links
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Create, customize, and manage canonical invite URLs with expiration and usage limits.
              </p>
            </div>
            {can("INVITE_CREATE") && (
              <button
                type="button"
                onClick={() => setShowCreateForm((v) => !v)}
                className="flex h-8 items-center gap-1.5 rounded-xl bg-accent px-3 font-mono text-xs font-semibold text-on-accent hover:scale-105 active:scale-95 transition-all"
              >
                {showCreateForm ? "Cancel" : "+ Create Invite"}
              </button>
            )}
          </div>


        {error && (
          <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 font-mono text-xs text-danger">
            {error}
          </div>
        )}

        {/* Create / Customize Invite Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateInvite} className="mt-4 rounded-2xl border border-white/[0.1] bg-[#121622]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text-primary">
              Custom Invite Configuration
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Invite Label / Name (Optional)
                </label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. AIIC General Invite, Hackathon 2026"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Custom Code / Slug (Optional)
                </label>
                <div className="flex items-center gap-1">
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    placeholder="e.g. aiic2026, dev-team"
                  />
                </div>
                <p className="font-mono text-[10px] text-text-muted mt-1 truncate">
                  Preview: {origin}/join/{newCode || "random_code"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Expiration
                </label>
                <select
                  value={newExpiresIn}
                  onChange={(e) => setNewExpiresIn(e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 font-mono text-xs text-text-primary outline-none focus:border-accent"
                >
                  <option value="never">Never expires</option>
                  <option value="1">1 Hour</option>
                  <option value="24">1 Day (24 hours)</option>
                  <option value="168">7 Days</option>
                  <option value="720">30 Days</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold text-text-muted uppercase mb-1">
                  Maximum Uses
                </label>
                <select
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 font-mono text-xs text-text-primary outline-none focus:border-accent"
                >
                  <option value="unlimited">Unlimited uses</option>
                  <option value="1">1 use</option>
                  <option value="5">5 uses</option>
                  <option value="10">10 uses</option>
                  <option value="25">25 uses</option>
                  <option value="50">50 uses</option>
                  <option value="100">100 uses</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 font-mono text-xs text-text-muted hover:bg-white/[0.08] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="h-9 rounded-xl bg-accent px-5 font-mono text-xs font-semibold text-on-accent hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Invite Link"}
              </button>
            </div>
          </form>
        )}

        {/* Existing Invites List */}
        <div className="mt-4 space-y-3">
          {invites.length === 0 && !loadingInvites ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <p className="font-mono text-xs text-text-muted">No invite links created yet for this space.</p>
              <button
                type="button"
                onClick={handleQuickGenerate}
                disabled={creating}
                className="mt-3 inline-flex h-8 items-center rounded-xl bg-accent/20 border border-accent/40 px-3.5 font-mono text-xs font-bold text-accent hover:bg-accent/30 active:scale-95 transition-all"
              >
                + Generate First Invite Link
              </button>
            </div>
          ) : (
            invites.map((inv) => {
              const fullUrl = `${origin}/join/${inv.code}`;
              const isCopied = copiedId === inv.id;
              const isRevoked = inv.status === "revoked";
              const isExpired = inv.status === "expired";

              return (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-[#121622]/70 p-3.5 backdrop-blur-md transition-all hover:border-accent/40"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13.5px] text-text-primary">
                        {inv.label || `Invite ${inv.code}`}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider",
                          isRevoked
                            ? "bg-danger/20 text-danger border border-danger/30"
                            : isExpired
                            ? "bg-warning/20 text-warning border border-warning/30"
                            : "bg-success/20 text-success border border-success/30"
                        )}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <code className="block truncate font-mono text-[11px] text-accent">
                      {fullUrl}
                    </code>

                    <div className="flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-text-muted">
                      <span>
                        Uses: {inv.uses} / {inv.maxUses ? inv.maxUses : "Unlimited"}
                      </span>
                      <span>•</span>
                      <span>
                        Expires: {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : "Never"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      disabled={isRevoked}
                      onClick={() => copyToClipboard(fullUrl, inv.id)}
                      className={cn(
                        "h-8 rounded-xl px-3 font-mono text-xs font-semibold transition-all active:scale-95",
                        isCopied
                          ? "bg-success text-white"
                          : "border border-white/[0.08] bg-white/[0.04] text-text-primary hover:bg-white/[0.08]"
                      )}
                    >
                      {isCopied ? "Copied!" : "Copy Link"}
                    </button>
                    {!isRevoked && can("INVITE_MANAGE") && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.code)}
                        className="h-8 rounded-xl border border-danger/30 bg-danger/10 px-3 font-mono text-xs text-danger hover:bg-danger/20 active:scale-95 transition-all"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}
    </div>
  );
}



/** Channels overview — every section and channel, with add and delete. */
function ChannelsSettings({
  sections,
  onDeleteChannel,
  onAddChannel,
}: {
  sections: ChannelSection[];
  onDeleteChannel?: (channelId: string) => void;
  onAddChannel?: (sectionId: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  return (
    <div className="mt-6 flex flex-col gap-6">
      <ConfirmModal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDeleteChannel?.(pendingDelete.id);
          setPendingDelete(null);
        }}
        title={`Delete #${pendingDelete?.name ?? "channel"}?`}
        body="All messages and channel data will be permanently deleted."
        confirmLabel="Delete channel"
        destructive
      />
      {sections.map((section) => (
        <div key={section.id}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
              {section.name} — {section.channels.length}
            </p>
            {onAddChannel && (
              <button
                type="button"
                onClick={() => onAddChannel(section.id)}
                className="h-6 rounded-sm px-2 text-[12px] text-text-secondary transition-colors hover:bg-hover-row hover:text-text-primary"
              >
                + Add channel
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-col">
            {section.channels.map((ch) => (
              <div
                key={ch.id}
                className="group flex h-10 items-center gap-2.5 border-b border-border px-1 transition-colors last:border-b-0 hover:bg-hover-row"
              >
                <ChannelGlyph type={ch.type} size={14} />
                <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{ch.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-faint">
                  {ch.type}
                </span>
                {onDeleteChannel && (
                  <button
                    type="button"
                    aria-label={`Delete ${ch.name}`}
                    onClick={() => setPendingDelete({ id: ch.id, name: ch.name })}
                    className="hidden h-7 w-7 items-center justify-center rounded-sm text-danger transition-colors hover:bg-danger/10 group-hover:flex group-focus-within:flex focus:flex"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {sections.length === 0 && (
        <p className="text-[13px] text-text-muted">Open a space to manage its channels.</p>
      )}
    </div>
  );
}

/** Danger zone — destructive space actions, kept behind an explicit confirm. */
function DangerZoneSettings({
  spaceName,
  onDeleteSpace,
}: {
  spaceName?: string;
  onDeleteSpace?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-6">
      <div className="rounded-[10px] border border-danger/30 p-4">
        <p className="text-[14px] font-medium text-text-primary">Delete this space</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
          Removes {spaceName ?? "this space"} and all of its channels from your workspace. This
          cannot be undone.
        </p>
        {confirming ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onDeleteSpace}
              className="h-8 rounded-md bg-danger px-3 text-[13px] font-medium text-white transition-colors hover:bg-danger/85"
            >
              Yes, delete {spaceName ?? "space"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-8 rounded-md border border-border px-3 text-[13px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-3 h-8 rounded-md border border-danger/40 px-3 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
          >
            Delete space
          </button>
        )}
      </div>
    </div>
  );
}

/** Space members — roles as quiet mono chips, actions on hover. */
function MembersSettings({
  members,
  onRemove,
}: {
  members: MemberRef[];
  onRemove?: (memberId: string) => void;
}) {
  const [pendingRemove, setPendingRemove] = useState<MemberRef | null>(null);
  return (
    <div className="mt-6">
      <ConfirmModal
        open={Boolean(pendingRemove)}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) onRemove?.(pendingRemove.id);
          setPendingRemove(null);
        }}
        title={`Remove ${pendingRemove?.name ?? "member"}?`}
        body="They will lose access to this space until invited again."
        confirmLabel="Remove member"
        destructive
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
        Members — {members.length}
      </p>
      <div className="mt-2 flex flex-col">
        {members.map((m) => (
          <div
            key={m.id}
            className="group flex h-12 items-center gap-3 border-b border-border px-1 transition-colors hover:bg-hover-row"
          >
            <Avatar src={m.avatar} name={m.name} size={28} radius={6} />
            <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{m.name}</span>
            <span
              className="rounded-[3px] border border-border px-[5px] py-px font-mono text-[10px] uppercase tracking-[0.06em]"
              style={{ color: m.roleColor ?? "var(--text-secondary)" }}
            >
              {m.roleColor ? "core" : "member"}
            </span>
            <button
              type="button"
              onClick={() => setPendingRemove(m)}
              className="hidden h-7 rounded-sm px-2 text-[12px] text-danger transition-colors hover:bg-danger/10 group-hover:block group-focus-within:block focus:block"
            >
              Remove
            </button>
          </div>
        ))}
        {members.length === 0 && (
          <p className="py-6 text-[13px] text-text-muted">
            Members appear here once the space has activity.
          </p>
        )}
      </div>
    </div>
  );
}

/** Space integrations — First-Class GitHub Integration & Repositories Matrix. */
function IntegrationsSettings({ spaceId = "default" }: { spaceId?: string }) {
  const [connected, setConnected] = useState(true);
  const [repos, setRepos] = useState([
    { name: "AIIC-Organization/aiic-platform", prs: true, ci: true, reviews: true, isPrimary: true },
    { name: "AIIC-Organization/aiic-web", prs: true, ci: true, reviews: true, isPrimary: false },
  ]);

  return (
    <div className="mt-6 space-y-6">
      {/* GitHub First-Class Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#121622] p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 border border-accent/25 text-accent">
              <ChannelGlyph type="github" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-text-primary">GitHub Integration</h3>
                <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Connected
                </span>
              </div>
              <p className="font-mono text-xs text-text-muted mt-0.5">
                {repos.length} repositories connected · 1 active installation (AIIC-Organization)
              </p>
            </div>
          </div>

          <Link
            href="/admin/github"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono font-semibold text-text-primary transition-all"
          >
            <span>Manage GitHub</span>
            <ExternalLink size={12} className="text-accent" />
          </Link>
        </div>

        {/* Repositories List */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
            Connected Repositories Routing to this Space
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {repos.map((r, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-text-primary truncate">
                    {r.name}
                  </span>
                  {r.isPrimary && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Primary
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 font-mono text-[10px] text-text-secondary">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check size={11} /> PRs
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check size={11} /> CI Builds
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check size={11} /> Reviews
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low-Level Webhook Notice */}
      <div className="rounded-xl border border-border bg-surface-raised/40 p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-text-primary block">Custom Webhooks &amp; Payload Routing</span>
          <p className="text-[11px] text-text-muted mt-0.5">
            Configure raw inbound endpoint URLs and JSON interpolation templates in Space Settings → Webhooks.
          </p>
        </div>
      </div>
    </div>
  );
}


function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-text-muted">{hint}</p>}
    </div>
  );
}
