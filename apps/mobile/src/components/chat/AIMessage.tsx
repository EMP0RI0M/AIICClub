import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { sanitizeAIResponse } from '../../lib/chat/sanitizeAIResponse';

export function AIMessage({
  content,
}: {
  content: string;
}) {
  const clean =
    sanitizeAIResponse(content);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        CORVUS AI
      </Text>

      <Text style={styles.text}>
        {clean}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '100%',
    padding: 13,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.11)',
    backgroundColor: 'rgba(17,19,23,0.60)',
  },
  label: {
    color: 'rgba(245,166,35,0.90)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  text: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 14,
    lineHeight: 20,
  },
});
