"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchMessages,
  MessageType,
  toggleReaction,
} from "@/redux/features/messageSlice";
import { ChevronDown, ChevronsDown } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { selectMessagesByChat } from "@/redux/features/messageSelectors";
import ChatBubble from "./ChatBubble";
import ContextMenu from "./ContextMenu";
import { motion, AnimatePresence } from "framer-motion";

import { clearJumpTo, fetchNewerMessages } from "@/redux/features/messageSlice";
import UniversalEmojiPicker from "../GlobalComponents/UniversalEmojiPicker";

interface MessagesProps {
  chatId: string;
  currentUser: { _id: string; username: string; profilePic?: string };
  onEdit: (msg: MessageType | null) => void;
  onDelete: (msg: MessageType) => void;
  setReplyingTo: (msg: MessageType | null) => void;
  replyingTo: MessageType | null;
  editingMessage: MessageType | null;
  typingUsers: Record<string, string>;
  scrollTargetId?: string | null;
  scrollToMessage: (id: string) => void;
  highlightedMessageId: string | null;
}

export default function Messages({
  chatId,
  currentUser,
  onEdit,
  onDelete,
  setReplyingTo,
  replyingTo,
  typingUsers,
  editingMessage,
  scrollToMessage,
  highlightedMessageId,
}: MessagesProps) {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadingOlderRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const pageRef = useRef(1);
  const prevChatIdRef = useRef(chatId);
  const isInitialLoadRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const animatedMessageIdRef = useRef<string | null>(null);
  const jumpLockRef = useRef(false);

  const jumpTo = useAppSelector((s) => s.messages.jumpTo);
  const chatMeta = useAppSelector((s) => s.messages.meta[chatId]);
  const loadingNewerRef = useRef(false);
  const loadNewerDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const reactionTargetRef = useRef<MessageType | null>(null);

  const [hasMore, setHasMore] = useState(() => chatMeta?.hasMore ?? true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showNewMsgBadge, setShowNewMsgBadge] = useState(false);
  const [unreadDividerIndex, setUnreadDividerIndex] = useState<number | null>(
    null,
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    msg: MessageType | null;
    position: "top" | "bottom";
  }>({
    x: 0,
    y: 0,
    msg: null,
    position: "bottom",
  });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [showFullPicker, setShowFullPicker] = useState<{
    visible: boolean;
    msgId: string | null;
  }>({ visible: false, msgId: null });

  const messages = useAppSelector((state) =>
    selectMessagesByChat(state, chatId),
  );

  let pressTimer: NodeJS.Timeout;

  const handleTouchStart = (msg: MessageType, e: React.TouchEvent) => {
    pressTimer = setTimeout(() => {
      const touch = e.touches[0];
      if (!touch || !containerRef.current) return;

      const touchX = touch.clientX;
      const touchY = touch.clientY;

      // Context menu dimensions (actual size)
      const menuWidth = 160;
      const menuHeight = msg.sender._id === currentUser._id ? 220 : 160;

      // Viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const containerRect = containerRef.current.getBoundingClientRect();

      // Center horizontally, but adjust if needed
      const finalX = Math.max(
        10,
        Math.min(touchX - menuWidth / 2, viewportWidth - menuWidth - 10),
      );
      let finalY = touchY;

      // Determine vertical position
      let position: "top" | "bottom" = "bottom";
      const spaceBelow = viewportHeight - touchY;
      const spaceAbove = touchY - containerRect.top;

      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        position = "top";
        finalY = Math.max(containerRect.top + 10, touchY - menuHeight);
      } else {
        finalY = Math.min(touchY, viewportHeight - menuHeight - 10);
      }

      setContextMenu({
        x: finalX,
        y: finalY,
        msg,
        position,
      });
    }, 600);
  };
  const handleTouchEnd = () => clearTimeout(pressTimer);

  // Reset on chat change
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      pageRef.current = 1;
      setHasMore(chatMeta?.hasMore ?? true);
      setLoadingMore(false);
      setIsInitialLoading(true);
      setShowScrollBtn(false);
      setShowNewMsgBadge(false);
      setUnreadDividerIndex(null);
      lastMessageIdRef.current = null;
      loadingOlderRef.current = false;
      isInitialLoadRef.current = true;
      prevMessagesLengthRef.current = 0;
      animatedMessageIdRef.current = null;
      prevChatIdRef.current = chatId;
      jumpLockRef.current = false;
    }
    if (loadNewerDebounceRef.current) {
      clearTimeout(loadNewerDebounceRef.current);
      loadNewerDebounceRef.current = null;
    }
  }, [chatId]);

  const isNearBottom = () => {
    const c = containerRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 150;
  };

  const isNearTop = () => {
    const c = containerRef.current;
    if (!c) return false;
    return c.scrollTop < 400;
  };

  const scrollToBottom = (smooth = true) => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const scrollToBottomInstant = () => {
    setShowScrollBtn(false);
    setShowNewMsgBadge(false);
    setUnreadDividerIndex(null);
    scrollToBottomEased();
  };

  // Eased scroll: fast start, decelerates near the bottom (like iOS momentum)
  const scrollToBottomEased = () => {
    const container = containerRef.current;
    if (!container) return;

    const start = container.scrollTop;
    const end = container.scrollHeight - container.clientHeight;
    const distance = end - start;

    if (distance <= 0) return;

    // For short distances just snap — no point animating 5px
    if (distance < 80) {
      container.scrollTop = end;
      return;
    }

    const duration = Math.min(500, Math.max(200, distance * 0.3)); // scale with distance, cap at 500ms
    let startTime: number | null = null;

    // Ease-out cubic: fast start, slow landing
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      container.scrollTop = start + distance * eased;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Final snap to guarantee we land exactly at bottom
        container.scrollTop = end;
      }
    };
    requestAnimationFrame(step);
  };

  useEffect(() => {
    if (!jumpTo || jumpTo.chatId !== chatId) return;

    jumpLockRef.current = true;

    const attemptCenter = (attemptsLeft: number) => {
      const el = document.getElementById(`msg-${jumpTo.messageId}`);
      if (!el) {
        if (attemptsLeft > 0)
          setTimeout(() => attemptCenter(attemptsLeft - 1), 80);
        else {
          jumpLockRef.current = false;
          dispatch(clearJumpTo());
        }
        return;
      }

      dispatch(clearJumpTo());

      // Calculate center position manually — avoids fighting with pagination scroll adjustments
      const container = containerRef.current!;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const elOffsetTop = elRect.top - containerRect.top + container.scrollTop;
      const target = Math.max(
        0,
        elOffsetTop - container.clientHeight / 2 + elRect.height / 2,
      );

      container.scrollTo({ top: target, behavior: "smooth" });

      // Hold lock so pagination doesn't fire while scroll is settling
      setTimeout(() => {
        jumpLockRef.current = false;
      }, 800);
    };

    requestAnimationFrame(() => attemptCenter(8));
  }, [jumpTo, chatId, dispatch]);

  const loadNewer = async () => {
    if (loadingNewerRef.current) return;
    if (!chatMeta?.hasMoreNewer) return;
    if (jumpLockRef.current) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    loadingNewerRef.current = true;

    const container = containerRef.current;
    const scrollHeightBefore = container?.scrollHeight ?? 0;
    const scrollTopBefore = container?.scrollTop ?? 0;
    const clientHeight = container?.clientHeight ?? 0;
    const distanceFromBottom =
      scrollHeightBefore - scrollTopBefore - clientHeight;

    try {
      await dispatch(
        fetchNewerMessages({ chatId, after: lastMsg.createdAt, limit: 20 }),
      ).unwrap();

      // Preserve scroll position after new messages appended at bottom
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          const newHeight = containerRef.current.scrollHeight;
          containerRef.current.scrollTop =
            newHeight - distanceFromBottom - containerRef.current.clientHeight;
        });
      });
    } catch (e) {
      console.error("Failed to load newer messages", e);
    } finally {
      setTimeout(() => {
        loadingNewerRef.current = false;
      }, 150);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;

    const nearBottom = isNearBottom();

    if (nearBottom) {
      setShowScrollBtn(false);
      setShowNewMsgBadge(false);
      setUnreadDividerIndex(null);

      // Load newer messages when scrolling down past the context window
      if (chatMeta?.hasMoreNewer) {
        if (loadNewerDebounceRef.current)
          clearTimeout(loadNewerDebounceRef.current);
        loadNewerDebounceRef.current = setTimeout(() => {
          loadNewer();
        }, 200);
      }
    } else {
      setShowScrollBtn(true);
    }

    // Load older messages when scrolling up
    if (isNearTop() && hasMore && !loadingMore && !loadingOlderRef.current) {
      loadMore();
    }
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isInitialLoadRef.current) return;
    if (messages.length === 0) return;

    isInitialLoadRef.current = false;
    setIsInitialLoading(false);

    // Instant scroll to bottom
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }

    // Double-check after render
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  }, [messages.length, chatId]);

  // Close context menu on outside click
  useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".universal-emoji-picker-container")) return;

      if (contextMenuRef.current && !contextMenuRef.current.contains(target)) {
        setContextMenu({ x: 0, y: 0, msg: null, position: "bottom" });
        setShowFullPicker({ visible: false, msgId: null });
      }
    };
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // Handle new messages - animate only the genuinely new last message.
  //
  // Strategy: a message is "genuinely new" when ALL of these are true:
  //   1. Its _id differs from the last one we recorded (lastMessageIdRef).
  //   2. It was appended at the end (messages.length grew by 1, not by a
  //      large batch which would indicate pagination).
  //   3. We are not currently loading older messages (loadingOlderRef).
  //
  // We store the target _id in animatedMessageIdRef so the render loop can
  // read it synchronously without causing a re-render, and we never flip a
  // boolean that could be re-evaluated on unrelated renders.
  useEffect(() => {
    if (!messages.length) return;
    if (loadingOlderRef.current) return;

    const lastMessage = messages.at(-1);
    if (!lastMessage?._id) return;

    const isNewMessage = lastMessage._id !== lastMessageIdRef.current;

    if (isNewMessage) {
      const prevLength = prevMessagesLengthRef.current;
      const grewByOne = prevLength > 0 && messages.length === prevLength + 1;

      // Only animate single new messages (sent/received), not paginated batches
      if (grewByOne) {
        animatedMessageIdRef.current = lastMessage._id;

        // Clear the animation target after the animation duration so that
        // any subsequent re-render of this same message won't re-animate it.
        const timeout = setTimeout(() => {
          animatedMessageIdRef.current = null;
        }, 500);

        // Clean up the timeout if the effect re-runs before it fires
        // (the ref itself is already cleared; this just avoids the no-op call)
        return () => clearTimeout(timeout);
      }

      const isMyMessage = lastMessage.sender._id === currentUser._id;
      const nearBottom = isNearBottom();

      if (isMyMessage || nearBottom) {
        setTimeout(() => scrollToBottom(true), 100);
        setShowNewMsgBadge(false);
        setUnreadDividerIndex(null);
      } else {
        setShowNewMsgBadge(true);
        setUnreadDividerIndex(messages.length - 1);
      }

      lastMessageIdRef.current = lastMessage._id;
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUser._id]);

  // Auto-scroll on new reaction if near bottom
  useEffect(() => {
    if (!messages.length) return;
    if (loadingOlderRef.current) return;

    const nearBottom = isNearBottom();
    if (!nearBottom) return;

    // Small delay so DOM updates first
    const timeout = setTimeout(() => {
      scrollToBottom(true);
    }, 80);

    return () => clearTimeout(timeout);
  }, [messages.map((m) => m.reactions?.length).join(",")]);

  // Scroll when typing
  useEffect(() => {
    if (Object.keys(typingUsers).length === 0) return;
    if (isNearBottom()) {
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [typingUsers]);

  // Telegram-style pagination with improved scroll preservation
  const loadMore = async () => {
    if (!containerRef.current || loadingOlderRef.current || !hasMore) return;
    if (loadingNewerRef.current || jumpLockRef.current) return;
    // if (loadingNewerRef.current) return;

    loadingOlderRef.current = true;
    setLoadingMore(true);

    const container = containerRef.current;

    // Store current scroll metrics
    const scrollHeightBefore = container.scrollHeight;
    const scrollTopBefore = container.scrollTop;
    const clientHeight = container.clientHeight;

    // Calculate distance from bottom (Telegram approach)
    const distanceFromBottom =
      scrollHeightBefore - scrollTopBefore - clientHeight;

    try {
      const nextPage = pageRef.current + 1;
      const res = await dispatch(
        fetchMessages({ chatId, page: nextPage, limit: 20 }),
      ).unwrap();

      // Stop pagination if no messages returned OR fewer than requested (reached the beginning)
      if (res.messages.length === 0 || res.messages.length < 20) {
        setHasMore(false);
      } else {
        pageRef.current = nextPage;
        // If Redux tells us we've reached the end, trust it
        if (chatMeta && !chatMeta.hasMore) {
          setHasMore(false);
        }
      }

      // Only adjust scroll if we got messages
      if (res.messages.length > 0) {
        // Multiple RAF for stable positioning (Telegram uses this approach)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!containerRef.current) return;

            const scrollHeightAfter = containerRef.current.scrollHeight;
            const clientHeightAfter = containerRef.current.clientHeight;

            // Maintain the same distance from bottom
            const newScrollTop =
              scrollHeightAfter - distanceFromBottom - clientHeightAfter;

            // Apply scroll position
            containerRef.current.scrollTop = newScrollTop;

            // Triple RAF for extra stability on slower devices
            requestAnimationFrame(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = newScrollTop;
              }
            });
          });
        });
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      // Delay flag reset to prevent rapid successive loads
      setTimeout(() => {
        setLoadingMore(false);
        loadingOlderRef.current = false;
      }, 100);
    }
  };

  const isNewDay = (curr: MessageType, prev?: MessageType) => {
    if (!prev) return true;
    return (
      new Date(curr.createdAt).toDateString() !==
      new Date(prev.createdAt).toDateString()
    );
  };

  const handleReply = (msg: MessageType) => {
    onEdit(null);
    setReplyingTo(msg);
    setContextMenu({ x: 0, y: 0, msg: null, position: "bottom" });
  };

  const handleReaction = (msg: MessageType, emoji: string) => {
    console.log("REACTION :", msg, emoji);
    dispatch(toggleReaction({ messageId: msg._id, emoji }));
    reactionTargetRef.current = null;
    setContextMenu({ x: 0, y: 0, msg: null, position: "bottom" });
    setShowFullPicker({ visible: false, msgId: null });
  };

  const openContextMenu = (e: React.MouseEvent, msg: MessageType) => {
    e.preventDefault();
    e.stopPropagation();

    if (contextMenu.msg?._id === msg._id) {
      closeContextMenu();
      return;
    }

    if (!containerRef.current) return;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Check if this is the current user's message
    const isUserMessage = msg.sender._id === currentUser._id;

    // Context menu dimensions (actual size from component: w-40 = 160px)
    const menuWidth = 160;
    const menuHeight = isUserMessage ? 220 : 160; // Taller if user's own message (has edit/delete)

    // Viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const containerRect = containerRef.current.getBoundingClientRect();

    // Calculate initial position at mouse pointer
    let finalX = mouseX;
    let finalY = mouseY;

    // Adjust X position if menu would overflow right edge
    if (finalX + menuWidth > viewportWidth) {
      finalX = viewportWidth - menuWidth - 10; // 10px padding from edge
    }

    // Adjust X position if menu would overflow left edge
    if (finalX < 10) {
      finalX = 10;
    }

    // Determine if menu should open above or below cursor
    let position: "top" | "bottom" = "bottom";

    // Check if there's enough space below
    const spaceBelow = viewportHeight - mouseY;
    const spaceAbove = mouseY - containerRect.top;

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      // Open above cursor
      position = "top";
      finalY = mouseY - menuHeight;

      // Make sure it doesn't overflow top
      if (finalY < containerRect.top + 10) {
        finalY = containerRect.top + 10;
      }
    } else {
      // Open below cursor
      position = "bottom";

      // Make sure it doesn't overflow bottom
      if (finalY + menuHeight > viewportHeight) {
        finalY = viewportHeight - menuHeight - 10;
      }
    }

    setContextMenu({
      x: finalX,
      y: finalY,
      msg,
      position,
    });
    setShowFullPicker({ visible: false, msgId: null });
  };

  const closeContextMenu = () => {
    setContextMenu({ x: 0, y: 0, msg: null, position: "bottom" });
    setShowFullPicker({ visible: false, msgId: null });
  };

  const openFullPicker = (msgId: string) => {
    reactionTargetRef.current = contextMenu.msg;
    setShowFullPicker({ visible: true, msgId });
  };
  // Freeze page scroll when context menu is open
  useEffect(() => {
    const prevent = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest(".EmojiPickerReact")) return;
      e.preventDefault();
    };

    if (contextMenu.msg && !contextMenu.msg.deleted) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      window.addEventListener("wheel", prevent, { passive: false });
      window.addEventListener("touchmove", prevent, { passive: false });

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("wheel", prevent as EventListener);
        window.removeEventListener("touchmove", prevent as EventListener);
      };
    }
  }, [contextMenu.msg]);

  useEffect(() => {
    if (!replyingTo && !editingMessage) return;

    const nearBottom = isNearBottom();
    if (!nearBottom) return;

    requestAnimationFrame(() => {
      scrollToBottom(true);
    });
  }, [replyingTo, editingMessage]);

  let groupStart: MessageType | null = null;
  const GROUP_INTERVAL = 300; // 5 minutes

  return (
    <div className="relative flex-1 flex flex-col h-full">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="messages-container flex-1 flex flex-col overflow-y-scroll pb-3
          scrollbar scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
      >
        {/* Initial loading skeleton */}
        {/* {isInitialLoading && (
          <div className="flex flex-col gap-4 p-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-base-300/50" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className={`h-4 bg-base-300/50 rounded ${i % 2 === 0 ? 'w-3/4 ml-auto' : 'w-2/3'}`} />
                  <div className={`h-12 bg-base-300/50 rounded-2xl ${i % 2 === 0 ? 'w-4/5 ml-auto' : 'w-3/4'}`} />
                </div>
              </div>
            ))}
          </div>
        )} */}

        {/* Pagination loading with fade animation */}
        {loadingMore && !isInitialLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center items-center py-3"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-base-200/50 rounded-full">
              <span className="loading loading-spinner loading-xs opacity-60" />
              <span className="text-xs opacity-60">Loading messages...</span>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {!isInitialLoading &&
            messages.map((msg, index) => {
              let grouped = false;
              if (!groupStart) {
                // First message in entire list
                groupStart = msg;
                grouped = false;
              } else {
                const sameSender = msg.sender._id === groupStart.sender._id;

                const diffSeconds =
                  (new Date(msg.createdAt).getTime() -
                    new Date(groupStart.createdAt).getTime()) /
                  1000;

                if (sameSender && diffSeconds < GROUP_INTERVAL) {
                  grouped = true;
                } else {
                  // Start new group
                  groupStart = msg;
                  grouped = false;
                }
              }

              const prev = messages[index - 1];

              const newDay = isNewDay(msg, prev);
              const next = messages[index + 1];

              const nextInSameGroup =
                next &&
                next.sender._id === msg.sender._id &&
                (new Date(next.createdAt).getTime() -
                  new Date(msg.createdAt).getTime()) /
                  1000 <
                  300;

              const isLastInGroup = !nextInSameGroup;
              const isLastMessage = index === messages.length - 1;

              // Animate only the specific message ID we flagged as new.
              // Reading a ref here is intentional: we want the current value
              // at render time without subscribing to it as reactive state.
              const shouldAnimate = msg._id === animatedMessageIdRef.current;

              const isMe = msg.sender._id === currentUser._id;
              const senderName = isMe
                ? "You"
                : msg.sender.displayName || msg.sender.username;
              const profilePic = isMe
                ? currentUser.profilePic || "/default-pfp.png"
                : msg.sender.profilePicture?.url || "/default-pfp.png";

              return (
                <motion.div
                  id={`msg-${msg._id}`}
                  key={msg._id}
                  initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                  onContextMenu={(e) => openContextMenu(e, msg)}
                  onTouchStart={(e) => handleTouchStart(msg, e)}
                  onTouchEnd={handleTouchEnd}
                >
                  {newDay && (
                    <div className="flex items-center my-4 w-full">
                      <hr className="flex-grow border-t border-base-content opacity-10" />
                      <span className="opacity-50 text-base-content text-xs mx-3 whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <hr className="flex-grow border-t border-base-content opacity-10" />
                    </div>
                  )}

                  {unreadDividerIndex === index && (
                    <div className="flex items-center justify-center my-2">
                      <div className="bg-primary text-white text-xs px-3 py-1 rounded-full shadow">
                        New Messages
                      </div>
                    </div>
                  )}

                  <ChatBubble
                    msg={msg}
                    isMe={isMe}
                    grouped={grouped}
                    isLastInGroup={isLastInGroup}
                    senderName={senderName}
                    scrollToMessage={scrollToMessage}
                    replyingTo={replyingTo}
                    editingMessage={editingMessage}
                    profilePic={profilePic}
                    handleReaction={handleReaction}
                    contextMenu={contextMenu}
                    isLastMessage={isLastMessage}
                    highlightedMessageId={highlightedMessageId}
                  />

                  {contextMenu.msg?._id === msg._id && !msg.deleted && (
                    <ContextMenu
                      contextMenuRef={contextMenuRef}
                      contextMenu={contextMenu}
                      isMe={isMe}
                      openFullPicker={openFullPicker}
                      msg={msg}
                      handleReply={handleReply}
                      closeContextMenu={closeContextMenu}
                      setReplyingTo={setReplyingTo}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  )}
                </motion.div>
              );
            })}
        </AnimatePresence>

        <AnimatePresence>
          {Object.keys(typingUsers).length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="chat chat-start px-17 py-[1px]"
            >
              <div className="bg-base-100 flex items-center gap-2 shadow text-base-content px-4 rounded-2xl py-1">
                <span className="loading loading-dots loading-md opacity-50" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UniversalEmojiPicker
        visible={showFullPicker.visible}
        setVisible={(v: boolean) =>
          setShowFullPicker({ visible: v, msgId: null })
        }
        onSelect={(emoji: string) => {
          const msg = reactionTargetRef.current;
          if (msg) {
            handleReaction(msg, emoji);
          }
        }}
      />

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            type="button"
            onClick={scrollToBottomInstant}
            aria-label="Scroll to bottom"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute flex items-center justify-center 
              bottom-0 right-4 mb-5 p-2 
              bg-base-100 text-base-content/40 
              hover:bg-base-200 cursor-pointer 
              rounded-full shadow"
          >
            <ChevronDown size={25} strokeWidth={3} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewMsgBadge && (
          <motion.div
            onClick={scrollToBottomInstant}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-4 mb-5 z-50
              flex items-center gap-1
              pl-4 px-2 py-2
              rounded-full
              bg-base-content
              font-semibold
              text-sm
              cursor-pointer shadow"
          >
            New messages <ChevronsDown size={18} strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
