"use client";

import Image from "next/image";
import { MessageType } from "@/redux/features/messageSlice";
import { renderTwemoji } from "@/utils/renderEmoji";
import { parseMessageText } from "@/utils/parseMessage";
import { Check, CheckCheck } from "lucide-react";

interface ChatBubbleProps {
  msg: MessageType;
  isMe: boolean;
  grouped: boolean;
  isLastInGroup: boolean;
  handleReaction: (msg:MessageType, emoji:string) => void;
  scrollToMessage: (id: string) => void;
  replyingTo: MessageType | null;
  editingMessage: MessageType | null;
  profilePic: string;
  senderName: string;
  contextMenu: { 
    x: number; 
    y: number; 
    msg: MessageType | null;
    position: 'top' | 'bottom';
  }
  isLastMessage: boolean;
  highlightedMessageId: string | null;
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

  return (
    <div
      className={`chat relative p-0 border-1 border-transparent 
        ${msg.reactions && msg.reactions.length > 0 ? "pb-5" : ""} 
        ${isMe ? "chat-end" : "chat-start"} 
        hover:bg-base-content/10 rounded-sm
          px-4 transition-colors
          ${highlightedMessageId === msg._id && "bg-cyan-900/30"}
          ${editingMessage?._id === msg._id && "bg-base-content/10"}
          ${replyingTo?._id === msg._id && "bg-base-content/10"}
          ${contextMenu.msg?._id === msg._id && !msg.deleted && "bg-base-content/10"}
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
      
      <div
        className={`relative rounded-2xl shadow chat-bubble flex flex-col
          
        ${grouped 
          ? (isMe ? "!rounded-r-lg" : "!rounded-l-lg") 
          : (isMe ? "!rounded-br-lg" : "!rounded-bl-lg") 
        }
        ${isLastInGroup 
          ? (isMe ? "!rounded-br-2xl" : "!rounded-bl-2xl") 
          : ""
        }
          
        px-1 py-1 ${
          isMe ? "bg-cyan-900 text-white" : "bg-base-100"
        } ${grouped && (isMe ? "mx-10" : "mx-10")} ${
          msg.deleted && "italic opacity-80" 
        } break-words overflow-hidden whitespace-pre-wrap 
          max-w-[75%] sm:max-w-[65%] md:max-w-[55%] xl:max-w-[50%]`}
      >
        {msg.replyTo && (
          <div 
            onClick={() => {
              if (msg.replyTo?._id) {
                scrollToMessage(msg.replyTo._id);
              }
            }}
            className={`bg-base-content/10 cursor-default 
              ${grouped 
                ? (isMe ? "!rounded-r-lg" : "!rounded-l-lg") 
                : (isMe ? "!rounded-br-lg" : "!rounded-bl-lg") 
              }

              rounded-t-xl
              rounded-lg
              px-5 p-2 
              mb-1 text-sm`}>
            <span className="font-semibold">
              {msg.replyTo.sender?.displayName || msg.replyTo.sender?.username}
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
          { msg.edited && !msg.deleted && (<div className={`flex py-1 ${isMe && "justify-end" } `}>
            
              <span className={`pl-3  ${isMe && "pr-8" } text-[10px] opacity-50`}>
                edited
              </span>

          </div>)}
        </div>

        {isMe && (
          <div className="absolute bottom-2 right-2 flex items-center">
            {msg.seenBy && msg.seenBy.length > 0 ? (
              <CheckCheck size={16} strokeWidth={3} className="text-blue-400" />
            ) : msg.deliveredTo && msg.deliveredTo.length > 0 ? (
              <Check size={16} strokeWidth={3}/>
            ) : (
              <Check size={16} strokeWidth={3} className="opacity-50" />
            )}
          </div>
        )}
      </div>

      {msg.reactions && msg.reactions.length > 0 && (
        <div
          className={`absolute flex flex-wrap gap-[2px] px-[6px] py-[1px] rounded-full text-sm select-none twemoji-container
            ${
              isMe
                ? "right-15 bottom-7 justify-end"
                : "left-15 bottom-7 justify-start"
            }`}
          style={{
            transform: "translateY(100%)",
          }}
        >
          {Object.entries(
            msg.reactions.reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([emoji, count]) => (
            <span
              key={emoji}
              className={`flex items-center bg-base-100 border border-base-content/8 shadow justify-center p-1 gap-[4px] rounded-full cursor-pointer transition-all

                    
                `}
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
