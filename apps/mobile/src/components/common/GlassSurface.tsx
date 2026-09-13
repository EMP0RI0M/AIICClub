import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

export function GlassSurface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.root, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor:
      'rgba(17,19,23,0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor:
      'rgba(255,255,255,0.10)',
    borderRadius: 18,
    overflow: 'hidden',
  },
});
