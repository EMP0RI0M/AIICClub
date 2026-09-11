import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/tokens";

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
  const blurIntensity =
    intensity === "low" ? 18 : intensity === "high" ? 40 : 28;

  return (
    <View
      style={[
        styles.base,
        elevated && styles.elevated,
        style,
      ]}
      {...props}
    >
      <BlurView
        intensity={blurIntensity}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={
          elevated
            ? ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.02)"]
            : ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]
        }
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  elevated: {
    borderColor: "rgba(212, 160, 23, 0.35)",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
});
