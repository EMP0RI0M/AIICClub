import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../../theme/tokens";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../stores/auth-store";
import { Mail, Lock, User as UserIcon, ArrowLeft, CheckCircle2 } from "lucide-react-native";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successConfirmation, setSuccessConfirmation] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setError(null);
    try {
      const { confirmEmail } = await register({
        displayName,
        username,
        email,
        password,
      });

      if (confirmEmail) {
        setSuccessConfirmation(true);
      } else {
        router.replace("/(app)/spaces/space-aiic-main/c-general");
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please check your information.");
    }
  };

  if (successConfirmation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmationContent}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={48} color={colors.success} />
          </View>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification link to <Text style={{ color: colors.accent }}>{email}</Text>. Confirm your email to activate your AIIC workspace account.
          </Text>
          <Button
            title="Return to Login"
            size="lg"
            onPress={() => router.replace("/(auth)/login")}
            style={{ marginTop: 24, width: "100%" }}
          />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.backText}>Back to Sign In</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Join AIIC</Text>
            <Text style={styles.subtitle}>
              Create your account to collaborate on projects, join squads, and build with frontier AI.
            </Text>
          </View>

          <GlassCard elevated intensity="high" style={styles.formCard}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Full / Display Name"
              placeholder="e.g. Alex Rivera"
              value={displayName}
              onChangeText={setDisplayName}
              leftIcon={<UserIcon size={18} color={colors.textMuted} />}
            />

            <Input
              label="Username"
              placeholder="e.g. arivera"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              leftIcon={<UserIcon size={18} color={colors.textMuted} />}
            />

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
              title="Create Account"
              size="lg"
              loading={isLoading}
              onPress={handleRegister}
              style={{ marginTop: 10 }}
            />

            <View style={styles.loginRow}>
              <Text style={styles.mutedText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.accentLink}>Sign in</Text>
              </TouchableOpacity>
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
  },
  confirmationContent: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
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
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
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
