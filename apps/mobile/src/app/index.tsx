import React, { useEffect, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../stores/auth-store";

const COLORS = {
  background: "#07090D",
  surface: "rgba(18, 22, 30, 0.72)",
  surfaceStrong: "rgba(24, 29, 39, 0.88)",

  amber: "#E8A33D",
  amberLight: "#F3C56B",
  amberGlow: "rgba(232, 163, 61, 0.35)",

  teal: "#2DD4BF",
  tealGlow: "rgba(45, 212, 191, 0.22)",

  white: "#FFFFFF",
  text: "#F5F7FA",
  muted: "rgba(245, 247, 250, 0.68)",
  border: "rgba(255, 255, 255, 0.10)",
};

function PulsingAIICLogo() {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 900,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 1.15,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.7,
            duration: 2200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulse, glow, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.logoWrap,
        {
          opacity,
          transform: [{ scale: pulse }, { translateY }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.logoHalo,
          {
            transform: [{ scale: glow }],
          },
        ]}
      />

      <View style={styles.logoGlassOrb}>
        <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.16)", "rgba(232, 163, 61, 0.12)", "rgba(255, 255, 255, 0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={require("../../assets/aiic-logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

function AnimatedText({
  children,
  delay,
  style,
}: {
  children: React.ReactNode;
  delay: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <Text style={style}>{children}</Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { height } = useWindowDimensions();

  const gradientProgress = useRef(new Animated.Value(0)).current;
  const loginOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(gradientProgress, {
      toValue: 1,
      duration: 1100,
      delay: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.timing(loginOpacity, {
      toValue: 1,
      duration: 500,
      delay: 1500,
      useNativeDriver: true,
    }).start();
  }, []);

  const gradientTranslateY = gradientProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push("/(app)/spaces/space-aiic-main/c-general" as any);
    } else {
      router.push("/(auth)/register" as any);
    }
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      router.push("/(app)/spaces/space-aiic-main/c-general" as any);
    } else {
      router.push("/(auth)/login" as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Ambient background & Glowing Orbs for Refraction */}
      <View style={styles.backgroundBase} />

      <Animated.View
        style={[
          styles.ambientGradient,
          {
            transform: [{ translateY: gradientTranslateY }],
          },
        ]}
      >
        <View style={styles.amberAmbient} />
        <View style={styles.tealAmbient} />
        <View style={styles.purpleAmbient} />
      </Animated.View>

      {/* Pulsing AIIC Logo */}
      <PulsingAIICLogo />

      {/* Floating Liquid Glass Card */}
      <View style={styles.content}>
        <View style={styles.glassCardWrapper}>
          <BlurView intensity={Platform.OS === "ios" ? 40 : 25} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[
              "rgba(255, 255, 255, 0.14)",
              "rgba(255, 255, 255, 0.03)",
              "rgba(232, 163, 61, 0.06)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <AnimatedText delay={1050} style={styles.title}>
            Welcome to AIIC
          </AnimatedText>

          <AnimatedText delay={1150} style={styles.subtitle}>
            A space to connect, collaborate, and build together.
          </AnimatedText>

          <View style={styles.actions}>
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.buttonSpecular}
              />
              <Text style={styles.primaryButtonText}>
                {isAuthenticated ? "Open Workspace" : "Get started"}
              </Text>
            </Pressable>

            <Animated.View style={{ opacity: loginOpacity }}>
              <Pressable
                onPress={handleLogin}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.loginButtonPressed,
                ]}
              >
                <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                <Text style={styles.loginText}>
                  {isAuthenticated ? "Enter as logged in" : "I already have an account"}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },

  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
  },

  ambientGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  amberAmbient: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    top: -120,
    left: -90,
    backgroundColor: "rgba(232, 163, 61, 0.13)",
  },

  tealAmbient: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    bottom: -170,
    right: -120,
    backgroundColor: "rgba(45, 212, 191, 0.09)",
  },

  purpleAmbient: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    top: "35%",
    right: -80,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },

  logoWrap: {
    position: "absolute",
    top: "14%",
    alignSelf: "center",
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
  },

  logoHalo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.amberGlow,
    opacity: 0.65,
  },

  logoGlassOrb: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: "rgba(21, 26, 34, 0.75)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.20)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    shadowColor: "#E8A33D",
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 18,
  },

  logoImage: {
    width: "100%",
    height: "100%",
  },

  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  glassCardWrapper: {
    borderRadius: 32,
    overflow: "hidden",
    padding: 24,
    backgroundColor: "rgba(18, 22, 30, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },

  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },

  actions: {
    marginTop: 20,
    gap: 10,
  },

  primaryButton: {
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    shadowColor: COLORS.amber,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  buttonSpecular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },

  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },

  primaryButtonText: {
    color: "#101114",
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  loginButton: {
    minHeight: 46,
    borderRadius: 23,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  loginButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  loginText: {
    color: "rgba(245, 247, 250, 0.88)",
    fontSize: 14,
    fontWeight: "600",
  },
});
