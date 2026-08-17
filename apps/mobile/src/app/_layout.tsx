import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { useAuthStore } from "../stores/auth-store";
import { colors } from "../theme/tokens";

export default function RootLayout() {
  const { isAuthenticated, isRestoring, restoreSession, handleOAuthCallback } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, []);

  // Global Native Deep Link Listener for OAuth callback (aiic://auth/callback)
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (url && (url.startsWith("aiic://auth/callback") || url.includes("auth/callback"))) {
        console.log("[AIIC OAuth] Deep link received:", url);
        const success = await handleOAuthCallback(url);
        if (success) {
          router.replace("/(app)/spaces/space-aiic-main/c-general");
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
  }, []);

  useEffect(() => {
    if (isRestoring) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (isAuthenticated && inAuthGroup) {
      // User is authenticated and on login screen
      router.replace("/(app)/spaces/space-aiic-main/c-general");
    }
  }, [isAuthenticated, isRestoring, segments]);

  if (isRestoring) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
