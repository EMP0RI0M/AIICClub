import React, { useEffect, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../stores/auth-store";

const COLORS = {
  background: "#07090D",
  surface: "rgba(18, 22, 30, 0.72)",
  surfaceStrong: "rgba(24, 29, 39, 0.88)",

  amber: "#E8A33D",
  amberLight: "#F3C56B",
  amberGlow: "rgba(232, 163, 61, 0.32)",

  teal: "#2DD4BF",
  tealGlow: "rgba(45, 212, 191, 0.22)",

  white: "#FFFFFF",
  text: "#F5F7FA",
  muted: "rgba(245, 247, 250, 0.68)",
  border: "rgba(255, 255, 255, 0.10)",
};

function CalmOrb() {
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.055,
          duration: 2100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  return (
    <Animated.View
      style={[
        styles.orbBreathe,
        {
          transform: [{ scale: breathe }],
        },
      ]}
    >
      <View style={styles.orbHalo} />

      <View style={styles.orb}>
        <View style={styles.orbHighlight} />

        <View style={styles.face}>
          <View style={[styles.eye, styles.eyeLeft]} />
          <View style={[styles.eye, styles.eyeRight]} />

          <View style={styles.faceCenterDot} />
        </View>

        <View style={[styles.blush, styles.blushLeft]} />
        <View style={[styles.blush, styles.blushRight]} />
      </View>
    </Animated.View>
  );
}

function AnimatedOrb() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.55)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay: 150,
        friction: 6,
        tension: 40,
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
  }, []);

  return (
    <Animated.View
      style={[
        styles.orbWrap,
        {
          opacity,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      <CalmOrb />
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
      {/* Ambient background */}
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
      </Animated.View>

      {/* Top glass layer */}
      <View pointerEvents="none" style={styles.topGlass} />

      {/* AIIC Orb */}
      <AnimatedOrb />

      {/* Main content */}
      <View style={styles.content}>
        <AnimatedText delay={1050} style={styles.title}>
          Welcome to AIIC
        </AnimatedText>

        <AnimatedText delay={1150} style={styles.subtitle}>
          A space to connect,
          {"\n"}
          collaborate, and build together.
        </AnimatedText>

        <View style={styles.actions}>
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
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
              <Text style={styles.loginText}>
                {isAuthenticated ? "Enter as logged in" : "I already have an account"}
              </Text>
            </Pressable>
          </Animated.View>
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

  topGlass: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: "rgba(255,255,255,0.018)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.035)",
  },

  orbWrap: {
    position: "absolute",
    top: "13%",
    alignSelf: "center",
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
  },

  orbBreathe: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
  },

  orbHalo: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: COLORS.amberGlow,
    opacity: 0.75,
  },

  orb: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: "#151A22",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",

    shadowColor: "#E8A33D",
    shadowOpacity: 0.32,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 18,
    },

    elevation: 18,
  },

  orbHighlight: {
    position: "absolute",
    top: 14,
    left: 25,
    width: 66,
    height: 28,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.10)",
    transform: [{ rotate: "-14deg" }],
  },

  face: {
    position: "absolute",
    inset: 0,
  },

  eye: {
    position: "absolute",
    top: 58,
    width: 25,
    height: 10,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.amberLight,
    borderRadius: 20,
  },

  eyeLeft: {
    left: 36,
    transform: [{ rotate: "12deg" }],
  },

  eyeRight: {
    right: 36,
    transform: [{ rotate: "-12deg" }],
  },

  faceCenterDot: {
    position: "absolute",
    top: 52,
    left: "50%",
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
    shadowColor: COLORS.teal,
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },

  blush: {
    position: "absolute",
    top: 76,
    width: 17,
    height: 7,
    borderRadius: 10,
    backgroundColor: "rgba(232,163,61,0.20)",
  },

  blushLeft: {
    left: 27,
  },

  blushRight: {
    right: 27,
  },

  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingBottom: 34,
  },

  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 35,
    letterSpacing: -0.6,

    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 12,
  },

  subtitle: {
    marginTop: 12,
    maxWidth: "88%",
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },

  actions: {
    marginTop: 24,
  },

  primaryButton: {
    height: 54,
    borderRadius: 27,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.amber,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",

    shadowColor: COLORS.amber,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 8,
  },

  primaryButtonPressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.9,
  },

  primaryButtonText: {
    color: "#101114",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  loginButton: {
    marginTop: 14,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  loginButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.98 }],
  },

  loginText: {
    color: "rgba(245,247,250,0.78)",
    fontSize: 13.5,
    fontWeight: "600",
  },
});
