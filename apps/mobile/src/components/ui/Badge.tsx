import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius } from "../../theme/tokens";

interface BadgeProps {
  label: string;
  variant?: "primary" | "teal" | "success" | "warning" | "danger" | "muted";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "primary",
  size = "sm",
}) => {
  const getStyles = () => {
    switch (variant) {
      case "teal":
        return { bg: colors.accentTealSoft, border: colors.accentTealDim, text: colors.accentTeal };
      case "success":
        return { bg: colors.successSoft, border: colors.successDim, text: colors.success };
      case "warning":
        return { bg: colors.warningSoft, border: colors.warning, text: colors.warning };
      case "danger":
        return { bg: colors.dangerSoft, border: colors.dangerDim, text: colors.danger };
      case "muted":
        return { bg: colors.hoverRow, border: colors.border, text: colors.textSecondary };
      default:
        return { bg: colors.accentSoft, border: colors.accentMuted, text: colors.accent };
    }
  };

  const styleConfig = getStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: styleConfig.bg,
          borderColor: styleConfig.border,
        },
        size === "md" && styles.badgeMd,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: styleConfig.text },
          size === "md" && styles.textMd,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.xs,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeMd: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textMd: {
    fontSize: 12,
  },
});
