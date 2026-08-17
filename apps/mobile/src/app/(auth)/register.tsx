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
  inputFocused: "rgba(255,255,255,0.085)",
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

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successConfirmation, setSuccessConfirmation] = useState(false);

  // Independent refs for keyboard Next chaining
  const displayNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const ready =
    displayName.trim().length >= 2 &&
    email.includes("@") &&
    email.includes(".") &&
    password.length >= 6;

  const handleRegister = async () => {
    if (!ready || isLoading) return;
    setError(null);
    try {
      const generatedUsername = displayName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const { confirmEmail } = await register({
        displayName: displayName.trim(),
        username: generatedUsername,
        email: email.trim(),
        password,
      });

      if (confirmEmail) {
        setSuccessConfirmation(true);
      } else {
        router.replace("/(app)/spaces/space-aiic-main/c-general" as any);
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please check your information.");
    }
  };

  if (successConfirmation) {
    return (
      <View style={styles.container}>
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.background} />
          <AmbientGlow />
        </View>
        <View style={styles.confirmationBody}>
          <View style={styles.smallBrand}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>AIIC</Text>
          </View>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification link to <Text style={{ color: COLORS.amberLight }}>{email}</Text>. Confirm your email to activate your AIIC workspace account.
          </Text>
          <Pressable
            onPress={() => router.replace("/(auth)/login" as any)}
            style={({ pressed }) => [
              styles.createButton,
              { marginTop: 28, width: "100%" },
              pressed && styles.createPressed,
            ]}
          >
            <Text style={styles.createButtonText}>Return to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
              Create your account.
            </Text>

            <Text style={styles.subtitle}>
              Join your AIIC community and start building your space.
            </Text>
          </View>

          {/* Error banner */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Display Name Input */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.muted}
              />
              <TextInput
                ref={displayNameRef}
                style={styles.input}
                placeholder="Display name"
                placeholderTextColor={COLORS.faint}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
                selectionColor={COLORS.amber}
              />
            </View>

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
                onSubmitEditing={handleRegister}
                selectionColor={COLORS.amber}
              />
            </View>

            {/* Password requirement */}
            <View style={styles.passwordHint}>
              <View
                style={[
                  styles.statusDot,
                  password.length >= 6 && styles.statusDotActive,
                ]}
              />
              <Text style={styles.passwordHintText}>
                Use at least 6 characters
              </Text>
            </View>

            {/* Create button */}
            <Pressable
              disabled={!ready || isLoading}
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.createButton,
                (!ready || isLoading) && styles.createDisabled,
                pressed && ready && styles.createPressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#080A0D" />
              ) : (
                <>
                  <Text style={styles.createButtonText}>
                    Create account
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

          {/* Login Link */}
          <Pressable
            onPress={() => router.push("/(auth)/login" as any)}
            style={styles.loginButton}
          >
            <Text style={styles.loginNormal}>
              Already have an account?{" "}
            </Text>
            <Text style={styles.loginLink}>
              Sign in
            </Text>
          </Pressable>

          {/* Terms */}
          <Text style={styles.terms}>
            By creating an account, you agree to our Terms and Privacy Policy.
          </Text>
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
    bottom: -280,
    left: -140,
    backgroundColor: "rgba(232,163,61,0.095)",
  },

  tealGlow: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: 165,
    top: 50,
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
    borderColor: "rgba(255,255,255,0.11)",
  },

  backPressed: {
    transform: [{ scale: 0.9 }],
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  header: {
    marginBottom: 8,
  },

  confirmationBody: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
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

  passwordHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
    marginBottom: 5,
    paddingLeft: 4,
    gap: 8,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.faint,
  },

  statusDotActive: {
    backgroundColor: COLORS.teal,
  },

  passwordHintText: {
    color: COLORS.faint,
    fontSize: 11.5,
    fontWeight: "500",
  },

  createButton: {
    height: 54,
    borderRadius: 27,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: COLORS.amber,
  },

  createDisabled: {
    opacity: 0.38,
  },

  createPressed: {
    transform: [{ scale: 0.975 }],
  },

  createButtonText: {
    color: "#080A0D",
    fontSize: 15,
    fontWeight: "800",
  },

  loginButton: {
    alignSelf: "center",
    flexDirection: "row",
    marginTop: 28,
    marginBottom: 14,
    paddingVertical: 6,
  },

  loginNormal: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "500",
  },

  loginLink: {
    color: COLORS.amberLight,
    fontSize: 13,
    fontWeight: "700",
  },

  terms: {
    textAlign: "center",
    paddingHorizontal: 20,
    color: "rgba(245,247,250,0.34)",
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "500",
  },
});
