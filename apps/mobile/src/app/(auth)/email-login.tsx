import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/auth-store";

const COLORS = {
  bg: "#07090D",
  surface: "#10141D",
  surface2: "#151A24",

  amber: "#E8A33D",
  amberLight: "#F3C56B",

  teal: "#2DD4BF",

  text: "#F5F7FA",
  muted: "rgba(245,247,250,0.62)",
  faint: "rgba(245,247,250,0.38)",

  border: "rgba(255,255,255,0.11)",
  input: "rgba(255,255,255,0.055)",
};

function AmbientGlow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={styles.amberGlow} />
      <View style={styles.tealGlow} />
      <View style={styles.centerGlow} />
    </View>
  );
}

export default function EmailLoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Independent refs matching working register screen
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const ready =
    email.includes("@") &&
    email.includes(".") &&
    password.length >= 6;

  const handleSignIn = async () => {
    if (!ready || isLoading) return;
    setError(null);
    try {
      await login(email, password);
      router.replace("/(app)/spaces/space-aiic-main/c-general" as any);
    } catch (err: any) {
      setError(err?.message || "Invalid credentials or sign-in failed.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.background} />
        <AmbientGlow />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <View style={styles.backWrapper}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backPressed,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={COLORS.text}
              />
            </Pressable>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.smallBrand}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>AIIC</Text>
            </View>

            <Text style={styles.title}>
              Welcome back.
            </Text>

            <Text style={styles.subtitle}>
              Sign in to continue to your AIIC space.
            </Text>
          </View>

          {/* Error message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.muted}
              />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.faint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                selectionColor={COLORS.amber}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.muted}
              />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.faint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                selectionColor={COLORS.amber}
              />
            </View>

            {/* Forgot password */}
            <Pressable
              onPress={() => router.push("/(auth)/forgot-password" as any)}
              style={({ pressed }) => [
                styles.forgotButton,
                pressed && { opacity: 0.65 },
              ]}
            >
              <Text style={styles.forgotText}>
                Forgot password?
              </Text>
            </Pressable>

            {/* Sign in button */}
            <Pressable
              disabled={!ready || isLoading}
              onPress={handleSignIn}
              style={({ pressed }) => [
                styles.signInButton,
                (!ready || isLoading) && styles.signInDisabled,
                pressed && ready && styles.signInPressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#080A0D" />
              ) : (
                <>
                  <Text style={styles.signInText}>
                    Sign in
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#080A0D"
                  />
                </>
              )}
            </Pressable>
          </View>

          {/* Create account */}
          <Pressable
            onPress={() => router.push("/(auth)/register" as any)}
            style={styles.createAccount}
          >
            <Text style={styles.createNormal}>
              New here?{" "}
            </Text>
            <Text style={styles.createLink}>
              Create an account
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 14,
    paddingBottom: 24,
  },

  amberGlow: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 260,
    bottom: -260,
    left: -120,
    backgroundColor: "rgba(232,163,61,0.095)",
  },

  tealGlow: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: 165,
    top: 60,
    right: -180,
    backgroundColor: "rgba(45,212,191,0.055)",
  },

  centerGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: "35%",
    alignSelf: "center",
    backgroundColor: "rgba(232,163,61,0.035)",
  },

  backWrapper: {
    marginBottom: 20,
    alignSelf: "flex-start",
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.065)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  backPressed: {
    transform: [{ scale: 0.9 }],
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  header: {
    marginBottom: 8,
  },

  smallBrand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
    gap: 8,
  },

  brandDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.amber,
  },

  brandText: {
    color: COLORS.amberLight,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
  },

  title: {
    color: COLORS.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
    maxWidth: 325,
  },

  errorContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },

  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },

  form: {
    marginTop: 20,
  },

  inputContainer: {
    height: 55,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 11,
    borderRadius: 17,
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },

  input: {
    flex: 1,
    height: "100%",
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
  },

  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 5,
    marginTop: -2,
    marginBottom: 6,
  },

  forgotText: {
    color: COLORS.muted,
    fontSize: 12.5,
    fontWeight: "500",
  },

  signInButton: {
    height: 54,
    borderRadius: 27,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: COLORS.amber,
  },

  signInDisabled: {
    opacity: 0.38,
  },

  signInPressed: {
    transform: [{ scale: 0.975 }],
  },

  signInText: {
    color: "#080A0D",
    fontSize: 15,
    fontWeight: "800",
  },

  createAccount: {
    alignSelf: "center",
    flexDirection: "row",
    marginTop: 28,
    marginBottom: 14,
    paddingVertical: 6,
  },

  createNormal: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "500",
  },

  createLink: {
    color: COLORS.amberLight,
    fontSize: 13,
    fontWeight: "700",
  },
});
