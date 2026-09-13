import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

type RoundBackButtonProps = {
  onPress?: () => void;
};

/**
 * RoundBackButton — 36×36 circular translucent glass button
 * with a left-facing chevron arrow.
 * Uses the user-provided design: rgba(255,255,255,0.42) background,
 * subtle inner glass border, scale-down press feedback.
 */
export function RoundBackButton({ onPress }: RoundBackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.glass}>
        {/* Left-facing chevron */}
        <Svg width={17} height={17} viewBox="0 0 24 24">
          <Path
            d="M14.3 4.6a1.35 1.35 0 0 1 0 1.92L8.8 12l5.5 5.48a1.35 1.35 0 1 1-1.9 1.92l-6.5-6.44a1.35 1.35 0 0 1 0-1.92l6.5-6.44a1.35 1.35 0 0 1 1.9 0Z"
            fill="#e6dff8"
          />
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    shadowColor: "#1e1e28",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },
  glass: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  pressed: {
    transform: [{ scale: 0.88 }],
  },
});
