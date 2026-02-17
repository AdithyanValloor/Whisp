export type SystemToastType = "error" | "success" | "info";

export type NotificationType =
  | "message"
  | "friend_request"
  | "friend_accept"
  | "call";

export type ToastType = SystemToastType | NotificationType;

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;

  profilePicture?: {
    url: string | null;
    public_id?: string | null;
  };

  chatId?: string;
  messageCount?: number; 

  duration?: number;
  persistent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}