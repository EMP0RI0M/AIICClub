import React from "react";
import {
  View,
  ViewProps,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from "react-native";
import { BlurView, BlurTint } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

export interface GlassViewProps extends ViewProps {
  glassEffectStyle?: "regular" | "clear";
  tintColor?: string;
  isInteractive?: boolean;
  colorScheme?: "auto" | "light" | "dark";
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export interface GlassContainerProps extends ViewProps {
  spacing?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function isLiquidGlassAvailable(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export function isGlassEffectAPIAvailable(): boolean {
  return true;
}

export const GlassView: React.FC<GlassViewProps> = ({
  glassEffectStyle = "regular",
  tintColor,
  colorScheme = "dark",
  intensity = 30,
  isInteractive = false,
  style,
  children,
  ...rest
}) => {
  const isClear = glassEffectStyle === "clear";
  const blurIntensity = isClear ? Math.max(10, intensity - 15) : intensity;
  const blurTint: BlurTint =
    colorScheme === "light"
      ? "light"
      : colorScheme === "dark"
      ? "dark"
      : "dark";

  return (
    <View style={[styles.glassWrapper, style]} {...rest}>
      <BlurView
        intensity={blurIntensity}
        tint={blurTint}
        style={[StyleSheet.absoluteFillObject, styles.blurView]}
      />
      {/* Liquid Reflection Gradient Overlay */}
      <LinearGradient
        colors={
          colorScheme === "light"
            ? ["rgba(255,255,255,0.45)", "rgba(255,255,255,0.1)"]
            : ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.02)"]
        }
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {tintColor && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: tintColor },
          ]}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
};

export const GlassContainer: React.FC<GlassContainerProps> = ({
  spacing,
  style,
  children,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.containerRoot,
        spacing !== undefined && { gap: spacing },
        style,
      ]}
      {...rest}
    >
      <BlurView
        intensity={18}
        tint="dark"
        style={[StyleSheet.absoluteFillObject, styles.blurView]}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {children}
    </View>
  );
};

export interface LiquidGlassCardProps extends ViewProps {
  glowIntensity?: "none" | "sm" | "md" | "lg";
  shadowIntensity?: "none" | "sm" | "md" | "lg";
  borderRadius?: number | string;
  blurIntensity?: "none" | "sm" | "md" | "lg" | number;
  draggable?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  glowIntensity = "sm",
  shadowIntensity = "sm",
  borderRadius = 14,
  blurIntensity = "sm",
  draggable = false,
  style,
  children,
  ...rest
}) => {
  const numericRadius =
    typeof borderRadius === "number"
      ? borderRadius
      : typeof borderRadius === "string" && borderRadius.endsWith("px")
      ? parseInt(borderRadius, 10) || 14
      : 14;

  const calculatedBlur =
    typeof blurIntensity === "number"
      ? blurIntensity
      : blurIntensity === "none"
      ? 0
      : blurIntensity === "sm"
      ? 20
      : blurIntensity === "md"
      ? 30
      : 40;

  const glowBorderColor =
    glowIntensity === "none"
      ? "rgba(255, 255, 255, 0.06)"
      : glowIntensity === "sm"
      ? "rgba(255, 255, 255, 0.08)"
      : glowIntensity === "md"
      ? "rgba(232, 163, 61, 0.22)"
      : "rgba(232, 163, 61, 0.35)";

  const shadowElevation =
    shadowIntensity === "none"
      ? 0
      : shadowIntensity === "sm"
      ? 2
      : shadowIntensity === "md"
      ? 4
      : 6;

  return (
    <View
      style={[
        styles.liquidGlassBase,
        {
          borderRadius: numericRadius,
          borderColor: glowBorderColor,
          elevation: shadowElevation,
        },
        style,
      ]}
      {...rest}
    >
      {calculatedBlur > 0 && (
        <BlurView
          intensity={calculatedBlur}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {/* Specular sheen gradient */}
      <LinearGradient
        colors={[
          "rgba(255, 255, 255, 0.10)",
          "rgba(255, 255, 255, 0.01)",
          glowIntensity === "md" || glowIntensity === "lg"
            ? "rgba(232, 163, 61, 0.05)"
            : "rgba(0, 0, 0, 0.02)",
        ]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Top specular reflection edge highlight */}
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.22)", "rgba(255, 255, 255, 0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topSpecular}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  glassWrapper: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  liquidGlassBase: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  topSpecular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  containerRoot: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  blurView: {
    borderRadius: "inherit" as any,
  },
});
