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

const styles = StyleSheet.create({
  glassWrapper: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  containerRoot: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  blurView: {
    borderRadius: "inherit" as any,
  },
});
