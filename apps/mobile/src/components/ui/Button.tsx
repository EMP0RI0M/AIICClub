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
import { colors, radius, useAppTheme } from "../../theme/tokens";

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
  const theme = useAppTheme();

  const dynamicVariantStyle = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: pressed ? theme.colors.accentPressed : theme.colors.accent,
        };
      case "outline":
        return {
          backgroundColor: pressed ? theme.colors.accentSoft : "transparent",
          borderColor: theme.colors.accent,
          borderWidth: 1,
        };
      case "secondary":
        return {
          backgroundColor: pressed ? colors.surfaceOverlay : colors.surfaceRaised,
          borderWidth: 1,
          borderColor: colors.borderHighlight,
        };
      case "ghost":
        return {
          backgroundColor: pressed ? colors.hoverRow : "transparent",
        };
      case "danger":
        return {
          backgroundColor: pressed ? colors.dangerDim : colors.danger,
        };
      default:
        return {};
    }
  };

  const dynamicTextColor = (): string => {
    switch (variant) {
      case "primary":
        return theme.colors.accentText;
      case "outline":
        return theme.colors.accent;
      case "secondary":
        return colors.textPrimary;
      case "ghost":
        return colors.textSecondary;
      case "danger":
        return "#FFFFFF";
      default:
        return colors.textPrimary;
    }
  };

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        dynamicVariantStyle(pressed),
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? theme.colors.accentText : theme.colors.accent}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.text,
              styles[`textSize_${size}`],
              { color: dynamicTextColor() },
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
    borderRadius: radius.button,
  },
  disabled: {
    opacity: 0.5,
  },
  size_sm: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  size_lg: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 18,
  },
  text: {
    fontWeight: "600",
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
