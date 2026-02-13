/**
 * Profile picture object
 */
export interface ProfilePicture {
  url: string | null;
  public_id: string | null;
}

/**
 * User info embedded inside messages
 */
export interface MessageUser {
  _id: string;
  username: string;
  displayName: string;
  profilePicture?: ProfilePicture;
}

/**
 * Chat info embedded inside message
 */
export interface MessageChat {
  _id: string;
  chatName?: string;
  isGroup: boolean;
}

/**
 * Reaction object
 */
export interface MessageReaction {
  emoji: string;
  user: MessageUser;
}

/**
 * Core message type (REST + Socket compatible)
 */
export interface ChatMessage {
  _id: string;
  chat: string;
  sender: MessageUser;

  content: string;

  edited: boolean;
  deleted: boolean;

  deliveredTo: string[];
  seenBy: string[];

  replyTo: ChatMessage | null;
  reactions: MessageReaction[];

  createdAt: string;
  updatedAt: string;
}
