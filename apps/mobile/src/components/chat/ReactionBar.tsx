import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { MessageReaction } from '../../lib/chat/types';

type Props = {
  reactions: MessageReaction[];
  onToggle: (emoji: string) => void;
  onMore: () => void;
};

export function ReactionBar({
  reactions,
  onToggle,
  onMore,
}: Props) {
  return (
    <View style={styles.container}>
      {reactions.map(reaction => (
        <Pressable
          key={`reaction-${reaction.emoji}`}
          onPress={() =>
            onToggle(reaction.emoji)
          }
          style={[
            styles.reaction,
            reaction.reactedByCurrentUser &&
              styles.active,
          ]}
        >
          <Text style={styles.emoji}>
            {reaction.emoji}
          </Text>
          <Text style={styles.count}>
            {reaction.count}
          </Text>
        </Pressable>
      ))}

      <Pressable
        onPress={onMore}
        style={styles.more}
      >
        <Text style={styles.moreText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  active: {
    borderColor: 'rgba(245,166,35,0.45)',
    backgroundColor: 'rgba(245,166,35,0.08)',
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
    fontWeight: '700',
  },
  more: {
    width: 27,
    height: 27,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  moreText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
});
