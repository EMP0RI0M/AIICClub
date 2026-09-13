import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { NormalizedMessage } from '../../lib/chat/types';
import { Message } from './Message';
import { Composer } from './Composer';

type Props = {
  parent: NormalizedMessage;
  replies: NormalizedMessage[];
  currentUserId: string;
  onSend: (text: string) => Promise<void>;
};

export function ThreadPanel({
  parent,
  replies,
  currentUserId,
  onSend,
}: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] =
    useState(false);

  async function send() {
    const value = text.trim();

    if (!value || sending) return;

    setSending(true);

    try {
      await onSend(value);
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>
        Thread
      </Text>

      <View style={styles.parent}>
        <Text style={styles.parentAuthor}>
          {parent.author.name}
        </Text>

        <Text style={styles.parentText}>
          {parent.content || 'Attachment'}
        </Text>
      </View>

      <FlatList
        data={replies}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Message
            message={item}
            currentUserId={currentUserId}
            messagesById={
              new Map(replies.map(m => [m.id, m]))
            }
            onReplyPress={() => {}}
          />
        )}
      />

      <Composer
        value={text}
        onChangeText={setText}
        onSend={send}
        placeholder="Write a reply..."
        disabled={sending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(9,10,13,0.88)',
  },
  title: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 17,
    fontWeight: '800',
    padding: 14,
  },
  parent: {
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  parentAuthor: {
    color: 'rgba(245,166,35,0.90)',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  parentText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 19,
  },
});
