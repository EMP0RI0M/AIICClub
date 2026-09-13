import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { NormalizedMessage } from '../../lib/chat/types';
import { Avatar } from '../common/Avatar';
import { ReplyPreview } from './ReplyPreview';
import { MessageMeta } from './MessageMeta';
import { ReactionBar } from './ReactionBar';
import { AIMessage } from './AIMessage';
import { AttachmentCard } from './AttachmentCard';

type Props = {
  message: NormalizedMessage;
  currentUserId: string;
  messagesById: Map<string, NormalizedMessage>;
  onReplyPress: (id: string) => void;
  onReactionToggle?: (
    messageId: string,
    emoji: string
  ) => void;
  onReactionMore?: (
    messageId: string
  ) => void;
};

export function Message({
  message,
  currentUserId,
  messagesById,
  onReplyPress,
  onReactionToggle = () => {},
  onReactionMore = () => {},
}: Props) {
  const own =
    message.authorId === currentUserId;

  const isAI =
    message.author.username === 'ai' ||
    message.author.name?.toLowerCase().includes('bot') ||
    message.author.name?.toLowerCase().includes('corvus') ||
    message.author.name === 'AIIC AI';

  return (
    <View
      style={[
        styles.row,
        own && styles.rowOwn,
      ]}
    >
      {!own && !isAI ? (
        <Avatar
          uri={message.author.avatarUri}
          name={message.author.name}
          size={34}
        />
      ) : null}

      <View
        style={[
          styles.content,
          own && styles.contentOwn,
        ]}
      >
        {!own && !isAI ? (
          <Text style={styles.author}>
            {message.author.name}
          </Text>
        ) : null}

        <ReplyPreview
          replyToMessageId={
            message.replyToMessageId
          }
          messagesById={messagesById}
          currentUserId={currentUserId}
          onPress={onReplyPress}
        />

        {isAI ? (
          <AIMessage
            content={message.content}
          />
        ) : message.attachment ? (
          <AttachmentCard
            attachment={{
              url: message.attachment.uri,
              name: ('name' in message.attachment && message.attachment.name) ? message.attachment.name : 'Attachment',
              size: 'size' in message.attachment ? message.attachment.size : undefined,
              mimeType: 'mimeType' in message.attachment ? message.attachment.mimeType : undefined,
              kind: message.attachment.kind,
            }}
          />
        ) : (
          <Text style={styles.text}>
            {message.content}
          </Text>
        )}

        <MessageMeta
          createdAt={message.createdAt}
          status={message.status}
          edited={message.edited}
        />

        {message.reactions?.length ? (
          <ReactionBar
            reactions={message.reactions}
            onToggle={emoji =>
              onReactionToggle(
                message.id,
                emoji
              )
            }
            onMore={() =>
              onReactionMore(message.id)
            }
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  content: {
    flexShrink: 1,
    maxWidth: '84%',
    minWidth: 0,
  },
  contentOwn: {
    alignItems: 'flex-end',
  },
  author: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  text: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 14,
    lineHeight: 20,
  },
});
