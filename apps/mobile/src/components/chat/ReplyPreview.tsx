import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { NormalizedMessage } from '../../lib/chat/types';

type Props = {
  replyToMessageId?: string | null;
  messagesById: Map<string, NormalizedMessage>;
  currentUserId: string;
  onPress: (messageId: string) => void;
};

export function ReplyPreview({
  replyToMessageId,
  messagesById,
  currentUserId,
  onPress,
}: Props) {
  if (!replyToMessageId) return null;

  const original =
    messagesById.get(replyToMessageId);

  if (!original) return null;

  const author =
    original.authorId === currentUserId
      ? 'You'
      : original.author.name;

  return (
    <Pressable
      onPress={() => onPress(original.id)}
      style={styles.container}
    >
      <View style={styles.line} />

      <View style={styles.body}>
        <Text style={styles.author}>
          ↳ {author}
        </Text>

        <Text
          numberOfLines={2}
          style={styles.preview}
        >
          {original.content || 'Attachment'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  line: {
    width: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(245,166,35,0.65)',
    marginRight: 8,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  author: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
  },
  preview: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 2,
  },
});
