"use client";

import Image from "next/image";
import { MessageType } from "@/redux/features/messageSlice";
import { renderTwemoji } from "@/utils/renderEmoji";
import { parseMessageText } from "@/utils/parseMessage";
import { Check, CheckCheck, Forward } from "lucide-react";

interface ChatBubbleProps {
  msg: MessageType;
  isMe: boolean;
  grouped: boolean;
  isLastInGroup: boolean;
  handleReaction: (msg: MessageType, emoji: string) => void;
  scrollToMessage: (id: string) => void;
  replyingTo: MessageType | null;
  editingMessage: MessageType | null;
  profilePic: string;
  senderName: string;
  contextMenu: {
    x: number;
    y: number;
    msg: MessageType | null;
    position: "top" | "bottom";
  };
  isLastMessage: boolean;
  highlightedMessageId: string | null;
}

const EMOJI_RE =
  /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})[\p{Emoji}\uFE0F\u20E3\u200D\u{1F3FB}-\u{1F3FF}]*$/u;

// Counts how many top-level emoji grapheme clusters are in a string.
// Returns 0 if the string contains any non-emoji, non-whitespace characters.
function countEmojis(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    const nonSpace = Array.from(
      segmenter.segment(trimmed),
      (s) => s.segment,
    ).filter((g) => g.trim() !== "");
    if (nonSpace.some((g) => !EMOJI_RE.test(g))) return 0;
    return nonSpace.length;
  }

  // Fallback for environments without Intl.Segmenter
  const stripped = trimmed
    .replace(
      /(\p{Emoji_Presentation}|\p{Extended_Pictographic})[\p{Emoji}\uFE0F\u20E3\u200D\u{1F3FB}-\u{1F3FF}]*/gu,
      "",
    )
    .trim();
  if (stripped.length > 0) return 0;
  const matches = trimmed.match(
    /(\p{Emoji_Presentation}|\p{Extended_Pictographic})[\p{Emoji}\uFE0F\u20E3\u200D\u{1F3FB}-\u{1F3FF}]*/gu,
  );
  return matches ? matches.length : 0;
}

export default function ChatBubble({
  msg,
  isMe,
  grouped,
  isLastInGroup,
  senderName,
  scrollToMessage,
  replyingTo,
  editingMessage,
  profilePic,
  handleReaction,
  contextMenu,
  highlightedMessageId,
}: ChatBubbleProps) {
  const content = msg.content ?? "";

  // Only treat as emoji-only when: not deleted, no reply context
  const emojiCount = !msg.deleted && !msg.replyTo ? countEmojis(content) : 0;
  const isSingleEmoji = emojiCount === 1;
  const isMultipleEmoji = emojiCount >= 2 && emojiCount <= 5;
  const isEmojiOnly = isSingleEmoji || isMultipleEmoji;

  // Pixel size passed directly to twemoji — CSS font-size has no effect on <img> tags
  const emojiSize = isSingleEmoji ? 56 : 44;

  return (
    <div
      className={`chat relative text-base-content p-0 border-1 border-transparent
        ${msg.reactions && msg.reactions.length > 0 ? "pb-5" : ""}
        ${isMe ? "chat-end" : "chat-start"}
        hover:bg-base-content/10 rounded-sm px-4 transition-colors
        ${highlightedMessageId === msg._id ? "bg-cyan-900/30" : ""}
        ${editingMessage?._id === msg._id ? "bg-base-content/10" : ""}
        ${replyingTo?._id === msg._id ? "bg-base-content/10" : ""}
        ${contextMenu.msg?._id === msg._id && !msg.deleted ? "bg-base-content/10" : ""}
      `}
    >
      {!grouped && (
        <div className="chat-image avatar">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <Image
              src={profilePic}
              alt="profile"
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
        </div>
      )}

      {!grouped && (
        <div className="chat-header">
          {senderName} {msg.edited && !msg.deleted ? "(edited)" : ""}
          <time className="opacity-50 ml-1">
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
      )}

      {/* ── Emoji-only: no bubble background ── */}
      {isEmojiOnly ? (
        <div
          className={`relative chat-bubble !bg-transparent !shadow-none !p-0 flex flex-col
            ${grouped ? (isMe ? "mx-10" : "mx-10") : ""}
            max-w-[75%] sm:max-w-[65%] md:max-w-[55%] xl:max-w-[50%]`}
        >
          <div
            className={`twemoji-container select-none leading-none
              ${isMe ? "text-right" : "text-left"}`}
            dangerouslySetInnerHTML={{
              __html: renderTwemoji(parseMessageText(content), emojiSize),
            }}
          />

          {msg.edited && !msg.deleted && (
            <div className={`flex pt-1 ${isMe ? "justify-end" : ""}`}>
              <span className="text-[10px] opacity-50">edited</span>
            </div>
          )}

          {isMe && (
            <div className="flex justify-end">
              <div className="bg-cyan-900 p-1 px-2 rounded-lg mt-0.5">
                {msg.seenBy && msg.seenBy.length > 0 ? (
                  <CheckCheck
                    size={16}
                    strokeWidth={3}
                    className="text-blue-400"
                  />
                ) : msg.deliveredTo && msg.deliveredTo.length > 0 ? (
                  <Check size={16} strokeWidth={3} className="text-white" />
                ) : (
                  <Check
                    size={16}
                    strokeWidth={3}
                    className="opacity-50 text-white"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Normal bubble ── */
        <div
          className={`relative rounded-2xl shadow chat-bubble flex flex-col
            ${
              grouped
                ? isMe
                  ? "!rounded-r-lg"
                  : "!rounded-l-lg"
                : isMe
                  ? "!rounded-br-lg"
                  : "!rounded-bl-lg"
            }
            ${
              isLastInGroup
                ? isMe
                  ? "!rounded-br-2xl"
                  : "!rounded-bl-2xl"
                : ""
            }
            px-1 py-1
            ${isMe ? "bg-cyan-900 text-white" : "bg-base-100"}
            ${grouped ? (isMe ? "mx-10" : "mx-10") : ""}
            ${msg.deleted ? "italic opacity-80" : ""}
            break-words overflow-hidden whitespace-pre-wrap
            max-w-[75%] sm:max-w-[65%] md:max-w-[55%] xl:max-w-[50%]`}
        >
          {msg.forwarded && !msg.deleted && (
            <div className={`flex items-center italic gap-1 opacity-50 pl-3 px-2`}>
              <Forward size={15}/>
              <span
                className={`${isMe ? "pr-8" : ""} text-sm`}
              >
                Forwarded
              </span>
            </div>
          )}

          {msg.replyTo && (
            <div
              onClick={() => {
                if (msg.replyTo?._id) scrollToMessage(msg.replyTo._id);
              }}
              className={`bg-base-content/10 cursor-default
                ${
                  grouped
                    ? isMe
                      ? "!rounded-r-lg"
                      : "!rounded-l-lg"
                    : isMe
                      ? "!rounded-br-lg"
                      : "!rounded-bl-lg"
                }
                rounded-t-xl rounded-lg px-5 p-2 mb-1 text-sm`}
            >
              <span className="font-semibold">
                {msg.replyTo.sender?.displayName ||
                  msg.replyTo.sender?.username}
              </span>
              :{" "}
              <span className="opacity-70 inline-block max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap align-middle">
                {msg.replyTo.content}
              </span>
            </div>
          )}

          <div className="w-full">
            <div
              className={`w-full px-3 ${isMe ? "pr-6" : ""} twemoji-container`}
              dangerouslySetInnerHTML={{
                __html: msg.deleted
                  ? "This message was deleted"
                  : renderTwemoji(parseMessageText(msg.content)),
              }}
            />
            {msg.edited && !msg.deleted && (
              <div className={`flex py-1 ${isMe ? "justify-end" : ""}`}>
                <span
                  className={`pl-3 ${isMe ? "pr-8" : ""} text-[10px] opacity-50`}
                >
                  edited
                </span>
              </div>
            )}
          </div>

          {isMe && (
            <div className="absolute bottom-2 right-2 flex items-center">
              {msg.seenBy && msg.seenBy.length > 0 ? (
                <CheckCheck
                  size={16}
                  strokeWidth={3}
                  className="text-blue-400"
                />
              ) : msg.deliveredTo && msg.deliveredTo.length > 0 ? (
                <Check size={16} strokeWidth={3} />
              ) : (
                <Check size={16} strokeWidth={3} className="opacity-50" />
              )}
            </div>
          )}
        </div>
      )}

      {msg.reactions && msg.reactions.length > 0 && (
        <div
          className={`absolute flex flex-wrap gap-[2px] px-[6px] py-[1px] rounded-full text-sm select-none twemoji-container
            ${isMe ? "right-15 bottom-7 justify-end" : "left-15 bottom-7 justify-start"}`}
          style={{ transform: "translateY(100%)" }}
        >
          {Object.entries(
            msg.reactions.reduce(
              (acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ),
          ).map(([emoji, count]) => (
            <span
              key={emoji}
              className="flex items-center bg-base-100 border border-base-content/8 shadow justify-center p-1 gap-[4px] rounded-full cursor-pointer transition-all"
              onClick={() => handleReaction(msg, emoji)}
            >
              <span
                className="flex items-center justify-center leading-none"
                dangerouslySetInnerHTML={{ __html: renderTwemoji(emoji) }}
              />
              {count > 1 && (
                <span className="text-xs font-semibold opacity-70 leading-none flex items-center">
                  {count}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
