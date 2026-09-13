import React, { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { useAuthStore } from "../stores/auth-store";
import { colors } from "../theme/tokens";
import { NotificationBanner } from "../components/ui/NotificationBanner";
import { IncomingCallModal } from "../components/call/IncomingCallModal";
import { globalCallSignaling } from "../lib/call-signaling";
import { WallpaperBackground } from "../components/theme/WallpaperBackground";

export default function RootLayout() {
  const { user, isAuthenticated, isRestoring, restoreSession, handleOAuthCallback } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const routerMounted = Boolean(rootNavigationState?.key);
  const redirectIssued = useRef(false);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Global Realtime Call Signaling & Tier 3 E2EE Key Initialization
  useEffect(() => {
    if (user?.id) {
      globalCallSignaling.subscribe(user.id, (user as any).auth_user_id);
      import("../lib/e2ee")
        .then(({ e2ee }) => e2ee.initialize(user.id))
        .catch((err) => console.warn("[RootLayout] E2EE Init Error:", err));
    }
    return () => {
      globalCallSignaling.unsubscribe();
    };
  }, [user?.id]);

  // Global Native Deep Link Listener for OAuth callback & HTTPS App Links (/join, /invite)
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (!url) return;

      // 1. OAuth Deep Link
      if (
        url.startsWith("aiic://auth/callback") ||
        url.includes("auth/callback") ||
        url.includes("access_token=") ||
        url.includes("code=")
      ) {
        console.log("[AIIC OAuth] Deep link received:", url);
        const success = await handleOAuthCallback(url);
        if (success) {
          router.replace("/(app)/spaces/space-aiic-main/c-general");
        }
        return;
      }

      // 2. Android App Links & Custom Scheme Join Links
      const parsed = Linking.parse(url);
      const path = parsed.path || "";

      if (path.startsWith("join/") || path.startsWith("invite/")) {
        const parts = path.split("/");
        const code = parts[1];
        if (code) {
          console.log("[AIIC AppLink] Navigating to invite code:", code);
          router.push({ pathname: "/join/[code]", params: { code } });
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleOAuthCallback, router, routerMounted]);

  useEffect(() => {
    if (isRestoring || !routerMounted || !segments[0]) return;

    const inAppGroup = segments[0] === "(app)";

    if (isAuthenticated && !inAppGroup && !redirectIssued.current) {
      // User is authenticated, ensure they are inside the main app
      redirectIssued.current = true;
      router.replace("/(app)/spaces/space-aiic-main/c-general");
    }
  }, [isAuthenticated, isRestoring, routerMounted, router, segments]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <WallpaperBackground>
        <NotificationBanner />
        <IncomingCallModal />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
        {isRestoring && (
          <View style={styles.loadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </WallpaperBackground>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    opacity: 0.96,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
});
