
export interface ChatUser {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: {
    url: string | null;
    public_id: string | null;
  };
}

export interface Chat {
  _id: string;
  members: ChatUser[];
  isGroup: boolean;
  chatName: string;
  admin: ChatUser[];
  createdBy?: ChatUser;
  isPinned?: boolean;
  isArchived?: boolean;
  lastReadAt?: string | null;
  mutedUntil?: string | null;
  unreadCounts: Record<string, number>;
  lastMessage?: ChatMessage;
  createdAt: string;
  updatedAt: string;
  clearedAt?: string | null;
}

export interface ChatMessage {
  _id: string;
  chat: string;
  sender: string;
  content: string;
  edited: boolean;
  deleted: boolean;
  deliveredTo: string[];
  seenBy: string[];
  replyTo: string | null;
  reactions: MessageReaction[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageReaction {
  _id: string;
  emoji: string;
  user: string;
}

