export type MessageAttachment =
  | {
      kind: 'image';
      uri: string;
      width?: number;
      height?: number;
      name?: string;
    }
  | {
      kind: 'gif';
      uri: string;
      width?: number;
      height?: number;
    }
  | {
      kind: 'video';
      uri: string;
      width?: number;
      height?: number;
      duration?: number;
      name?: string;
    }
  | {
      kind: 'audio';
      uri: string;
      duration?: number;
      name?: string;
    }
  | {
      kind: 'file';
      uri: string;
      name: string;
      size?: number;
      mimeType?: string;
    };

export type MessageReaction = {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
  userIds?: string[];
};

export type NormalizedMessage = {
  id: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    username?: string;
    avatarUri?: string;
  };
  channelId?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string;
  replyToMessageId?: string | null;
  threadId?: string | null;
  attachment?: MessageAttachment | null;
  reactions?: MessageReaction[];
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  edited?: boolean;
};
