import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { colors } from '../../theme/tokens';
import { sanitizeAIResponse } from '../../lib/chat/sanitizeAIResponse';

export function AIMessage({
  content,
}: {
  content: string;
}) {
  const clean = sanitizeAIResponse(content);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(232, 163, 61, 0.08)", "rgba(255, 255, 255, 0.02)"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.header}>
        <View style={styles.badge}>
          <Sparkles size={11} color={colors.accent} />
          <Text style={styles.label}>CORVUS AI</Text>
        </View>
      </View>

      <Text style={styles.text}>{clean}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '100%',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.22)',
    backgroundColor: 'rgba(14, 16, 24, 0.75)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(232, 163, 61, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.25)',
  },
  label: {
    color: colors.accent,
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.8,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
});
