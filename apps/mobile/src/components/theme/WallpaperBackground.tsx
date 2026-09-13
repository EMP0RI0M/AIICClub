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

      {/* 3. Fluid Ambient Refraction Orbs */}
      <View
        style={[
          styles.ambientOrbTop,
          { backgroundColor: ambientOrb1 || "rgba(232, 163, 61, 0.08)" },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.ambientOrbBottom,
          { backgroundColor: ambientOrb2 || "rgba(168, 85, 247, 0.05)" },
        ]}
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
    backgroundColor: "#07090E",
  },
  ambientOrbTop: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    top: -40,
    left: -100,
  },
  ambientOrbBottom: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: 60,
    right: -90,
  },
});
