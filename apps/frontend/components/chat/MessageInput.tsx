"use client";

import TextareaAutosize from "react-textarea-autosize";
import EmojiPickerBox from "./EmojiPicker";
import { useEffect, useRef, useState } from "react";
import { IoSend } from "react-icons/io5";
import { MessageType } from "@/redux/features/messageSlice";
import { Dispatch, SetStateAction } from "react";
import { AtSign, CircleAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppButton from "../GlobalComponents/AppButton";
import ProfilePicture from "../ProfilePicture/ProfilePicture";

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

  isGroup?: boolean;
  groupMembers?: {
    _id: string;
    username: string;
    displayName?: string;
    profilePicture?: { url: string | null };
  }[];
  currentUserId?: string;
  onMentionsChange?: (ids: string[]) => void;
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
  isGroup,
  groupMembers,
  currentUserId,
  onMentionsChange,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const mentionListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (replyingTo || editingMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingTo, editingMessage]);

  // 1. Move these computed values OUT of handleInput, to component body level:
  const otherMembers = (groupMembers ?? []).filter(
    (m) => m._id !== currentUserId,
  );

  const filteredMembers =
    mentionQuery === null
      ? []
      : mentionQuery === ""
        ? otherMembers
        : otherMembers.filter(
            (m) =>
              m.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
              (m.displayName ?? "")
                .toLowerCase()
                .includes(mentionQuery.toLowerCase()),
          );

  const pickMention = (member: (typeof otherMembers)[0]) => {
    const current = editingMessage ? editingMessage.content : message;
    const before = current.slice(0, mentionStart);
    const after = current.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const inserted = `@${member.displayName || member.username} `;
    const newVal = before + inserted + after;

    editingMessage
      ? setEditingMessage((prev) =>
          prev ? { ...prev, content: newVal } : null,
        )
      : setMessage(newVal);

    setSelectedMentionIds((prev) =>
      prev.includes(member._id) ? prev : [...prev, member._id],
    );
    setMentionQuery(null);
    setMentionStart(-1);
    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = before.length + inserted.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  // 2. Move these useEffects OUT of handleInput, to component body level:
  useEffect(() => {
    onMentionsChange?.(selectedMentionIds);
  }, [selectedMentionIds]);
  useEffect(() => {
    if (message === "") setSelectedMentionIds([]);
  }, [message]);
  useEffect(() => {
    setActiveMentionIndex(0);
  }, [mentionQuery]);

  // 3. handleInput now becomes clean — just the input logic:
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;

    editingMessage
      ? setEditingMessage((prev) => (prev ? { ...prev, content: val } : null))
      : setMessage(val);

    handleTyping();

    if (!isGroup) return;

    const atMatch = val.slice(0, cursor).match(/@([^\s@]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursor - atMatch[0].length);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveMentionIndex((i) => (i + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveMentionIndex(
          (i) => (i - 1 + filteredMembers.length) % filteredMembers.length,
        );
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        pickMention(filteredMembers[activeMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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

            <AppButton onClick={onUnblock}>Unblock User</AppButton>
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

            <AnimatePresence initial={false}>
              {isGroup && mentionQuery !== null && (
                <motion.div
                  key="mention-picker"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-b border-base-content/15 bg-base-200">
                    <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                      <AtSign size={13} className="text-base-content/40" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/40">
                        Mention a member
                      </span>
                    </div>
                    <div
                      ref={mentionListRef}
                      className="overflow-y-auto px-2 pb-2"
                      style={{ maxHeight: "11.5rem" }}
                    >
                      {filteredMembers.length === 0 ? (
                        <p className="text-xs text-base-content/40 px-2 py-3 text-center">
                          No members match
                        </p>
                      ) : (
                        filteredMembers.map((member, idx) => (
                          <button
                            key={member._id}
                            type="button"
                            data-mention-index={idx}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              pickMention(member);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors
                ${idx === activeMentionIndex ? "bg-base-content/10" : "hover:bg-base-content/5"}`}
                          >
                            <ProfilePicture
                              src={
                                member.profilePicture?.url ?? "/default-pfp.png"
                              }
                              size="sm"
                              showStatus={false}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-base-content truncate leading-tight">
                                {member.displayName || member.username}
                              </p>
                              {member.displayName && (
                                <p className="text-[11px] text-base-content/50 truncate">
                                  @{member.username}
                                </p>
                              )}
                            </div>
                            {idx === activeMentionIndex && (
                              <span className="ml-auto text-[10px] text-base-content/30">
                                ↵
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
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
                onChange={(e) => handleInput(e)}
                onKeyDown={(e) => {
                  handleKeyDown(e);
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
