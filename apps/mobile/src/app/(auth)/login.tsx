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
  borderStrong: "rgba(255,255,255,0.16)",

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
  autoCapitalize = "none",
  autoCorrect = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
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
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={COLORS.amber}
      />
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ready =
    email.includes("@") &&
    email.includes(".") &&
    password.length >= 6;

  const handleSignIn = async () => {
    if (!ready) return;
    setError(null);
    try {
      await login(email, password);
      router.replace("/(app)/spaces/space-aiic-main/c-general" as any);
    } catch (err: any) {
      setError(err?.message || "Invalid credentials or sign-in failed.");
    }
  };

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
      <FadeSlide delay={300} style={styles.backWrapper}>
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
        <FadeSlide delay={200}>
          <View>
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
        </FadeSlide>

        {/* Error message */}
        {error ? (
          <FadeSlide delay={350} style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </FadeSlide>
        ) : null}

        {/* Form */}
        <View style={styles.form}>
          <FadeSlide delay={420}>
            <InputField
              icon="mail-outline"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </FadeSlide>

          <FadeSlide delay={500}>
            <InputField
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </FadeSlide>

          <FadeSlide delay={580}>
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
          </FadeSlide>

          <FadeSlide delay={660}>
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
          </FadeSlide>
        </View>

        {/* Create account */}
        <FadeSlide delay={800}>
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
    borderColor: COLORS.border,

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
    paddingTop: Platform.OS === "ios" ? 125 : 105,
    paddingBottom: 30,
  },

  smallBrand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
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
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
    maxWidth: 310,
  },

  errorContainer: {
    marginTop: 12,
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

    marginBottom: 12,
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

  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 7,
    paddingHorizontal: 2,
  },

  forgotText: {
    color: COLORS.amberLight,
    fontSize: 12.5,
    fontWeight: "600",
  },

  signInButton: {
    height: 54,
    borderRadius: 27,

    marginTop: 9,

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
    marginTop: "auto",
    alignSelf: "center",

    flexDirection: "row",
    paddingVertical: 12,
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
