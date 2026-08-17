import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  PressableProps,
} from "react-native";
import { colors, radius, typography } from "../../theme/tokens";

interface ButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  style,
  textStyle,
  disabled,
  ...props
}) => {
  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        pressed && styles[`pressed_${variant}`],
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? colors.accentContrast : colors.accent}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              icon ? { marginLeft: 8 } : null,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.danger,
  },
  pressed_primary: {
    backgroundColor: colors.accentPressed,
  },
  pressed_secondary: {
    backgroundColor: colors.surfaceOverlay,
  },
  pressed_outline: {
    backgroundColor: colors.accentSoft,
  },
  pressed_ghost: {
    backgroundColor: colors.hoverRow,
  },
  pressed_danger: {
    backgroundColor: colors.dangerDim,
  },
  disabled: {
    opacity: 0.5,
  },
  size_sm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radius.lg,
  },
  text: {
    fontWeight: "600",
  },
  text_primary: {
    color: colors.accentContrast,
  },
  text_secondary: {
    color: colors.textPrimary,
  },
  text_outline: {
    color: colors.accent,
  },
  text_ghost: {
    color: colors.textSecondary,
  },
  text_danger: {
    color: "#FFFFFF",
  },
  textSize_sm: {
    fontSize: 12,
  },
  textSize_md: {
    fontSize: 14,
  },
  textSize_lg: {
    fontSize: 16,
  },
});
