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
      {/* Top Header Capsule */}
      <View style={styles.headerCapsule}>
        <View style={styles.headerLeft}>
          <MessageSquare size={18} color={colors.accent} />
          <Text style={styles.title}>Direct Messages</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => {
            setTopTab("friends");
            setFriendSubTab("add");
          }}
        >
          <UserPlus size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main Mode Switcher: Messages vs Squad & Friends */}
      <View style={styles.mainTabRow}>
        <TouchableOpacity
          style={[styles.mainTabPill, topTab === "messages" && styles.mainTabPillActive]}
          onPress={() => setTopTab("messages")}
        >
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
          <Text
            style={[
              styles.mainTabPillText,
              topTab === "friends" && styles.mainTabPillTextActive,
            ]}
          >
            Squad & Friends ({friends.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* MESSAGES TAB CONTENT */}
      {topTab === "messages" && (
        <View style={{ flex: 1 }}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <Search size={14} color={colors.textMuted} />
            <TextInput
              placeholder="Search direct messages..."
              placeholderTextColor="rgba(101, 106, 126, 0.7)"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
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
                  activeOpacity={0.7}
                  style={styles.dmRow}
                  onPress={() => router.push(`/(app)/dms/${item.id}`)}
                >
                  <Avatar name={item.name} presence={item.presence} size={42} />
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
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MessageSquare size={36} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Direct Messages</Text>
                  <Text style={styles.emptySubtitle}>
                    Start a conversation with a teammate or member.
                  </Text>
                  <Button
                    title="Find Friends"
                    size="sm"
                    onPress={() => {
                      setTopTab("friends");
                      setFriendSubTab("add");
                    }}
                    style={{ marginTop: 12 }}
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

          {/* ONLINE & ALL SUB-TAB */}
          {(friendSubTab === "online" || friendSubTab === "all") && (
            <FlatList
              data={visibleFriends}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.friendRow}>
                  <Avatar name={item.name} presence={item.presence} size={40} />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{item.name}</Text>
                    <Text style={styles.friendStatus} numberOfLines={1}>
                      {item.status || (item.presence === "online" ? "Online" : "Offline")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleStartDMWithFriend(item.id)}
                  >
                    <MessageSquare size={16} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Users size={36} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {friendSubTab === "online" ? "No Friends Online" : "No Friends Yet"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {friendSubTab === "online"
                      ? "None of your friends are currently active."
                      : "Add friends by their username to connect."}
                  </Text>
                </View>
              }
            />
          )}

          {/* PENDING REQUESTS SUB-TAB */}
          {friendSubTab === "pending" && (
            <FlatList
              data={[
                ...incomingRequests.map((r: any) => ({ ...r, direction: "incoming" })),
                ...outgoingRequests.map((r: any) => ({ ...r, direction: "outgoing" })),
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.pendingCard}>
                  <Avatar name={item.user?.displayName || item.user?.username} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName}>
                      {item.user?.displayName || item.user?.username}
                    </Text>
                    <Text style={styles.pendingHandle}>
                      @{item.user?.username} · {item.direction === "incoming" ? "Incoming Request" : "Outgoing Request"}
                    </Text>
                  </View>
                  {item.direction === "incoming" ? (
                    <View style={styles.pendingBtnRow}>
                      <TouchableOpacity
                        style={[styles.circleBtn, { backgroundColor: colors.accentSoft }]}
                        onPress={() => handleAcceptRequest(item.id)}
                        disabled={actionLoadingId === item.id}
                      >
                        <Check size={16} color={colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.circleBtn, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}
                        onPress={() => handleDeclineRequest(item.id)}
                        disabled={actionLoadingId === item.id}
                      >
                        <X size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.outgoingBadge}>Sent</Text>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Users size={36} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Pending Requests</Text>
                  <Text style={styles.emptySubtitle}>
                    You have no pending incoming or outgoing requests.
                  </Text>
                </View>
              }
            />
          )}

          {/* ADD FRIEND SUB-TAB */}
          {friendSubTab === "add" && (
            <View style={{ flex: 1, paddingHorizontal: 14 }}>
              <View style={styles.addSearchBox}>
                <Search size={16} color={colors.textMuted} />
                <TextInput
                  placeholder="Enter @username or display name..."
                  placeholderTextColor="rgba(101, 106, 126, 0.7)"
                  style={styles.addInput}
                  value={addSearchQuery}
                  onChangeText={handleSearchUsersToAdd}
                  autoCapitalize="none"
                />
                {isSearchingAdd && (
                  <ActivityIndicator size="small" color={colors.accent} />
                )}
              </View>

              <FlatList
                data={addSearchResults}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingTop: 10, paddingBottom: 24 }}
                renderItem={({ item }) => {
                  const isFriend = item.relationStatus === "friend";
                  const isPending = item.relationStatus === "outgoing";
                  const isIncoming = item.relationStatus === "incoming";

                  return (
                    <View style={styles.searchResultRow}>
                      <Avatar name={item.displayName || item.username} presence={item.status} size={40} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchName}>{item.displayName || item.username}</Text>
                        <Text style={styles.searchHandle}>@{item.username}</Text>
                      </View>

                      {isFriend ? (
                        <TouchableOpacity
                          style={[styles.addBtn, { backgroundColor: colors.accentSoft }]}
                          onPress={() => handleStartDMWithFriend(item.id)}
                        >
                          <Text style={[styles.addBtnText, { color: colors.accent }]}>Message</Text>
                        </TouchableOpacity>
                      ) : isPending ? (
                        <View style={[styles.addBtn, { backgroundColor: "rgba(255, 255, 255, 0.05)" }]}>
                          <Text style={[styles.addBtnText, { color: colors.textMuted }]}>Request Sent</Text>
                        </View>
                      ) : isIncoming ? (
                        <TouchableOpacity
                          style={[styles.addBtn, { backgroundColor: colors.accent }]}
                          onPress={() => item.requestId && handleAcceptRequest(item.requestId)}
                        >
                          <Text style={[styles.addBtnText, { color: colors.accentContrast }]}>Accept</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addBtn, { backgroundColor: colors.accent }]}
                          onPress={() => handleSendFriendRequest(item.username)}
                          disabled={actionLoadingId === item.username}
                        >
                          <Text style={[styles.addBtnText, { color: colors.accentContrast }]}>
                            {actionLoadingId === item.username ? "Sending..." : "Add Friend"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={
                  addSearchQuery.trim() ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No Members Found</Text>
                      <Text style={styles.emptySubtitle}>
                        Try searching with a different username or full name.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Search size={32} color={colors.textMuted} />
                      <Text style={styles.emptyTitle}>Search for AIIC Members</Text>
                      <Text style={styles.emptySubtitle}>
                        Type a username above to find and connect with members.
                      </Text>
                    </View>
                  )
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
    backgroundColor: colors.background,
  },
  headerCapsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 14,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(18, 23, 34, 0.75)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  newBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainTabRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginVertical: 8,
    gap: 8,
  },
  mainTabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  mainTabPillActive: {
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    borderColor: "rgba(232, 163, 61, 0.3)",
  },
  mainTabPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  mainTabPillTextActive: {
    color: colors.accent,
  },
  subTabRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginVertical: 6,
    gap: 6,
  },
  subTabBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  subTabBtnActive: {
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderColor: "rgba(232, 163, 61, 0.35)",
  },
  subTabText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  subTabTextActive: {
    color: colors.accent,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 14,
    marginHorizontal: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  dmRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 3,
    borderRadius: 14,
    backgroundColor: "rgba(17, 18, 25, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    gap: 12,
  },
  dmInfo: {
    flex: 1,
  },
  dmTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  dmName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  dmTime: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  dmSnippet: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadText: {
    color: colors.accentContrast,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 3,
    borderRadius: 14,
    backgroundColor: "rgba(17, 18, 25, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    gap: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  friendStatus: {
    color: colors.textMuted,
    fontSize: 12,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(232, 163, 61, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 3,
    borderRadius: 14,
    backgroundColor: "rgba(17, 18, 25, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    gap: 12,
  },
  pendingName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  pendingHandle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  pendingBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  outgoingBadge: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  addSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 8,
    marginBottom: 8,
  },
  addInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 3,
    borderRadius: 14,
    backgroundColor: "rgba(17, 18, 25, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    gap: 12,
  },
  searchName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  searchHandle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },
});
