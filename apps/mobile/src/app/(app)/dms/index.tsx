import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../../../theme/tokens";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { useWorkspaceStore } from "../../../stores/workspace-store";
import { useAuthStore } from "../../../stores/auth-store";
import { DMSummary, FriendEntry } from "../../../lib/types";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  searchUsers,
} from "../../../lib/api";
import {
  Plus,
  Search,
  MessageSquare,
  Users,
  Check,
  X,
  Phone,
  UserPlus,
  Circle,
  Sparkles,
} from "lucide-react-native";

export default function DMsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    dms,
    friends,
    incomingRequests,
    outgoingRequests,
    loadDMs,
    loadFriends,
    createDMAction,
    isLoadingDMs,
    isLoadingFriends,
  } = useWorkspaceStore();

  const [topTab, setTopTab] = useState<"messages" | "friends">("messages");
  const [friendSubTab, setFriendSubTab] = useState<"online" | "all" | "pending" | "add">("online");
  const [search, setSearch] = useState("");

  // Add friend search states
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addSearchResults, setAddSearchResults] = useState<any[]>([]);
  const [isSearchingAdd, setIsSearchingAdd] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadDMs(user?.id);
    loadFriends();
  }, [user?.id]);

  const filteredDMs = dms.filter((d: DMSummary) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const acceptedFriends = friends;
  const onlineFriends = friends.filter((f) => f.presence !== "offline");

  const visibleFriends =
    friendSubTab === "online"
      ? onlineFriends
      : acceptedFriends;

  const handleSearchUsersToAdd = async (q: string) => {
    setAddSearchQuery(q);
    if (!q.trim()) {
      setAddSearchResults([]);
      return;
    }
    setIsSearchingAdd(true);
    try {
      const res = await searchUsers(q.trim());
      setAddSearchResults(res?.users || []);
    } catch {
      setAddSearchResults([]);
    } finally {
      setIsSearchingAdd(false);
    }
  };

  const handleSendFriendRequest = async (username: string) => {
    setActionLoadingId(username);
    try {
      const res = await sendFriendRequest(username);
      Alert.alert("Request Sent", res.message || `Friend request sent to @${username}`);
      await loadFriends();
      handleSearchUsersToAdd(addSearchQuery);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not send friend request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (reqId: string) => {
    setActionLoadingId(reqId);
    try {
      await acceptFriendRequest(reqId);
      await loadFriends();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to accept request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    setActionLoadingId(reqId);
    try {
      await declineFriendRequest(reqId);
      await loadFriends();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to decline request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartDMWithFriend = async (friendId: string) => {
    try {
      const res = await createDMAction([friendId]);
      if (res?.conversation?.id) {
        router.push(`/(app)/dms/${res.conversation.id}`);
      }
    } catch (err) {
      console.warn("Failed to create DM:", err);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Ambient Color Glows for Liquid Refraction */}
      <View style={styles.ambientGlowAmber} pointerEvents="none" />
      <View style={styles.ambientGlowPurple} pointerEvents="none" />

      {/* Top Header Capsule */}
      <View style={styles.headerCapsuleWrap}>
        <BlurView intensity={30} tint="dark" style={styles.headerCapsule}>
          <LinearGradient
            colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.headerLeft}>
            <View style={styles.headerIconOrb}>
              <MessageSquare size={16} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.title}>Direct Messages</Text>
              <Text style={styles.subtitle}>AIIC ENCRYPTED COMM</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => {
              setTopTab("friends");
              setFriendSubTab("add");
            }}
          >
            <UserPlus size={16} color={colors.accent} />
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Main Mode Switcher: Messages vs Squad & Friends */}
      <View style={styles.mainTabRowWrap}>
        <BlurView intensity={24} tint="dark" style={styles.mainTabRow}>
          <TouchableOpacity
            style={[styles.mainTabPill, topTab === "messages" && styles.mainTabPillActive]}
            onPress={() => setTopTab("messages")}
          >
            {topTab === "messages" && (
              <LinearGradient
                colors={["rgba(212, 160, 23, 0.25)", "rgba(212, 160, 23, 0.08)"]}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <Text
              style={[
                styles.mainTabPillText,
                topTab === "messages" && styles.mainTabPillTextActive,
              ]}
            >
              Messages ({dms.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabPill, topTab === "friends" && styles.mainTabPillActive]}
            onPress={() => setTopTab("friends")}
          >
            {topTab === "friends" && (
              <LinearGradient
                colors={["rgba(212, 160, 23, 0.25)", "rgba(212, 160, 23, 0.08)"]}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <Text
              style={[
                styles.mainTabPillText,
                topTab === "friends" && styles.mainTabPillTextActive,
              ]}
            >
              Squad & Friends ({friends.length})
            </Text>
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* MESSAGES TAB CONTENT */}
      {topTab === "messages" && (
        <View style={{ flex: 1 }}>
          {/* Curved Liquid Glass Search bar */}
          <View style={styles.searchBarWrap}>
            <BlurView intensity={25} tint="dark" style={styles.searchBar}>
              <LinearGradient
                colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
                style={StyleSheet.absoluteFillObject}
              />
              <Search size={15} color={colors.accent} />
              <TextInput
                placeholder="Search direct messages..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch("")} hitSlop={6}>
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </BlurView>
          </View>

          {isLoadingDMs && dms.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredDMs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.dmRowWrap}
                  onPress={() => router.push(`/(app)/dms/${item.id}`)}
                >
                  <BlurView intensity={25} tint="dark" style={styles.dmRow}>
                    <LinearGradient
                      colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                    <Avatar name={item.name} presence={item.presence} size={44} />
                    <View style={styles.dmInfo}>
                      <View style={styles.dmTop}>
                        <Text style={styles.dmName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.lastLabel ? (
                          <Text style={styles.dmTime}>{item.lastLabel}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.dmSnippet} numberOfLines={1}>
                        {item.snippet || "Start a conversation"}
                      </Text>
                    </View>
                    {item.unreadCount ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                      </View>
                    ) : null}
                  </BlurView>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconOrb}>
                    <MessageSquare size={28} color={colors.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>No Direct Messages</Text>
                  <Text style={styles.emptySubtitle}>
                    Connect and start a liquid glass conversation with your team.
                  </Text>
                  <Button
                    title="Find Friends"
                    size="sm"
                    onPress={() => {
                      setTopTab("friends");
                      setFriendSubTab("add");
                    }}
                    style={{ marginTop: 14, borderRadius: 20 }}
                  />
                </View>
              }
            />
          )}
        </View>
      )}

      {/* SQUAD & FRIENDS TAB CONTENT */}
      {topTab === "friends" && (
        <View style={{ flex: 1 }}>
          {/* Sub-tabs: Online / All / Pending / Add Friend */}
          <View style={styles.subTabRow}>
            {(
              [
                { id: "online", label: `Online (${onlineFriends.length})` },
                { id: "all", label: `All (${acceptedFriends.length})` },
                {
                  id: "pending",
                  label: `Pending (${incomingRequests.length + outgoingRequests.length})`,
                },
                { id: "add", label: "Add Friend" },
              ] as const
            ).map((st) => (
              <TouchableOpacity
                key={st.id}
                style={[
                  styles.subTabBtn,
                  friendSubTab === st.id && styles.subTabBtnActive,
                ]}
                onPress={() => setFriendSubTab(st.id)}
              >
                <Text
                  style={[
                    styles.subTabText,
                    friendSubTab === st.id && styles.subTabTextActive,
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ONLINE & ALL FRIENDS LIST */}
          {(friendSubTab === "online" || friendSubTab === "all") && (
            <FlatList
              data={visibleFriends}
              keyExtractor={(f) => f.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.dmRowWrap}>
                  <BlurView intensity={25} tint="dark" style={styles.dmRow}>
                    <LinearGradient
                      colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Avatar name={item.name} presence={item.presence} size={42} />
                    <View style={styles.dmInfo}>
                      <Text style={styles.dmName}>{item.name}</Text>
                      <Text style={styles.dmSnippet}>@{item.username}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionCircleBtn}
                      onPress={() => handleStartDMWithFriend(item.id)}
                    >
                      <MessageSquare size={16} color={colors.accent} />
                    </TouchableOpacity>
                  </BlurView>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Users size={32} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {friendSubTab === "online"
                      ? "No Friends Online"
                      : "No Friends Added Yet"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    Search for squad members to add to your network.
                  </Text>
                </View>
              }
            />
          )}

          {/* PENDING REQUESTS */}
          {friendSubTab === "pending" && (
            <FlatList
              data={[
                ...incomingRequests.map((r) => ({ ...r, type: "incoming" })),
                ...outgoingRequests.map((r) => ({ ...r, type: "outgoing" })),
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.dmRowWrap}>
                  <BlurView intensity={25} tint="dark" style={styles.dmRow}>
                    <LinearGradient
                      colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Avatar
                      name={
                        item.type === "incoming"
                          ? item.sender?.name || "User"
                          : item.receiver?.name || "User"
                      }
                      size={42}
                    />
                    <View style={styles.dmInfo}>
                      <Text style={styles.dmName}>
                        {item.type === "incoming"
                          ? item.sender?.name || "User"
                          : item.receiver?.name || "User"}
                      </Text>
                      <Text style={styles.dmSnippet}>
                        {item.type === "incoming"
                          ? "Incoming Friend Request"
                          : "Outgoing Friend Request"}
                      </Text>
                    </View>

                    {item.type === "incoming" && (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.actionCircleBtn, { backgroundColor: "rgba(45, 212, 191, 0.15)", borderColor: "rgba(45, 212, 191, 0.3)" }]}
                          onPress={() => handleAcceptRequest(item.id)}
                          disabled={actionLoadingId === item.id}
                        >
                          <Check size={16} color={colors.accentTeal} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionCircleBtn, { backgroundColor: "rgba(255, 77, 79, 0.15)", borderColor: "rgba(255, 77, 79, 0.3)" }]}
                          onPress={() => handleDeclineRequest(item.id)}
                          disabled={actionLoadingId === item.id}
                        >
                          <X size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </BlurView>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Check size={32} color={colors.accentTeal} />
                  <Text style={styles.emptyTitle}>All Caught Up</Text>
                  <Text style={styles.emptySubtitle}>
                    You have no pending friend requests.
                  </Text>
                </View>
              }
            />
          )}

          {/* ADD FRIEND SEARCH */}
          {friendSubTab === "add" && (
            <View style={{ flex: 1, padding: 14 }}>
              <View style={styles.searchBarWrap}>
                <BlurView intensity={25} tint="dark" style={styles.searchBar}>
                  <Search size={15} color={colors.accent} />
                  <TextInput
                    placeholder="Search by username or display name..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    style={styles.searchInput}
                    value={addSearchQuery}
                    onChangeText={handleSearchUsersToAdd}
                    autoCapitalize="none"
                  />
                  {isSearchingAdd && (
                    <ActivityIndicator size="small" color={colors.accent} />
                  )}
                </BlurView>
              </View>

              <FlatList
                data={addSearchResults}
                keyExtractor={(u) => u.id}
                contentContainerStyle={{ paddingTop: 10, gap: 8 }}
                renderItem={({ item }) => (
                  <View style={styles.dmRowWrap}>
                    <BlurView intensity={25} tint="dark" style={styles.dmRow}>
                      <LinearGradient
                        colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Avatar name={item.displayName} size={42} />
                      <View style={styles.dmInfo}>
                        <Text style={styles.dmName}>{item.displayName}</Text>
                        <Text style={styles.dmSnippet}>@{item.username}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.sendRequestBtn}
                        onPress={() => handleSendFriendRequest(item.username)}
                        disabled={actionLoadingId === item.username}
                      >
                        {actionLoadingId === item.username ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <>
                            <UserPlus size={14} color="#000" />
                            <Text style={styles.sendRequestBtnText}>Add</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </BlurView>
                  </View>
                )}
                ListEmptyComponent={
                  addSearchQuery.trim().length > 0 && !isSearchingAdd ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No Members Found</Text>
                      <Text style={styles.emptySubtitle}>
                        Try searching with a different username.
                      </Text>
                    </View>
                  ) : null
                }
              />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07090E",
  },
  ambientGlowAmber: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(212, 160, 23, 0.05)",
    top: 40,
    left: -100,
  },
  ambientGlowPurple: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(168, 85, 247, 0.035)",
    bottom: 100,
    right: -80,
  },
  headerCapsuleWrap: {
    marginHorizontal: 14,
    marginTop: 6,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  headerCapsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 22,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(212, 160, 23, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.25)",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.accent,
    fontSize: 8.5,
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  newBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(212, 160, 23, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainTabRowWrap: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  mainTabRow: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  mainTabPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    overflow: "hidden",
  },
  mainTabPillActive: {
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.35)",
  },
  mainTabPillText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12.5,
    fontWeight: "600",
  },
  mainTabPillTextActive: {
    color: colors.accent,
    fontWeight: "800",
  },
  searchBarWrap: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#FFFFFF",
  },
  list: {
    padding: 14,
    gap: 8,
  },
  dmRowWrap: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  dmRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  dmInfo: {
    flex: 1,
    minWidth: 0,
  },
  dmTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  dmName: {
    color: colors.textPrimary,
    fontSize: 14.5,
    fontWeight: "700",
  },
  dmTime: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 10,
    fontFamily: "monospace",
  },
  dmSnippet: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 12.5,
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unreadText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  subTabRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 6,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  subTabBtnActive: {
    backgroundColor: "rgba(212, 160, 23, 0.18)",
    borderColor: colors.accent,
  },
  subTabText: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
  },
  subTabTextActive: {
    color: colors.accent,
    fontWeight: "800",
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(212, 160, 23, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  sendRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  sendRequestBtnText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(212, 160, 23, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
  },
});
