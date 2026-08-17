import React from "react";
import { Stack } from "expo-router";
import { colors } from "../../theme/tokens";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "none",
      }}
    >
      <Stack.Screen name="spaces/[spaceId]/[channelId]" />
      <Stack.Screen name="dms/index" />
      <Stack.Screen name="projects/index" />
      <Stack.Screen name="events/index" />
      <Stack.Screen name="profile/index" />
      <Stack.Screen name="admin/index" />
      <Stack.Screen name="archive/index" />
    </Stack>
  );
}
