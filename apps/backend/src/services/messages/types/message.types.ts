import { Types } from "mongoose";

/**
 * ------------------------------------------------------
 * Route Params
 * ------------------------------------------------------
 */

/**
 * Used in routes like:
 * - GET    /api/message/:chatId
 * - PUT    /api/message/:messageId
 * - DELETE /api/message/:messageId
 */
export interface MessageParams {
  chatId?: string;
  messageId?: string;
}

// types/message.types.ts
export interface MessageFile {
  key: string;
  mimeType: string;
  size: number;
}

/**
 * ------------------------------------------------------
 * Request Body
 * ------------------------------------------------------
 */

/**
 * Used in routes like:
 * - POST   /api/message
 * - PUT    /api/message/:messageId
 * - POST   /api/message/react/:messageId
 */
export interface SendMessageBody {
  chatId: string;
  content?: string;
  replyTo?: string | null;
  mentionIds?: string[];
  file?: MessageFile;
}

export interface EditMessageBody {
  content: string;
}

export interface ReactionBody {
  emoji: string;
}

export interface ForwardMessageBody {
  messageId: string;
  targetChatIds: string[];
}

export interface MessageBody {
  chatId?: string;
  content?: string;
  replyTo?: string | null;
  emoji?: string;
  messageId?: string | null;
  targetChatIds?: string[];
  mentionIds?: string[];
  file?: MessageFile;
}

