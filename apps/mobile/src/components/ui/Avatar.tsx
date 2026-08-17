import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { colors, radius } from "../../theme/tokens";
import { Presence } from "../../lib/types";

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
  presence?: Presence;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  url,
  size = 36,
  presence,
}) => {
  const initial = (name || "?").charAt(0).toUpperCase();

  const getPresenceColor = (p: Presence) => {
    switch (p) {
      case "online":
        return colors.statusOnline;
      case "idle":
        return colors.statusIdle;
      case "dnd":
        return colors.statusDnd;
      default:
        return colors.statusOffline;
    }
  };

  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
        </View>
      )}

      {presence && (
        <View
          style={[
            styles.presenceIndicator,
            {
              backgroundColor: getPresenceColor(presence),
              width: Math.max(8, size * 0.28),
              height: Math.max(8, size * 0.28),
              borderRadius: size,
              borderWidth: 2,
              borderColor: colors.background,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceRaised,
  },
  fallback: {
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  presenceIndicator: {
    position: "absolute",
    bottom: -1,
    right: -1,
  },
});
