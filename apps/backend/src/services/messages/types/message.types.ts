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
export interface MessageBody {
  chatId?: string;
  content?: string;
  replyTo?: string | null;
  emoji?: string;
  messageId?: string | null;
  targetChatIds?: string[]; 
}
