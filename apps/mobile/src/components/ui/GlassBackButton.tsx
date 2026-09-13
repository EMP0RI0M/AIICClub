import React from "react";
import { Pressable, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";

export interface GlassBackButtonProps {
  onPress?: () => void;
  fallbackRoute?: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function GlassBackButton({
  onPress,
  fallbackRoute,
  size = 40,
  iconSize = 18,
  style,
}: GlassBackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    NativeHaptics.light();
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else if (fallbackRoute) {
      router.replace(fallbackRoute as any);
    } else {
      router.replace("/(app)/spaces/space-aiic-main/c-general" as any);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: 14,
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <ArrowLeft size={iconSize} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
});
