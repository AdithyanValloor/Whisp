import { MessageType } from "@/redux/features/messageSlice";
import Messages from "./Messages";

interface ChatBodyProps {
  chatId: string;
  currentUser: { _id: string; username: string; displayName?: string; profilePic?: string };
  typingUsers: Record<string, string>;
  replyingTo: MessageType | null;
  editingMessage: MessageType | null;
  onEdit: (msg: MessageType | null) => void;
  onDelete: (msg: MessageType) => void;
  setReplyingTo: (m: MessageType | null) => void;
  scrollTargetId: string | null;
}

export function ChatBody({
  chatId,
  currentUser,
  typingUsers,
  replyingTo,
  editingMessage,
  onEdit,
  onDelete,
  setReplyingTo,
  scrollTargetId,
}: ChatBodyProps) {
  return (
    <>
      <div className="flex-1 min-h-0 overflow-hidden">
        <Messages
          chatId={chatId}
          currentUser={currentUser}
          replyingTo={replyingTo}
          editingMessage={editingMessage}
          onEdit={onEdit}
          onDelete={onDelete}
          setReplyingTo={setReplyingTo}
          typingUsers={typingUsers}
          scrollTargetId={scrollTargetId}
        />
      </div>
    </>
  );
}