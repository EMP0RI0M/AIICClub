import React from "react";
import { Pressable, StyleSheet, StyleProp, ViewStyle } from "react-native";

type RoundIconButtonProps = {
  onPress?: () => void;
  children: React.ReactNode;
  hitSlop?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * RoundIconButton — 36×36 circular translucent glass button for header icons.
 * Matches RoundBackButton's glass language but slightly darker for icon buttons
 * (three-dot, refresh, etc.) so they read as secondary to the back button.
 */
export function RoundIconButton({ onPress, children, hitSlop = 6, size = 36, style }: RoundIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.button, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    shadowColor: "#1e1e28",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  pressed: {
    transform: [{ scale: 0.88 }],
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
});
