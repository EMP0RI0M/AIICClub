import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import {
  X,
  Shield,
  Layers,
  Users,
  Settings,
  AlertTriangle,
  Sparkles,
  Link as LinkIcon,
  Copy,
  Plus,
  Trash2,
  Check,
  Github,
  Globe,
  Radio,
  Clock,
  Terminal,
} from "lucide-react-native";
import { colors } from "@/theme/tokens";
import { api } from "@/lib/api";

export type SpaceSettingsSection =
  | "profile"
  | "roles"
  | "channels"
  | "members"
  | "integrations"
  | "automations"
  | "webhooks"
  | "danger";

interface SpaceSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
  spaceDescription?: string;
  userRole?: string;
  onRenameSpace?: (name: string) => void;
  onDeleteSpace?: () => void;
}

export function SpaceSettingsModal({
  visible,
  onClose,
  spaceId,
  spaceName,
  spaceDescription,
  userRole = "member",
  onRenameSpace,
  onDeleteSpace,
}: SpaceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SpaceSettingsSection>("profile");

  // Determine permissions based on role
  const isElevated = [
    "president_admin",
    "admin",
    "president",
    "vice_president",
    "staff",
    "advisor",
  ].includes(userRole.toLowerCase().trim());

  const canDeleteSpace = ["president_admin", "admin", "president", "owner"].includes(
    userRole.toLowerCase().trim()
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSubtitle}>SPACE GOVERNANCE & SETTINGS</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {spaceName}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Horizontal Navigation Pills */}
        <View style={styles.navBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navScroll}
          >
            <NavPill
              label="Profile"
              icon={<Sparkles size={14} color={activeTab === "profile" ? colors.accentContrast : colors.textMuted} />}
              active={activeTab === "profile"}
              onPress={() => setActiveTab("profile")}
            />
            <NavPill
              label="Roles & Governance"
              icon={<Shield size={14} color={activeTab === "roles" ? colors.accentContrast : colors.textMuted} />}
              active={activeTab === "roles"}
              onPress={() => setActiveTab("roles")}
            />
            <NavPill
              label="Channels"
              icon={<Layers size={14} color={activeTab === "channels" ? colors.accentContrast : colors.textMuted} />}
              active={activeTab === "channels"}
              onPress={() => setActiveTab("channels")}
            />
            <NavPill
              label="Members"
              icon={<Users size={14} color={activeTab === "members" ? colors.accentContrast : colors.textMuted} />}
              active={activeTab === "members"}
              onPress={() => setActiveTab("members")}
            />
            <NavPill
              label="Integrations"
              icon={<Github size={14} color={activeTab === "integrations" ? colors.accentContrast : colors.textMuted} />}
              active={activeTab === "integrations"}
              onPress={() => setActiveTab("integrations")}
            />
            <NavPill
              label="Automations"
              icon={<Terminal size={14} color={activeTab === "automations" ? colors.accentContrast : colors.textMuted} />}
              active={activeTab === "automations"}
              onPress={() => setActiveTab("automations")}
            />
            <NavPill
              label="Webhooks"
              icon={<Radio size={14} color={activeTab === "webhooks" ? colors.accentContrast : colors.textMuted} />}
              active={activeTab === "webhooks"}
              onPress={() => setActiveTab("webhooks")}
            />
            {canDeleteSpace && (
              <NavPill
                label="Danger Zone"
                icon={<AlertTriangle size={14} color={activeTab === "danger" ? colors.accentContrast : colors.danger} />}
                active={activeTab === "danger"}
                isDanger
                onPress={() => setActiveTab("danger")}
              />
            )}
          </ScrollView>
        </View>

        {/* Content Body */}
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {activeTab === "profile" && (
            <ProfileSection
              spaceId={spaceId}
              initialName={spaceName}
              initialDesc={spaceDescription}
              onRenameSpace={onRenameSpace}
            />
          )}
          {activeTab === "roles" && <RolesSection spaceId={spaceId} isElevated={isElevated} />}
          {activeTab === "channels" && <ChannelsSection spaceId={spaceId} />}
          {activeTab === "members" && <MembersSection spaceId={spaceId} isElevated={isElevated} />}
          {activeTab === "integrations" && <IntegrationsSection spaceId={spaceId} />}
          {activeTab === "automations" && <AutomationsSection spaceId={spaceId} isElevated={isElevated} />}
          {activeTab === "webhooks" && <WebhooksSection spaceId={spaceId} isElevated={isElevated} />}
          {activeTab === "danger" && canDeleteSpace && (
            <DangerSection spaceName={spaceName} onDeleteSpace={onDeleteSpace} />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function NavPill({
  label,
  icon,
  active,
  isDanger,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  isDanger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.navPill,
        active && (isDanger ? styles.navPillActiveDanger : styles.navPillActive),
      ]}
    >
      {icon}
      <Text
        style={[
          styles.navPillText,
          active && (isDanger ? styles.navPillTextActiveDanger : styles.navPillTextActive),
          isDanger && !active && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* =========================================================
   1. PROFILE & INVITES SECTION
   ========================================================= */
function ProfileSection({
  spaceId,
  initialName,
  initialDesc,
  onRenameSpace,
}: {
  spaceId: string;
  initialName: string;
  initialDesc?: string;
  onRenameSpace?: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc || "");
  const [saving, setSaving] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const loadInvites = async () => {
    setLoadingInvites(true);
    try {
      const res = await api<{ invites: any[] }>(`/servers/${spaceId}/invites`);
      setInvites(res?.invites || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [spaceId]);

  const handleSaveProfile = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api(`/servers/${spaceId}/settings`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      });
      onRenameSpace?.(name.trim());
      Alert.alert("Success", "Space profile updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update space profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      const res = await api<{ invite: any }>(`/servers/${spaceId}/invites`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res?.invite) {
        setInvites((prev) => [res.invite, ...prev]);
        Alert.alert("Invite Created", `Invite code: ${res.invite.code}`);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to create invite link.");
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleShareInvite = async (code: string) => {
    const url = `https://aiic-bbs.vercel.app/join/${code}`;
    await Share.share({
      message: `Join our space on AIIC: ${url}`,
      url,
    });
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Space Profile & Identity</Text>
      <Text style={styles.sectionSubtitle}>
        Configure the public title, description, and shareable join links for this Space.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>SPACE NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="e.g. AIIC Club"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>DESCRIPTION</Text>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          style={[styles.input, { height: 70, textAlignVertical: "top" }]}
          placeholder="What is the mission of this Space?"
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </View>

      <Pressable
        onPress={handleSaveProfile}
        disabled={saving || !name.trim()}
        style={[styles.primaryBtn, (!name.trim() || saving) && styles.btnDisabled]}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.accentContrast} />
        ) : (
          <Text style={styles.primaryBtnText}>Save Profile Changes</Text>
        )}
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Invite Links</Text>
        <Pressable
          onPress={handleCreateInvite}
          disabled={creatingInvite}
          style={styles.smallOutlineBtn}
        >
          <Plus size={14} color={colors.accent} />
          <Text style={styles.smallOutlineBtnText}>Generate Invite</Text>
        </Pressable>
      </View>

      {loadingInvites ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 16 }} />
      ) : invites.length === 0 ? (
        <Text style={styles.emptyText}>No invite links created yet for this space.</Text>
      ) : (
        invites.map((inv) => (
          <View key={inv.id || inv.code} style={styles.cardItem}>
            <View style={{ flex: 1 }}>
              <View style={styles.rowAlign}>
                <Text style={styles.cardItemTitle}>code: {inv.code}</Text>
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>{inv.status || "active"}</Text>
                </View>
              </View>
              <Text style={styles.cardItemSub}>
                Uses: {inv.uses || 0} / {inv.maxUses || "Unlimited"} · Expires:{" "}
                {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : "Never"}
              </Text>
            </View>
            <Pressable
              onPress={() => handleShareInvite(inv.code)}
              style={styles.iconCircleBtn}
            >
              <Copy size={14} color={colors.accent} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

/* =========================================================
   2. ROLES & GOVERNANCE SECTION
   ========================================================= */
function RolesSection({ spaceId, isElevated }: { spaceId: string; isElevated: boolean }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ members: any[] }>(`/org/members?spaceId=${encodeURIComponent(spaceId)}`)
      .then((res) => setMembers(res?.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [spaceId]);

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Roles & Organizational Hierarchy</Text>
      <Text style={styles.sectionSubtitle}>
        Club governance matrix. Role assignments dictate administrative permissions and moderation authority.
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 20 }} />
      ) : (
        <View style={{ gap: 8 }}>
          {members.map((m) => (
            <View key={m.id || m.userId} style={styles.cardItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardItemTitle}>{m.displayName || m.username || "Member"}</Text>
                <Text style={styles.cardItemSub}>@{m.username || "user"} · ID: {m.id?.slice(0, 8)}</Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  m.role?.includes("president") || m.role?.includes("admin")
                    ? styles.roleBadgePresident
                    : m.role?.includes("staff") || m.role?.includes("lead")
                    ? styles.roleBadgeStaff
                    : styles.roleBadgeMember,
                ]}
              >
                <Text style={styles.roleBadgeText}>{(m.role || "Member").toUpperCase()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* =========================================================
   3. CHANNELS MANAGEMENT SECTION
   ========================================================= */
function ChannelsSection({ spaceId }: { spaceId: string }) {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ channels: any[] }>(`/servers/${spaceId}/channels`)
      .then((res) => setChannels(res?.channels || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [spaceId]);

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Channel Directory & Archetypes</Text>
      <Text style={styles.sectionSubtitle}>
        Overview of all 9 specialized channel types and category structures configured in this Space.
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 20 }} />
      ) : (
        <View style={{ gap: 8 }}>
          {channels.map((ch) => (
            <View key={ch.id} style={styles.cardItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardItemTitle}>#{ch.name}</Text>
                <Text style={styles.cardItemSub}>
                  Category: {ch.category || "General"} · Position: {ch.position || 0}
                </Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{(ch.type || "text").toUpperCase()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* =========================================================
   4. MEMBERS DIRECTORY SECTION
   ========================================================= */
function MembersSection({ spaceId, isElevated }: { spaceId: string; isElevated: boolean }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ members: any[] }>(`/servers/${spaceId}/members`)
      .then((res) => setMembers(res?.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [spaceId]);

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Active Members ({members.length})</Text>
      <Text style={styles.sectionSubtitle}>
        Community members registered in this Space with live membership records.
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 20 }} />
      ) : (
        <View style={{ gap: 8 }}>
          {members.map((m) => (
            <View key={m.id || m.userId} style={styles.cardItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardItemTitle}>{m.displayName || m.user?.displayName || "Member"}</Text>
                <Text style={styles.cardItemSub}>Joined: {new Date(m.joinedAt || Date.now()).toLocaleDateString()}</Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{(m.role || "Member").toUpperCase()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* =========================================================
   5. INTEGRATIONS (GITHUB & REPOSITORIES)
   ========================================================= */
function IntegrationsSection({ spaceId }: { spaceId: string }) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>External Integrations</Text>
      <Text style={styles.sectionSubtitle}>
        Connected toolchains, CI/CD pipelines, and GitHub organization repositories.
      </Text>

      <View style={styles.cardItem}>
        <View style={styles.iconBox}>
          <Github size={20} color={colors.accentTeal} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowAlign}>
            <Text style={styles.cardItemTitle}>GitHub Organization</Text>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>CONNECTED</Text>
            </View>
          </View>
          <Text style={styles.cardItemSub}>AIIC-Organization · 2 active webhook repositories</Text>
        </View>
      </View>

      <View style={styles.cardItem}>
        <View style={styles.iconBox}>
          <Radio size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowAlign}>
            <Text style={styles.cardItemTitle}>LiveKit WebRTC Audio</Text>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>READY</Text>
            </View>
          </View>
          <Text style={styles.cardItemSub}>Low-latency spatial audio engine for Voice Channels</Text>
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   6. AUTOMATIONS RULES ENGINE
   ========================================================= */
function AutomationsSection({ spaceId, isElevated }: { spaceId: string; isElevated: boolean }) {
  const rules = [
    { id: "1", trigger: "PR merged", action: "Move card to Done", condition: "column = In Progress" },
    { id: "2", trigger: "CI failed", action: "Create incident", condition: "severity = P0" },
    { id: "3", trigger: "Review requested", action: "Notify team", condition: "team = Upper Pool" },
  ];

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Space Automation Rules</Text>
      <Text style={styles.sectionSubtitle}>
        Realtime trigger engine evaluating GitHub pull requests, Kanban card shifts, and CI builds.
      </Text>

      <View style={{ gap: 8 }}>
        {rules.map((rule) => (
          <View key={rule.id} style={styles.cardItem}>
            <View style={{ flex: 1 }}>
              <View style={styles.rowAlign}>
                <Text style={styles.cardItemTitle}>IF: {rule.trigger}</Text>
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.cardItemSub}>
                THEN: {rule.action} {rule.condition ? `(${rule.condition})` : ""}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* =========================================================
   7. WEBHOOKS CONFIGURATION
   ========================================================= */
function WebhooksSection({ spaceId, isElevated }: { spaceId: string; isElevated: boolean }) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Inbound & Outbound Webhooks</Text>
      <Text style={styles.sectionSubtitle}>
        Direct HTTPS endpoints for third-party telemetry, bots, and automated deploy scripts.
      </Text>

      <View style={styles.cardItem}>
        <View style={{ flex: 1 }}>
          <View style={styles.rowAlign}>
            <Text style={styles.cardItemTitle}>GitHub Release Bot Hook</Text>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>200 OK</Text>
            </View>
          </View>
          <Text style={styles.cardItemSub}>https://aiic-bbs.vercel.app/api/webhooks/github</Text>
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   8. DANGER ZONE (PERMISSION-PROTECTED)
   ========================================================= */
function DangerSection({ spaceName, onDeleteSpace }: { spaceName: string; onDeleteSpace?: () => void }) {
  const handleDelete = () => {
    Alert.alert(
      "Delete Space?",
      `Are you sure you want to permanently delete "${spaceName}"? All channels, messages, and files will be permanently erased.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Space",
          style: "destructive",
          onPress: () => onDeleteSpace?.(),
        },
      ]
    );
  };

  return (
    <View style={[styles.sectionContainer, styles.dangerBox]}>
      <View style={styles.rowAlign}>
        <AlertTriangle size={20} color={colors.danger} />
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>Danger Zone</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Destructive operations for this Space. Only authorized Presidents and Admins can perform these actions.
      </Text>

      <Pressable onPress={handleDelete} style={styles.dangerBtn}>
        <Trash2 size={16} color="#FFFFFF" />
        <Text style={styles.dangerBtnText}>Permanently Delete Space</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0E15",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerSubtitle: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  navScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  navPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  navPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  navPillActiveDanger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  navPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  navPillTextActive: {
    color: colors.accentContrast,
    fontWeight: "700",
  },
  navPillTextActiveDanger: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 6,
    marginTop: 6,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: colors.accentContrast,
    fontSize: 14,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 12,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    backgroundColor: "rgba(232, 163, 61, 0.1)",
  },
  smallOutlineBtnText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 16,
  },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  cardItemTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  cardItemSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: "monospace",
  },
  badgeSuccess: {
    backgroundColor: "rgba(45, 212, 191, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.3)",
  },
  badgeSuccessText: {
    color: colors.accentTeal,
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  iconCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgePresident: {
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
  },
  roleBadgeStaff: {
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
  },
  roleBadgeMember: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  roleBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  typeBadgeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBox: {
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(239, 68, 68, 0.04)",
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  dangerBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
