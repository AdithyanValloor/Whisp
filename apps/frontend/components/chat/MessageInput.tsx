import TextareaAutosize from "react-textarea-autosize";
import EmojiPickerBox from "./EmojiPicker";
import { useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { MessageType } from "@/redux/features/messageSlice";
import { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";

interface MessageInputProps {
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;

  handleSend: () => void;
  handleTyping: () => void;

  editingMessage: MessageType | null;
  setEditingMessage: Dispatch<SetStateAction<MessageType | null>>;

  showPicker: boolean;
  setShowPicker: Dispatch<SetStateAction<boolean>>;

  replyingTo: MessageType | null;
  setReplyingTo: Dispatch<SetStateAction<MessageType | null>>;

  isMobile: boolean;
}

export default function MessageInput({
  message,
  setMessage,
  handleSend,
  handleTyping,
  editingMessage,
  setEditingMessage,
  showPicker,
  setShowPicker,
  replyingTo,
  setReplyingTo,
  isMobile,
}: MessageInputProps) {
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".emoji-picker-container")) {
        setShowPicker(false);
      }
    };

    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [setShowPicker]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (replyingTo || editingMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingTo, editingMessage]);

  return (
    <div className="flex-col mb-3 mx-3 overflow-hidden shadow flex border border-base-content/5 rounded-2xl">
      {replyingTo && (
        <div className="text-sm border-b border-base-content/20 bg-base-200 px-4 py-2 flex items-center gap-3">
          {/* Text container */}
          <div className="flex-1 min-w-0">
            <p className="text-base-content/70 text-xs leading-snug line-clamp-1">
              Replying to{" "}
              <strong>
                {replyingTo.sender.displayName || replyingTo.sender.username}
              </strong>
              : {replyingTo.content}
            </p>
          </div>

          {/* Close button */}
          <button
            aria-label="close"
            onClick={() => setReplyingTo(null)}
            className="opacity-60 text-base-content hover:opacity-100 cursor-pointer p-1 rounded-full flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="text-sm border-b border-base-content/20 bg-base-200 pl-7 px-4 text-base-content/70 py-2 flex justify-between w-full items-center">
          <span>Editing message</span>
          <button
            aria-label="close"
            onClick={() => setEditingMessage(null)}
            className="opacity-60 hover:opacity-100 cursor-pointer p-1 rounded-full"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex-none bg-base-100 w-full p-3 shadow flex items-end gap-2">
        {/* Auto-growing message input */}
        <TextareaAutosize
          minRows={1}
          maxRows={6}
          placeholder="Write a message..."
          ref={textareaRef}
          value={editingMessage ? editingMessage.content : message}
          onChange={(e) =>
            editingMessage
              ? setEditingMessage((prev) =>
                  prev ? { ...prev, content: e.target.value } : null,
                )
              : setMessage(e.target.value)
          }
          onInput={handleTyping}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 text-base-content resize-none px-4 py-2 focus:outline-none bg-transparent rounded-md text-sm leading-relaxed scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent max-h-40 overflow-y-auto"
        />

        {/* Emoji Picker */}
        <EmojiPickerBox
          isMobile={isMobile}
          showPicker={showPicker}
          setShowPicker={setShowPicker}
          onEmojiClick={(emoji: string) => {
            if (editingMessage)
              setEditingMessage((prev) =>
                prev ? { ...prev, content: prev.content + emoji } : null,
              );
            else setMessage((prev: string) => prev + emoji);
          }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          className="
            p-2 rounded-full cursor-pointer
            transition-transform duration-200 ease-out opacity-80
            hover:translate-x-0.5 hover:scale-110 text-base-content
          "
          aria-label="Send message"
          title="Send message"
        >
          <IoSend strokeWidth={1.3} size={20} />
        </button>
      </div>
    </div>
  );
}
