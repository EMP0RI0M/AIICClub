import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Brain, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '../../theme/tokens';
import { parseAIResponse } from '../../lib/chat/sanitizeAIResponse';
import { NativeHaptics } from '../../lib/haptics';

export function AIMessage({
  content,
}: {
  content: string;
}) {
  const { clean, reasoning } = parseAIResponse(content);
  const [isOrbOpen, setIsOrbOpen] = useState(false);

  const toggleOrb = () => {
    NativeHaptics.impactLight();
    setIsOrbOpen(prev => !prev);
  };

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

        {/* Floating Transparent Orb Pill for Reasoning Trace */}
        {reasoning ? (
          <TouchableOpacity
            onPress={toggleOrb}
            activeOpacity={0.7}
            style={[
              styles.reasoningOrb,
              isOrbOpen && styles.reasoningOrbActive,
            ]}
          >
            <View style={styles.orbInnerGlow}>
              <Brain size={11} color={isOrbOpen ? colors.accent : "rgba(232, 163, 61, 0.85)"} />
              <Text style={styles.orbText}>Thought Trace</Text>
              {isOrbOpen ? (
                <ChevronUp size={10} color={colors.accent} />
              ) : (
                <ChevronDown size={10} color="rgba(255, 255, 255, 0.5)" />
              )}
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Expanded Reasoning Tray (Glass Orb Reveal) */}
      {reasoning && isOrbOpen ? (
        <View style={styles.reasoningTray}>
          <LinearGradient
            colors={["rgba(232, 163, 61, 0.06)", "rgba(10, 11, 17, 0.6)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.reasoningTrayHeader}>
            <Text style={styles.reasoningTrayTitle}>INTERNAL REASONING</Text>
          </View>
          <ScrollView
            nestedScrollEnabled
            style={styles.reasoningScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.reasoningContent}>{reasoning}</Text>
          </ScrollView>
        </View>
      ) : null}

      {/* Main Clean AI Output */}
      <Text style={styles.text}>{clean || content}</Text>
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
    justifyContent: 'space-between',
    marginBottom: 10,
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
  // Transparent Orb Pill
  reasoningOrb: {
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    overflow: 'hidden',
  },
  reasoningOrbActive: {
    backgroundColor: 'rgba(232, 163, 61, 0.15)',
    borderColor: colors.accent,
  },
  orbInnerGlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
  },
  orbText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
  // Expanded Reasoning Tray
  reasoningTray: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.2)',
    backgroundColor: 'rgba(7, 8, 13, 0.7)',
    padding: 10,
    maxHeight: 180,
    overflow: 'hidden',
  },
  reasoningTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reasoningTrayTitle: {
    color: colors.accent,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    fontFamily: 'monospace',
  },
  reasoningScroll: {
    maxHeight: 140,
  },
  reasoningContent: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: 'monospace',
  },
  text: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
});
