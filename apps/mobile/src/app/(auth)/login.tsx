import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, typography } from "../../theme/tokens";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../stores/auth-store";
import { Mail, Lock, LogIn, ArrowLeft } from "lucide-react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }
    setError(null);
    try {
      await login(email, password);
      router.replace("/(app)/spaces/space-aiic-main/c-general");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials or sign-in failed.");
    }
  };

  const handleDemoSignIn = async () => {
    setEmail("alex.rivera@aiic.club");
    setPassword("aiic-demo-password");
    try {
      await login("alex.rivera@aiic.club", "aiic-demo-password");
      router.replace("/(app)/spaces/space-aiic-main/c-general");
    } catch {
      // Fallback local demo sign-in
      const { updateUser } = useAuthStore.getState();
      updateUser({
        id: "u-alex-demo",
        email: "alex.rivera@aiic.club",
        displayName: "Alex Rivera",
        username: "arivera",
        status: "online",
        role: "Lead Architect",
        onboardingCompleted: true,
      });
      router.replace("/(app)/spaces/space-aiic-main/c-general");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={colors.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>A</Text>
            </View>
            <Text style={styles.title}>Sign in to AIIC</Text>
            <Text style={styles.subtitle}>
              Access your squad spaces, realtime channels, and project boards.
            </Text>
          </View>

          <GlassCard elevated intensity="high" style={styles.formCard}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Email Address"
              placeholder="user@aiic.club"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftIcon={<Mail size={18} color={colors.textMuted} />}
            />

            <Input
              label="Password"
              placeholder="••••••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              leftIcon={<Lock size={18} color={colors.textMuted} />}
            />

            <Button
              title="Sign In"
              size="lg"
              loading={isLoading}
              icon={<LogIn size={18} color={colors.accentContrast} />}
              onPress={handleLogin}
              style={{ marginTop: 8 }}
            />

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <Button
              title="Quick Demo Mode Access"
              variant="secondary"
              onPress={handleDemoSignIn}
            />

            <View style={styles.footerLinks}>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>

              <View style={styles.registerRow}>
                <Text style={styles.mutedText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                  <Text style={styles.accentLink}>Create account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 6,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "800",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  formCard: {
    padding: 20,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerDim,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "500",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
    marginHorizontal: 10,
    fontWeight: "600",
  },
  footerLinks: {
    marginTop: 20,
    alignItems: "center",
    gap: 12,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  accentLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
});
