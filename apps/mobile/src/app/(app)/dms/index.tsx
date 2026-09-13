import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
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
import { DMSummary, FriendEntry, Presence } from "../../../lib/types";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
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
  UserX,
  Clock,
  Sparkles,
  ShieldAlert,
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

  // Add friend direct input & live directory search
  const [directUsername, setDirectUsername] = useState("");
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addSearchResults, setAddSearchResults] = useState<any[]>([]);
  const [isSearchingAdd, setIsSearchingAdd] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Live search directory with debounce
  const handleLiveSearchChange = (q: string) => {
    setAddSearchQuery(q);
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    if (q.trim().length < 2) {
      setAddSearchResults([]);
      setIsSearchingAdd(false);
      setSearchError(null);
      return;
    }

    setIsSearchingAdd(true);
    setSearchError(null);

    searchDebounceTimer.current = setTimeout(async () => {
      try {
        const res = await searchUsers(q.trim());
        setAddSearchResults(res?.users || []);
      } catch (err: any) {
        setSearchError(err?.message || "Could not search users.");
        setAddSearchResults([]);
      } finally {
        setIsSearchingAdd(false);
      }
    }, 250);
  };

  const handleSendFriendRequest = async (target: string) => {
    const trimmed = target.trim();
    if (!trimmed) return;
    setActionLoadingId(trimmed);
    try {
      const res = await sendFriendRequest(trimmed);
      Alert.alert("Friend Request", res.message || `Friend request sent to ${trimmed}`);
      setDirectUsername("");
      await loadFriends();
      if (addSearchQuery.trim().length >= 2) {
        const updated = await searchUsers(addSearchQuery.trim());
        setAddSearchResults(updated?.users || []);
      }
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
      if (addSearchQuery.trim().length >= 2) {
        const updated = await searchUsers(addSearchQuery.trim());
        setAddSearchResults(updated?.users || []);
      }
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

  const handleCancelRequest = async (reqId: string) => {
    setActionLoadingId(reqId);
    try {
      await cancelFriendRequest(reqId);
      await loadFriends();
      if (addSearchQuery.trim().length >= 2) {
        const updated = await searchUsers(addSearchQuery.trim());
        setAddSearchResults(updated?.users || []);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to cancel request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriendAction = (friendId: string, friendName: string) => {
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${friendName} from your friends list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setActionLoadingId(friendId);
            try {
              await removeFriend(friendId);
              await loadFriends();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to remove friend.");
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
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

  const handleStartCall = (friendName: string) => {
    Alert.alert("Audio / Video Call", `Initiating encrypted AIIC call with ${friendName}...`);
  };

  const getRelationLabel = (item: any) => {
    const status = item.relationStatus || (item.pending ? (item.pending === "incoming" ? "incoming_request" : "outgoing_request") : undefined);
    switch (status) {
      case "friend":
      case "friends":
        return "Already friends";
      case "incoming":
      case "incoming_request":
        return "Sent you a request";
      case "outgoing":
      case "outgoing_request":
        return "Request pending";
      default:
        return "AIIC Member";
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Ambient Color Glows */}
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={[
                  styles.mainTabPillText,
                  topTab === "friends" && styles.mainTabPillTextActive,
                ]}
              >
                Friends ({friends.length})
              </Text>
              {incomingRequests.length > 0 && (
                <View style={styles.pendingPillDot} />
              )}
            </View>
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* ========================================================= */}
      {/* MESSAGES TAB CONTENT */}
      {/* ========================================================= */}
      {topTab === "messages" && (
        <View style={{ flex: 1 }}>
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
                    <Avatar name={item.name} presence={item.presence} size={44} url={(item as any).avatar || (item as any).avatarUrl} />
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
                    Connect and start a liquid glass conversation with your squad.
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

      {/* ========================================================= */}
      {/* SQUAD & FRIENDS TAB CONTENT */}
      {/* ========================================================= */}
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
                  hasBadge: incomingRequests.length > 0,
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
                {"hasBadge" in st && st.hasBadge && (
                  <View style={styles.subTabDot} />
                )}
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
                    <Avatar name={item.name} presence={item.presence} size={42} url={(item as any).avatar || (item as any).avatarUrl} />
                    <View style={styles.dmInfo}>
                      <Text style={styles.dmName}>{item.name}</Text>
                      <Text style={styles.dmSnippet}>
                        @{item.username || item.name.toLowerCase().replace(/\s+/g, "")}
                        {item.status ? ` · ${item.status}` : ""}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {/* Message Action */}
                      <TouchableOpacity
                        style={styles.actionCircleBtn}
                        onPress={() => handleStartDMWithFriend(item.id)}
                      >
                        <MessageSquare size={15} color={colors.accent} />
                      </TouchableOpacity>

                      {/* Voice / Video Call Action */}
                      <TouchableOpacity
                        style={[styles.actionCircleBtn, { borderColor: "rgba(45, 212, 191, 0.25)", backgroundColor: "rgba(45, 212, 191, 0.1)" }]}
                        onPress={() => handleStartCall(item.name)}
                      >
                        <Phone size={15} color={colors.accentTeal} />
                      </TouchableOpacity>

                      {/* Remove Friend Action */}
                      <TouchableOpacity
                        style={[styles.actionCircleBtn, { borderColor: "rgba(255, 77, 79, 0.2)", backgroundColor: "rgba(255, 77, 79, 0.08)" }]}
                        onPress={() => handleRemoveFriendAction(item.id, item.name)}
                        disabled={actionLoadingId === item.id}
                      >
                        {actionLoadingId === item.id ? (
                          <ActivityIndicator size="small" color={colors.danger} />
                        ) : (
                          <UserX size={14} color={colors.danger} />
                        )}
                      </TouchableOpacity>
                    </View>
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

          {/* PENDING REQUESTS (INCOMING & OUTGOING) */}
          {friendSubTab === "pending" && (
            <ScrollView contentContainerStyle={styles.list}>
              {/* Received Requests Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>
                  RECEIVED REQUESTS ({incomingRequests.length})
                </Text>
              </View>

              {incomingRequests.length === 0 ? (
                <View style={styles.emptySectionBox}>
                  <Text style={styles.emptySectionText}>No received friend requests.</Text>
                </View>
              ) : (
                incomingRequests.map((req) => {
                  const reqId = req.requestId || req.id;
                  return (
                    <View key={`in-${reqId}`} style={styles.dmRowWrap}>
                      <BlurView intensity={25} tint="dark" style={styles.dmRow}>
                        <LinearGradient
                          colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <Avatar name={req.name} size={42} url={req.avatar} />
                        <View style={styles.dmInfo}>
                          <Text style={styles.dmName}>{req.name}</Text>
                          <Text style={styles.dmSnippet}>
                            @{req.username || req.name.toLowerCase().replace(/\s+/g, "")} · Incoming request
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            style={[styles.actionCapsuleBtn, { backgroundColor: "rgba(45, 212, 191, 0.18)", borderColor: "rgba(45, 212, 191, 0.4)" }]}
                            onPress={() => handleAcceptRequest(reqId)}
                            disabled={actionLoadingId === reqId}
                          >
                            {actionLoadingId === reqId ? (
                              <ActivityIndicator size="small" color={colors.accentTeal} />
                            ) : (
                              <>
                                <Check size={13} color={colors.accentTeal} />
                                <Text style={[styles.actionCapsuleText, { color: colors.accentTeal }]}>Accept</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionCapsuleBtn, { backgroundColor: "rgba(255, 77, 79, 0.14)", borderColor: "rgba(255, 77, 79, 0.3)" }]}
                            onPress={() => handleDeclineRequest(reqId)}
                            disabled={actionLoadingId === reqId}
                          >
                            <X size={13} color={colors.danger} />
                            <Text style={[styles.actionCapsuleText, { color: colors.danger }]}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      </BlurView>
                    </View>
                  );
                })
              )}

              {/* Sent Requests Section */}
              <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
                <Text style={styles.sectionHeaderTitle}>
                  SENT REQUESTS ({outgoingRequests.length})
                </Text>
              </View>

              {outgoingRequests.length === 0 ? (
                <View style={styles.emptySectionBox}>
                  <Text style={styles.emptySectionText}>No outgoing friend requests.</Text>
                </View>
              ) : (
                outgoingRequests.map((req) => {
                  const reqId = req.requestId || req.id;
                  return (
                    <View key={`out-${reqId}`} style={styles.dmRowWrap}>
                      <BlurView intensity={25} tint="dark" style={styles.dmRow}>
                        <LinearGradient
                          colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <Avatar name={req.name} size={42} url={req.avatar} />
                        <View style={styles.dmInfo}>
                          <Text style={styles.dmName}>{req.name}</Text>
                          <Text style={styles.dmSnippet}>
                            @{req.username || req.name.toLowerCase().replace(/\s+/g, "")} · Pending response
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.actionCapsuleBtn, { backgroundColor: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.12)" }]}
                          onPress={() => handleCancelRequest(reqId)}
                          disabled={actionLoadingId === reqId}
                        >
                          {actionLoadingId === reqId ? (
                            <ActivityIndicator size="small" color={colors.textMuted} />
                          ) : (
                            <>
                              <X size={12} color={colors.textMuted} />
                              <Text style={[styles.actionCapsuleText, { color: colors.textMuted }]}>Cancel</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </BlurView>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* ADD FRIEND TAB (FULL WEBSITE PARITY) */}
          {friendSubTab === "add" && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 16 }}>
              {/* Header Box */}
              <View style={styles.addFriendBanner}>
                <BlurView intensity={25} tint="dark" style={styles.addFriendBannerInner}>
                  <Text style={styles.addFriendBannerTitle}>
                    ADD A FRIEND BY USERNAME OR ID
                  </Text>
                  <Text style={styles.addFriendBannerSubtitle}>
                    Search for fellow AIIC engineers and club members to collaborate, voice call, and DM.
                  </Text>

                  {/* Direct Input */}
                  <View style={styles.directInputRow}>
                    <View style={styles.directInputWrapper}>
                      <Search size={15} color="rgba(255, 255, 255, 0.4)" />
                      <TextInput
                        placeholder="Enter username (e.g. rafi, alex)..."
                        placeholderTextColor="rgba(255, 255, 255, 0.35)"
                        style={styles.directInput}
                        value={directUsername}
                        onChangeText={setDirectUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onSubmitEditing={() => handleSendFriendRequest(directUsername)}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.directSendBtn,
                        !directUsername.trim() && styles.directSendBtnDisabled,
                      ]}
                      onPress={() => handleSendFriendRequest(directUsername)}
                      disabled={!directUsername.trim() || actionLoadingId === directUsername.trim()}
                    >
                      {actionLoadingId === directUsername.trim() ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <>
                          <UserPlus size={14} color={directUsername.trim() ? "#000" : "rgba(255,255,255,0.4)"} />
                          <Text
                            style={[
                              styles.directSendBtnText,
                              !directUsername.trim() && { color: "rgba(255,255,255,0.4)" },
                            ]}
                          >
                            Send
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </View>

              {/* Live Directory Search Card */}
              <View style={styles.liveDirectoryBox}>
                <BlurView intensity={25} tint="dark" style={styles.liveDirectoryInner}>
                  <View style={styles.liveDirectoryHeader}>
                    <Text style={styles.liveDirectoryTitle}>LIVE DIRECTORY SEARCH</Text>
                    {isSearchingAdd && (
                      <ActivityIndicator size="small" color={colors.accent} />
                    )}
                  </View>

                  <View style={styles.liveSearchInputWrap}>
                    <Search size={14} color={colors.accent} />
                    <TextInput
                      placeholder="Live search by name or username..."
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      style={styles.liveSearchInput}
                      value={addSearchQuery}
                      onChangeText={handleLiveSearchChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!!addSearchQuery && (
                      <TouchableOpacity onPress={() => handleLiveSearchChange("")} hitSlop={6}>
                        <X size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Results List */}
                  {searchError ? (
                    <Text style={styles.searchErrorText}>{searchError}</Text>
                  ) : addSearchQuery.trim().length < 2 ? (
                    <Text style={styles.searchHintText}>
                      Type at least 2 characters to search AIIC members.
                    </Text>
                  ) : addSearchResults.length === 0 && !isSearchingAdd ? (
                    <Text style={styles.searchHintText}>
                      No members found matching &quot;{addSearchQuery}&quot;.
                    </Text>
                  ) : (
                    <View style={{ gap: 8, marginTop: 10 }}>
                      {addSearchResults.map((userItem) => {
                        const rel = userItem.relationStatus;
                        const isActionLoading =
                          actionLoadingId === userItem.username ||
                          actionLoadingId === userItem.id ||
                          actionLoadingId === userItem.pendingRequestId;

                        return (
                          <View key={userItem.id} style={styles.userCardRow}>
                            <Avatar
                              name={userItem.displayName || userItem.username}
                              size={38}
                              url={userItem.avatarUrl || userItem.avatar_url || userItem.avatar}
                            />
                            <View style={styles.dmInfo}>
                              <Text style={styles.dmName}>
                                {userItem.displayName || userItem.username}
                              </Text>
                              <Text style={styles.dmSnippet}>
                                @{userItem.username} · {getRelationLabel(userItem)}
                              </Text>
                            </View>

                            {/* Dynamic Relation Action */}
                            {rel === "friend" || rel === "friends" ? (
                              <View style={styles.statusBadgePill}>
                                <Text style={styles.statusBadgeText}>Friends</Text>
                              </View>
                            ) : (rel === "incoming" || rel === "incoming_request") && userItem.pendingRequestId ? (
                              <TouchableOpacity
                                style={[styles.actionCapsuleBtn, { backgroundColor: "rgba(45, 212, 191, 0.2)", borderColor: "rgba(45, 212, 191, 0.4)" }]}
                                onPress={() => handleAcceptRequest(userItem.pendingRequestId)}
                                disabled={isActionLoading}
                              >
                                {isActionLoading ? (
                                  <ActivityIndicator size="small" color={colors.accentTeal} />
                                ) : (
                                  <>
                                    <Check size={12} color={colors.accentTeal} />
                                    <Text style={[styles.actionCapsuleText, { color: colors.accentTeal }]}>Accept</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            ) : rel === "outgoing" || rel === "outgoing_request" ? (
                              <TouchableOpacity
                                style={[styles.actionCapsuleBtn, { backgroundColor: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.12)" }]}
                                onPress={() => {
                                  if (userItem.pendingRequestId) {
                                    handleCancelRequest(userItem.pendingRequestId);
                                  }
                                }}
                                disabled={isActionLoading || !userItem.pendingRequestId}
                              >
                                {isActionLoading ? (
                                  <ActivityIndicator size="small" color={colors.textMuted} />
                                ) : (
                                  <>
                                    <Clock size={11} color={colors.textMuted} />
                                    <Text style={[styles.actionCapsuleText, { color: colors.textMuted }]}>Pending</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={styles.sendRequestBtn}
                                onPress={() => handleSendFriendRequest(userItem.username || userItem.id)}
                                disabled={isActionLoading}
                              >
                                {isActionLoading ? (
                                  <ActivityIndicator size="small" color="#000" />
                                ) : (
                                  <>
                                    <UserPlus size={13} color="#000" />
                                    <Text style={styles.sendRequestBtnText}>Add</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </BlurView>
              </View>
            </ScrollView>
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
  pendingPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
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
    fontSize: 12,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  subTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
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
  actionCapsuleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionCapsuleText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  sectionHeaderRow: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 0.8,
  },
  emptySectionBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySectionText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: "monospace",
  },
  addFriendBanner: {
    borderRadius: 20,
    overflow: "hidden",
  },
  addFriendBannerInner: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(10, 10, 10, 0.6)",
  },
  addFriendBannerTitle: {
    color: colors.accent,
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  addFriendBannerSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  directInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  directInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
  },
  directInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "monospace",
    color: "#FFF",
  },
  directSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: "center",
  },
  directSendBtnDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  directSendBtnText: {
    color: "#000",
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "800",
  },
  liveDirectoryBox: {
    borderRadius: 20,
    overflow: "hidden",
  },
  liveDirectoryInner: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(10, 10, 10, 0.6)",
  },
  liveDirectoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  liveDirectoryTitle: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  liveSearchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
  },
  liveSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#FFF",
  },
  searchErrorText: {
    fontSize: 12,
    color: colors.danger,
    paddingVertical: 14,
    textAlign: "center",
  },
  searchHintText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    paddingVertical: 14,
    textAlign: "center",
    fontFamily: "monospace",
  },
  userCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  statusBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontFamily: "monospace",
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "700",
  },
  sendRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  sendRequestBtnText: {
    color: "#000",
    fontSize: 11.5,
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
