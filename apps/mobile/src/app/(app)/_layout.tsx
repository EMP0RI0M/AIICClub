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
    />
  );
}
