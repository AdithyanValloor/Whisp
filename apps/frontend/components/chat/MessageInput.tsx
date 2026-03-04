"use client";

import TextareaAutosize from "react-textarea-autosize";
import EmojiPickerBox from "./EmojiPicker";
import { useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { MessageType } from "@/redux/features/messageSlice";
import { Dispatch, SetStateAction } from "react";
import { CircleAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  isBlockedByMe: boolean;
  isBlockingMe: boolean;

  isBlocked: boolean;
  onUnblock: () => void;

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
  isBlocked,
  onUnblock,
  isBlockedByMe,
  isBlockingMe,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (replyingTo || editingMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingTo, editingMessage]);

  return (
    <div className="flex-col mb-3 mx-3 overflow-hidden shadow flex border-2 min-w-0 border-base-content/10 rounded-2xl">
      <AnimatePresence mode="wait">
        {isBlockedByMe ? (
          <motion.div
            key="blocked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            
            className="w-full p-3 bg-base-200 flex items-center py-4 justify-between rounded-xl text-sm text-base-content"
          >
            <div className="flex items-center gap-2 opacity-80">
              <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
                <CircleAlert size={20} className="text-red-500" />
              </div>

              <p>You cannot message a blocked user.</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.15 }}
              onClick={onUnblock}
              className="btn btn-sm bg-cyan-950 hover:bg-cyan-900 text-white border-none rounded-full px-4"
            >
              Unblock User
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* ================= Reply Section ================= */}

            <AnimatePresence initial={false}>
              {replyingTo && (
                <motion.div
                  key="reply"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="text-sm border-b border-base-content/20 bg-base-200 px-4 py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-base-content/70 text-xs leading-snug line-clamp-1">
                        Replying to{" "}
                        <strong>
                          {replyingTo.sender.displayName ||
                            replyingTo.sender.username}
                        </strong>
                        : {replyingTo.content}
                      </p>
                    </div>

                    <button
                      aria-label="close"
                      onClick={() => setReplyingTo(null)}
                      className="opacity-60 hover:opacity-100 cursor-pointer p-1 rounded-full text-base-content flex-shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ================= Edit Section ================= */}
            <AnimatePresence initial={false}>
              {editingMessage && (
                <motion.div
                  key="edit"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="text-sm border-b border-base-content/20 bg-base-200 pl-7 px-4 text-base-content/70 py-2 flex justify-between w-full items-center">
                    <span>Editing message</span>
                    <button
                      aria-label="close"
                      onClick={() => setEditingMessage(null)}
                      className="opacity-60 hover:opacity-100 cursor-pointer p-1 rounded-full text-base-content"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ================= Input Section ================= */}
            <div className="flex-none bg-base-100 w-full p-3 shadow flex items-end gap-2">
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
                className="flex-1 min-w-0 text-base-content resize-none px-4 py-2 focus:outline-none bg-transparent rounded-md text-sm leading-relaxed scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent max-h-40 overflow-y-auto"
              />

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

              <button
                type="button"
                onClick={handleSend}
                className="
            p-2 rounded-full cursor-pointer
            transition-transform duration-200 ease-out opacity-80
            hover:translate-x-0.5 hover:scale-110 text-base-content
          "
                aria-label="Send message"
              >
                <IoSend strokeWidth={1.3} size={20} />
              </button>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
