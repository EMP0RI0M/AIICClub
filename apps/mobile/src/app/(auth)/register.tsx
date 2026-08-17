import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
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

function FadeSlide({
  children,
  delay,
  style,
}: {
  children: React.ReactNode;
  delay: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function AmbientGlow() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.amberGlow} />
      <View style={styles.tealGlow} />
      <View style={styles.centerGlow} />
    </Animated.View>
  );
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.inputContainer,
        focused && styles.inputFocused,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={focused ? COLORS.amber : COLORS.muted}
      />

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.faint}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={COLORS.amber}
      />
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successConfirmation, setSuccessConfirmation] = useState(false);

  const ready =
    name.trim().length >= 2 &&
    email.includes("@") &&
    email.includes(".") &&
    password.length >= 6;

  const handleRegister = async () => {
    if (!ready) return;
    setError(null);
    try {
      const generatedUsername = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const { confirmEmail } = await register({
        displayName: name.trim(),
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.background} />
        <AmbientGlow />
      </View>

      {/* Back button */}
      <FadeSlide delay={250} style={styles.backWrapper}>
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
      </FadeSlide>

      <View style={styles.body}>
        {/* Header */}
        <FadeSlide delay={180}>
          <View>
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
        </FadeSlide>

        {/* Error banner */}
        {error ? (
          <FadeSlide delay={300} style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </FadeSlide>
        ) : null}

        {/* Form */}
        <View style={styles.form}>
          <FadeSlide delay={350}>
            <InputField
              icon="person-outline"
              placeholder="Display name"
              value={name}
              onChangeText={setName}
            />
          </FadeSlide>

          <FadeSlide delay={430}>
            <InputField
              icon="mail-outline"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </FadeSlide>

          <FadeSlide delay={510}>
            <InputField
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </FadeSlide>

          {/* Password requirement */}
          <FadeSlide delay={590}>
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
          </FadeSlide>

          {/* Create button */}
          <FadeSlide delay={670}>
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
          </FadeSlide>
        </View>

        {/* Login */}
        <FadeSlide delay={800}>
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
        </FadeSlide>

        {/* Terms */}
        <FadeSlide delay={880}>
          <Text style={styles.terms}>
            By creating an account, you agree to our Terms and Privacy Policy.
          </Text>
        </FadeSlide>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: "hidden",
  },

  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
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
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 38,
    left: 18,
    zIndex: 10,
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

    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 7,
    },

    elevation: 8,
  },

  backPressed: {
    transform: [{ scale: 0.9 }],
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  body: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === "ios" ? 110 : 90,
    paddingBottom: 22,
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

    shadowColor: COLORS.amber,
    shadowOpacity: 0.9,
    shadowRadius: 8,
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
    marginTop: 24,
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

    marginBottom: 11,
  },

  inputFocused: {
    backgroundColor: COLORS.inputFocused,
    borderColor: "rgba(232,163,61,0.58)",

    shadowColor: COLORS.amber,
    shadowOpacity: 0.13,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 0,
    },
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

    shadowColor: COLORS.teal,
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },

  passwordHintText: {
    color: COLORS.faint,
    fontSize: 11.5,
    fontWeight: "500",
  },

  createButton: {
    height: 54,
    borderRadius: 27,

    marginTop: 13,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 9,

    backgroundColor: COLORS.amber,

    shadowColor: COLORS.amber,
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 9,
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
    marginTop: "auto",
    paddingVertical: 9,
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
