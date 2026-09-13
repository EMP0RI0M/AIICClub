import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors, useAppTheme } from "../../theme/tokens";
import { Presence } from "../../lib/types";
import { resolveUserAvatar } from "../../lib/avatar";

export interface AvatarProps {
  name?: string | null;
  url?: string | null;
  user?: any;
  size?: number;
  presence?: Presence;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  url,
  user,
  size = 36,
  presence,
}) => {
  const theme = useAppTheme();
  const [loadError, setLoadError] = useState(false);
  const displayName = name || user?.displayName || user?.username || "?";
  const initial = displayName.charAt(0).toUpperCase() || "?";
  const formattedUrl = resolveUserAvatar(url || user);

  useEffect(() => {
    setLoadError(false);
  }, [formattedUrl]);

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
      {formattedUrl && !loadError ? (
        <Image
          source={{ uri: formattedUrl }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => {
            setLoadError(true);
          }}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.accentSoft,
              borderColor: theme.colors.accentBorder,
            },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.42, color: theme.colors.accent }]}>{initial}</Text>
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontWeight: "700",
  },
  presenceIndicator: {
    position: "absolute",
    bottom: -1,
    right: -1,
  },
});
