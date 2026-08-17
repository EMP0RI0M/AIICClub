import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../../theme/tokens";
import { GlassCard } from "../../../components/ui/GlassCard";
import { Avatar } from "../../../components/ui/Avatar";
import { Badge } from "../../../components/ui/Badge";
import { useWorkspaceStore } from "../../../stores/workspace-store";
import { fetchOrgMembers, searchUsers } from "../../../lib/api";
import { ArrowLeft, Search, Users } from "lucide-react-native";

export default function PeopleDirectoryScreen() {
  const router = useRouter();
  const { spaces, activeSpaceId } = useWorkspaceStore();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"All" | "Leadership">("All");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentSpaceId = activeSpaceId || spaces[0]?.id;

  useEffect(() => {
    async function loadMembers() {
      setLoading(true);
      try {
        if (currentSpaceId) {
          const res = await fetchOrgMembers(currentSpaceId);
          if (res?.members && res.members.length > 0) {
            setMembers(res.members);
            setLoading(false);
            return;
          }
        }
        // Fallback to global user search if space has no org entries yet
        const searchRes = await searchUsers("");
        setMembers(searchRes?.users || []);
      } catch (err) {
        console.warn("Failed to load members:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, [currentSpaceId]);

  const handleSearch = (query: string) => {
    setSearch(query);
    if (!query.trim()) return;
    searchUsers(query)
      .then((res) => {
        if (res?.users) {
          setMembers(res.users);
        }
      })
      .catch(() => {});
  };

  const filtered = members.filter((m) => {
    const name = m.displayName || m.username || "";
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    if (tab === "Leadership") {
      const isLead =
        (m.hierarchyLevel && m.hierarchyLevel >= 80) ||
        m.role?.toLowerCase().includes("president") ||
        m.role?.toLowerCase().includes("lead") ||
        m.role?.toLowerCase().includes("admin") ||
        m.roleName?.toLowerCase().includes("president") ||
        m.roleName?.toLowerCase().includes("lead");
      return matchesSearch && isLead;
    }
    return matchesSearch;
  });

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Member Directory</Text>
      </View>

      <View style={styles.searchBar}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          placeholder="Search by name, role, or username..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "All" && styles.tabActive]}
          onPress={() => setTab("All")}
        >
          <Text style={[styles.tabText, tab === "All" && styles.tabTextActive]}>
            All Members ({members.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "Leadership" && styles.tabActive]}
          onPress={() => setTab("Leadership")}
        >
          <Text
            style={[styles.tabText, tab === "Leadership" && styles.tabTextActive]}
          >
            Leadership
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard elevated style={styles.card}>
              <View style={styles.cardTop}>
                <Avatar
                  name={item.displayName || item.username}
                  presence={item.status || "offline"}
                  size={46}
                />
                <View style={styles.memberMeta}>
                  <View style={styles.nameRow}>
                    <Text style={styles.displayName}>
                      {item.displayName || item.username}
                    </Text>
                    {(item.roleName || item.role) && (
                      <Badge label={item.roleName || item.role} variant="teal" />
                    )}
                  </View>
                  <Text style={styles.roleText}>@{item.username}</Text>
                  {item.team?.name && (
                    <Text style={styles.teamText}>Team: {item.team.name}</Text>
                  )}
                </View>
              </View>

              {item.bio && <Text style={styles.bioText}>{item.bio}</Text>}
            </GlassCard>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No registered members found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 8,
    marginRight: 16,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 6,
  },
  memberMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  roleText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  teamText: {
    color: colors.accentTeal,
    fontSize: 11,
    marginTop: 2,
  },
  bioText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
