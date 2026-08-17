import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { colors, radius } from "../../theme/tokens";

interface GlassCardProps extends ViewProps {
  elevated?: boolean;
  intensity?: "low" | "medium" | "high";
  children?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  elevated = false,
  intensity = "medium",
  style,
  children,
  ...props
}) => {
  const bgOpacity =
    intensity === "low"
      ? "rgba(17, 18, 25, 0.65)"
      : intensity === "high"
      ? "rgba(23, 24, 33, 0.95)"
      : "rgba(17, 18, 25, 0.85)";

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bgOpacity },
        elevated && styles.elevated,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    overflow: "hidden",
  },
  elevated: {
    borderColor: colors.borderHighlight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
});
