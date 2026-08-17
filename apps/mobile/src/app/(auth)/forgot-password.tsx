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
import { getSupabaseClient } from "../../lib/supabase";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react-native";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
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
            <Text style={styles.backText}>Back to Sign In</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email to receive recovery instructions.
            </Text>
          </View>

          <GlassCard elevated intensity="high" style={styles.formCard}>
            {sent ? (
              <View style={styles.sentContainer}>
                <CheckCircle2 size={40} color={colors.success} />
                <Text style={styles.sentTitle}>Reset Link Sent</Text>
                <Text style={styles.sentText}>
                  If an account exists for {email}, you will receive password reset instructions shortly.
                </Text>
                <Button
                  title="Back to Sign In"
                  onPress={() => router.replace("/(auth)/login")}
                  style={{ marginTop: 16, width: "100%" }}
                />
              </View>
            ) : (
              <>
                {error && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                )}

                <Input
                  label="Account Email"
                  placeholder="user@aiic.club"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  leftIcon={<Mail size={18} color={colors.textMuted} />}
                />

                <Button
                  title="Send Reset Instructions"
                  size="lg"
                  loading={loading}
                  onPress={handleReset}
                  style={{ marginTop: 8 }}
                />
              </>
            )}
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
    marginBottom: 20,
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
  },
  formCard: {
    padding: 20,
  },
  sentContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  sentTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 10,
  },
  sentText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
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
  },
});
