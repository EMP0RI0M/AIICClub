import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/tokens";
import { MobileAdminView } from "../../components/admin/MobileAdminView";
import { ArrowLeft } from "lucide-react-native";

export default function AdminDashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Control Plane</Text>
      </View>
      <MobileAdminView />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(10, 10, 12, 0.98)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  topTitle: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "bold",
  },
});
