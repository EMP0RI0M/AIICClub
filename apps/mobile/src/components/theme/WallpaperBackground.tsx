import React, { useEffect } from "react";
import { View, StyleSheet, Image, StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeStore } from "../../stores/theme-store";

interface WallpaperBackgroundProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function WallpaperBackground({ children, style }: WallpaperBackgroundProps) {
  const {
    wallpaperMode,
    gradientColors,
    gradientDirection,
    wallpaperUrl,
    overlayOpacity,
    ambientOrb1,
    ambientOrb2,
    loadTheme,
    isLoaded,
  } = useThemeStore();

  useEffect(() => {
    if (!isLoaded) {
      loadTheme();
    }
  }, [isLoaded]);

  // Compute start / end coordinates for the LinearGradient
  const gradientPoints = (() => {
    switch (gradientDirection) {
      case "horizontal":
        return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
      case "diagonal":
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
      case "vertical":
      default:
        return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
    }
  })();

  return (
    <View style={[styles.container, style]}>
      {/* 1. Base Gradient Background */}
      <LinearGradient
        colors={gradientColors}
        start={gradientPoints.start}
        end={gradientPoints.end}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Custom Image Wallpaper (if enabled) */}
      {wallpaperMode === "image" && !!wallpaperUrl.trim() && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Image
            source={{ uri: wallpaperUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: `rgba(4, 6, 12, ${overlayOpacity})` },
            ]}
          />
        </View>
      )}

      {/* 3. Fluid Atmospheric Refraction Orbs (Subtle Navy, Amber, Cyan) */}
      <View
        style={[
          styles.ambientOrbTop,
          { backgroundColor: ambientOrb1 || "rgba(91, 156, 255, 0.04)" },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.ambientOrbAmber,
          { backgroundColor: ambientOrb2 || "rgba(242, 170, 59, 0.04)" },
        ]}
        pointerEvents="none"
      />
      <View
        style={styles.ambientOrbCyan}
        pointerEvents="none"
      />

      {/* 4. Screen Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080A0F",
  },
  ambientOrbTop: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    top: -60,
    left: -80,
  },
  ambientOrbAmber: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: 40,
    right: -80,
  },
  ambientOrbCyan: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: 60,
    left: -70,
    backgroundColor: "rgba(50, 214, 197, 0.03)",
  },
});
