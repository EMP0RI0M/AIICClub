import React from "react";
import { Stack } from "expo-router";
import { colors } from "../../theme/tokens";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        animation: "none",
      }}
    >
      <Stack.Screen name="spaces/[spaceId]/[channelId]" />
      <Stack.Screen name="dms/index" />
      <Stack.Screen name="dms/[id]" />
      <Stack.Screen name="voice/[id]" />
      <Stack.Screen name="profile/index" />
      <Stack.Screen name="profile/settings" />
      <Stack.Screen name="admin/index" />
      <Stack.Screen name="archive/index" />
      <Stack.Screen name="projects/index" />
      <Stack.Screen name="projects/[slug]" />
      <Stack.Screen name="events/index" />
      <Stack.Screen name="events/[slug]" />
      <Stack.Screen name="notices/index" />
      <Stack.Screen name="notifications/index" />
      <Stack.Screen name="people/index" />
      <Stack.Screen name="docs/[id]" />
      <Stack.Screen name="boards/[id]" />
      <Stack.Screen name="github/[id]" />
      <Stack.Screen name="incidents/[id]" />
      <Stack.Screen name="achievements/index" />
    </Stack>
  );
}
