import { normalizeAttachment } from './attachments';
import type { NormalizedMessage } from './types';
import { formatAvatarUrl } from '../avatar';

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function normalizeMessage(raw: any): NormalizedMessage {
  const author =
    raw?.author ??
    raw?.user ??
    raw?.sender ??
    raw?.profile ??
    {};

  const authorId = String(
    raw?.author_id ??
    raw?.authorId ??
    raw?.user_id ??
    raw?.sender_id ??
    author?.id ??
    ''
  );

  const rawAvatarUri = firstString(
    author?.avatar_url,
    author?.avatarUrl,
    author?.profile_picture,
    author?.profilePicture,
    author?.profile_image,
    author?.profileImage,
    author?.image_url,
    author?.imageUrl,
    author?.photo_url,
    author?.photoUrl,
    author?.avatar,
    raw?.avatar_url,
    raw?.avatarUrl
  );

  const avatarUri = rawAvatarUri ? formatAvatarUrl(rawAvatarUri) ?? rawAvatarUri : undefined;

  const name =
    firstString(
      author?.display_name,
      author?.displayName,
      author?.full_name,
      author?.fullName,
      author?.name,
      author?.username,
      raw?.author_name,
      raw?.username
    ) ?? 'Unknown user';

  return {
    id: String(raw?.id ?? ''),
    authorId,
    author: {
      id: authorId,
      name,
      username: firstString(
        author?.username,
        raw?.username
      ),
      avatarUri,
    },
    channelId:
      raw?.channel_id ??
      raw?.channelId ??
      null,
    content:
      typeof raw?.content === 'string'
        ? raw.content
        : '',
    createdAt: String(
      raw?.created_at ??
      raw?.createdAt ??
      raw?.sent_at ??
      ''
    ),
    updatedAt:
      raw?.updated_at ??
      raw?.updatedAt,
    replyToMessageId:
      raw?.reply_to_message_id ??
      raw?.replyToMessageId ??
      raw?.reply_id ??
      null,
    threadId:
      raw?.thread_id ??
      raw?.threadId ??
      raw?.parent_message_id ??
      null,
    attachment: normalizeAttachment(raw),
    reactions: Array.isArray(raw?.reactions)
      ? raw.reactions
      : [],
    status: raw?.status,
    edited: Boolean(raw?.edited),
  };
}
