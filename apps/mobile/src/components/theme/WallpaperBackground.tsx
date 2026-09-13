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

      {/* 3. Fluid Atmospheric Refraction Fields (Subtle Violet/Blue, Amber, Cyan) */}
      <View style={styles.fogContainer} pointerEvents="none">
        {/* Upper-left/center subtle violet/blue fog */}
        <LinearGradient
          colors={[ambientOrb1 || "rgba(99, 102, 241, 0.05)", "rgba(99, 102, 241, 0.015)", "transparent"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.ambientFogViolet}
        />

        {/* Upper-right subtle amber/theme accent fog */}
        <LinearGradient
          colors={[ambientOrb2 || "rgba(242, 170, 59, 0.045)", "rgba(242, 170, 59, 0.01)", "transparent"]}
          start={{ x: 0.8, y: 0.1 }}
          end={{ x: 0.1, y: 0.9 }}
          style={styles.ambientFogAmber}
        />

        {/* Lower-left/center subtle cyan fog */}
        <LinearGradient
          colors={["rgba(50, 214, 197, 0.038)", "rgba(50, 214, 197, 0.01)", "transparent"]}
          start={{ x: 0.1, y: 0.8 }}
          end={{ x: 0.9, y: 0.1 }}
          style={styles.ambientFogCyan}
        />
      </View>

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
  fogContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  ambientFogViolet: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 220,
    top: -100,
    left: -100,
  },
  ambientFogAmber: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    top: 20,
    right: -100,
  },
  ambientFogCyan: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    bottom: -40,
    left: -80,
  },
});
