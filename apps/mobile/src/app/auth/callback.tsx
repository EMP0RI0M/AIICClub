import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../stores/auth-store";
import { colors } from "../../theme/tokens";
import { Sparkles, AlertCircle, ArrowLeft } from "lucide-react-native";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { handleOAuthCallback, restoreSession } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function processAuth() {
      try {
        const initialUrl = await Linking.getInitialURL();
        const currentUrl = typeof window !== "undefined" ? window.location.href : initialUrl || "";

        console.log("[AuthCallback] Processing callback URL:", currentUrl);
        const success = await handleOAuthCallback(currentUrl);

        if (success && mounted) {
          router.replace("/(app)/spaces/space-aiic-main/c-general" as any);
          return;
        }

        // Check if session is already active
        const restored = await restoreSession();
        if (restored && mounted) {
          router.replace("/(app)/spaces/space-aiic-main/c-general" as any);
          return;
        }

        if (mounted) {
          if (params.error_description || params.error) {
            setErrorMsg(String(params.error_description || params.error));
          } else {
            setErrorMsg("Could not complete authentication. Please try signing in again.");
          }
        }
      } catch (err: any) {
        console.error("[AuthCallback] Error:", err);
        if (mounted) {
          setErrorMsg(err?.message || "Failed to process sign-in callback.");
        }
      }
    }

    processAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#08090E", "#151108", "#05060A"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        {errorMsg ? (
          <View style={styles.card}>
            <View style={styles.iconOrbError}>
              <AlertCircle size={28} color={colors.danger} />
            </View>
            <Text style={styles.title}>Sign In Failed</Text>
            <Text style={styles.subtitle}>{errorMsg}</Text>

            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => router.replace("/(auth)/login" as any)}
            >
              <ArrowLeft size={16} color="#000" />
              <Text style={styles.retryBtnText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.iconOrb}>
              <Sparkles size={28} color={colors.accent} />
            </View>
            <Text style={styles.title}>Signing you in...</Text>
            <Text style={styles.subtitle}>Securing AIIC encrypted session</Text>
            <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 14 }} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090E",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    padding: 28,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  iconOrb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(232, 163, 61, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(232, 163, 61, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconOrbError: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  retryBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
  },
});
