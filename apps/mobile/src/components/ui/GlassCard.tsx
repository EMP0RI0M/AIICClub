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
      {/* Specular sheen gradient mirroring Glasscord */}
      <LinearGradient
        colors={
          elevated
            ? [
                "rgba(255, 255, 255, 0.18)",
                "rgba(255, 255, 255, 0.04)",
                "rgba(232, 163, 61, 0.08)",
              ]
            : [
                "rgba(255, 255, 255, 0.12)",
                "rgba(255, 255, 255, 0.02)",
                "rgba(0, 0, 0, 0.05)",
              ]
        }
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Top inner specular highlight line */}
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.30)", "rgba(255, 255, 255, 0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topInnerShine}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    borderColor: "rgba(232, 163, 61, 0.22)",
    backgroundColor: "rgba(232, 163, 61, 0.04)",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  topInnerShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});
