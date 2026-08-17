import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/auth-store";

const COLORS = {
  bg: "#080A0F",

  amber: "#E8A33D",
  amberLight: "#F3C56B",
  amberDeep: "#C98527",

  teal: "#2DD4BF",

  text: "#F5F7FA",
  muted: "rgba(245,247,250,0.66)",
  faint: "rgba(245,247,250,0.38)",

  glass: "rgba(255,255,255,0.075)",
  glassStrong: "rgba(255,255,255,0.11)",
  border: "rgba(255,255,255,0.12)",
};

function AmbientBackground() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(90)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <LinearGradient
        colors={[
          "rgba(8,10,15,0)",
          "rgba(201,133,39,0.03)",
          "rgba(232,163,61,0.09)",
        ]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.bottomGlow} />
      <View style={styles.tealGlow} />
    </Animated.View>
  );
}

function Glass({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <View style={[styles.glassContainer, style]}>
      <BlurView
        intensity={18}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.glassOverlay} />
      {children}
    </View>
  );
}

function AIICMark() {
  return (
    <View style={styles.brandIcon}>
      <View style={styles.brandRing}>
        <View style={styles.brandEyeRow}>
          <View style={styles.brandEye} />
          <View style={styles.brandEye} />
        </View>
      </View>
    </View>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleG}>G</Text>
    </View>
  );
}

function GitHubIcon() {
  return (
    <Ionicons
      name="logo-github"
      size={21}
      color="#FFFFFF"
    />
  );
}

function LoginButton({
  children,
  onPress,
  variant,
  loading = false,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant: "google" | "github";
  loading?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        disabled={loading}
        onPress={onPress}
        onPressIn={() => {
          Animated.timing(scale, {
            toValue: 0.97,
            duration: 120,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.timing(scale, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }}
        style={[
          styles.providerButton,
          variant === "google" ? styles.googleButton : styles.githubButton,
          loading && { opacity: 0.7 },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === "google" ? "#080A0D" : "#FFFFFF"}
            size="small"
          />
        ) : (
          <>
            {variant === "google" ? <GoogleIcon /> : <GitHubIcon />}
            <Text
              style={[
                styles.providerText,
                variant === "google" ? styles.googleText : styles.githubText,
              ]}
            >
              {children}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function LoginHubScreen() {
  const router = useRouter();
  const { loginWithOAuth, isAuthenticated } = useAuthStore();
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  const brandAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(brandAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleOAuth = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    try {
      await loginWithOAuth(provider);
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        router.replace("/(app)/spaces/space-aiic-main/c-general" as any);
      }
    } catch (err: any) {
      Alert.alert(
        `${provider === "google" ? "Google" : "GitHub"} Sign In`,
        err?.message || "Failed to sign in. Please try again."
      );
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <AmbientBackground />

      <View style={styles.content}>
        {/* Brand + heading */}
        <Animated.View
          style={[
            styles.copy,
            {
              opacity: brandAnim,
              transform: [
                {
                  translateY: brandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Glass style={styles.brandGlass}>
            <AIICMark />
          </Glass>

          <Text style={styles.heading}>
            Take a breath.
          </Text>

          <Text style={styles.subtitle}>
            Sign in and settle into your AIIC space.
          </Text>
        </Animated.View>

        {/* Login sheet */}
        <Animated.View
          style={{
            opacity: sheetAnim,
            transform: [
              {
                translateY: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          }}
        >
          <Glass style={styles.sheet}>
            {/* Google OAuth (Direct via Supabase) */}
            <LoginButton
              variant="google"
              loading={oauthLoading === "google"}
              onPress={() => handleOAuth("google")}
            >
              Continue with Google
            </LoginButton>

            {/* GitHub OAuth (Direct via Supabase) */}
            <LoginButton
              variant="github"
              loading={oauthLoading === "github"}
              onPress={() => handleOAuth("github")}
            >
              Continue with GitHub
            </LoginButton>

            {/* Email Sign In */}
            <Pressable
              onPress={() => router.push("/(auth)/email-login" as any)}
              style={({ pressed }) => [
                styles.emailButton,
                pressed && styles.emailPressed,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={COLORS.text}
              />

              <Text style={styles.emailText}>
                Continue with email
              </Text>
            </Pressable>

            {/* Terms */}
            <Text style={styles.terms}>
              By continuing you agree to our Terms and Privacy Policy.
            </Text>
          </Glass>
        </Animated.View>

        {/* Register */}
        <Pressable
          onPress={() => router.push("/(auth)/register" as any)}
          style={styles.registerButton}
        >
          <Text style={styles.registerNormal}>
            Don't have an account?{" "}
          </Text>

          <Text style={styles.registerLink}>
            Create one
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: "hidden",
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 80 : 58,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
  },

  bottomGlow: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: 250,
    left: -100,
    bottom: -300,
    backgroundColor: "rgba(232,163,61,0.105)",
  },

  tealGlow: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: 165,
    right: -210,
    top: 60,
    backgroundColor: "rgba(45,212,191,0.035)",
  },

  copy: {
    paddingHorizontal: 14,
    marginTop: "auto",
  },

  brandGlass: {
    width: 60,
    height: 60,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },

  brandIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  brandRing: {
    width: 39,
    height: 39,
    borderRadius: 20,
    borderWidth: 3.2,
    borderColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },

  brandEyeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  brandEye: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.amber,
  },

  heading: {
    color: COLORS.text,
    fontSize: 30,
    lineHeight: 35,
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

  glassContainer: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.045)",
  },

  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.055)",
    backgroundColor: "rgba(255,255,255,0.018)",
  },

  sheet: {
    marginTop: 20,
    padding: 14,
    borderRadius: 28,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.38,
    shadowRadius: 35,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    elevation: 14,
  },

  providerButton: {
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  googleButton: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  githubButton: {
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  providerText: {
    fontSize: 14.5,
    fontWeight: "600",
  },

  googleText: {
    color: "#292824",
  },

  githubText: {
    color: "#FFFFFF",
  },

  googleIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  googleG: {
    color: "#4285F4",
    fontSize: 18,
    fontWeight: "800",
  },

  emailButton: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.065)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  emailPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: "rgba(255,255,255,0.105)",
  },

  emailText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },

  terms: {
    marginTop: 1,
    textAlign: "center",
    color: "rgba(245,247,250,0.48)",
    fontSize: 9.5,
    lineHeight: 15,
    fontWeight: "500",
  },

  registerButton: {
    alignSelf: "center",
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginTop: 7,
  },

  registerNormal: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "500",
  },

  registerLink: {
    color: COLORS.amberLight,
    fontSize: 13,
    fontWeight: "700",
  },
});
