import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { NormalizedMessage } from '../../lib/chat/types';

export function MessageMeta({
  createdAt,
  status,
  edited,
}: {
  createdAt: string;
  status?: NormalizedMessage['status'];
  edited?: boolean;
}) {
  const date = new Date(createdAt);

  const time = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <View style={styles.row}>
      {edited ? (
        <Text style={styles.meta}>
          edited
        </Text>
      ) : null}

      <Text style={styles.meta}>
        {time}
      </Text>

      {status === 'sending' && (
        <Text style={styles.meta}> •</Text>
      )}

      {status === 'sent' && (
        <Text style={styles.meta}> ✓</Text>
      )}

      {(status === 'delivered' ||
        status === 'read') && (
        <Text style={styles.meta}> ✓✓</Text>
      )}

      {status === 'failed' && (
        <Text style={styles.failed}> !</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  meta: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 10,
  },
  failed: {
    color: '#ff7373',
    fontWeight: '800',
    fontSize: 11,
  },
});
