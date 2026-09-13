import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatAvatarUrl } from '@/lib/avatar';

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

function getInitials(name?: string | null) {
  const value = name?.trim();
  if (!value) return '?';

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
}

export function Avatar({
  uri,
  name,
  size = 40,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  const formatted = uri ? formatAvatarUrl(uri) : null;
  const validUri =
    typeof formatted === 'string' &&
    formatted.trim().length > 0;

  const showImage =
    validUri && !imageFailed;

  return (
    <View
      style={[
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: formatted! }}
          onError={() => setImageFailed(true)}
          style={[
            StyleSheet.absoluteFillObject,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <Text style={styles.initials}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  initials: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '700',
  },
});
