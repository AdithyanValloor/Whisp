"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Archive,
  Pin,
  Trash2,
  XCircle,
  MailOpen,
  Ban,
  UserMinus,
  LogOut,
} from "lucide-react";

interface InboxContextMenuProps {
  x: number;
  y: number;
  position: "top" | "bottom";
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  chatId?: string;
  chatType?: "personal" | "group" | "other";
}

export default function InboxContextMenu({
  x,
  y,
  onClose,
  menuRef,
  position,
  chatType,
  chatId,
}: InboxContextMenuProps) {
  const menuItems = [
    { label: "Pin Chat", icon: Pin },
    { label: "Archive Chat", icon: Archive },
    { label: "Mark as Unread", icon: MailOpen },
    { label: "Close Chat", icon: XCircle },
    { divider: true },

    ...(chatType === "personal"
      ? [
          { label: "Remove Friend", icon: UserMinus, danger: true },
          { label: "Block User", icon: Ban, danger: true },
        ]
      : []),

    ...(chatType === "group"
      ? [{ label: "Exit Group", icon: LogOut, danger: true }]
      : []),

    { label: "Delete Chat", icon: Trash2, danger: true },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 99998 }}
        onClick={onClose}
        onContextMenu={onClose}
      />

      <motion.div
        ref={menuRef}
        initial={{
          opacity: 0,
          scale: 0.96,
          y: position === "bottom" ? 6 : -6,
        }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className="fixed z-[99999] bg-base-100 border border-base-content/10 shadow-xl rounded-xl w-48 p-1.5 backdrop-blur-sm"
        style={{
          left: x,
          ...(position === "bottom"
            ? { top: y }
            : { bottom: window.innerHeight - y }),
        }}
      >
        <ul className="flex flex-col gap-1">
          {menuItems.map((item, index) => {
            if ("divider" in item) {
              return (
                <hr
                  key={`divider-${index}`}
                  className="my-1 border-base-content/10"
                />
              );
            }

            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: wire up real actions using chatId
                  onClose();
                }}
                className={`
                  flex items-center justify-between
                  w-full px-3 py-2
                  rounded-lg
                  text-sm
                  transition-colors duration-150
                  cursor-pointer
                  ${
                    item.danger
                      ? "text-red-400 hover:bg-red-400/10"
                      : "text-base-content hover:bg-base-content/10"
                  }
                `}
              >
                <span>{item.label}</span>
                <Icon size={16} className="ml-2 flex-shrink-0 opacity-70" />
              </button>
            );
          })}
        </ul>
      </motion.div>
    </>,
    document.body,
  );
}
