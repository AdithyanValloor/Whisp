"use client";

import { MessageType } from "@/redux/features/messageSlice";
import { SmilePlus, Reply, Pencil, Trash2, Copy, Forward } from "lucide-react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";

interface ContextMenuProps {
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  contextMenu: {
    x: number;
    y: number;
    msg: MessageType | null;
    position: "top" | "bottom";
  };
  isMe: boolean;
  openFullPicker: (msgId: string) => void;
  msg: MessageType;
  handleReply: (msg: MessageType) => void;
  closeContextMenu: () => void;
  setReplyingTo: (msg: MessageType | null) => void;
  onEdit?: (msg: MessageType) => void;
  onDelete?: (msg: MessageType) => void;
}

export default function ContextMenu({
  contextMenuRef,
  contextMenu,
  isMe,
  openFullPicker,
  msg,
  handleReply,
  closeContextMenu,
  setReplyingTo,
  onEdit,
  onDelete,
}: ContextMenuProps) {
  const menuItems = [
    {
      label: "React",
      icon: SmilePlus,
      action: () => {
        openFullPicker(msg._id);
      },
      show: true,
    },
    {
      label: "Reply",
      icon: Reply,
      action: () => {
        handleReply(msg);
        closeContextMenu();
      },
      show: true,
    },
    {
      label: "Foreward",
      icon: Forward,
      action: () => {
        handleReply(msg);
        closeContextMenu();
      },
      show: true,
    },
    {
      label: "Edit",
      icon: Pencil,
      action: () => {
        setReplyingTo(null);
        onEdit?.(msg);
        closeContextMenu();
      },
      show: isMe,
    },
    {
      label: "Copy",
      icon: Copy,
      action: () => {
        navigator.clipboard.writeText(msg.content);
        closeContextMenu();
      },
      show: true,
    },
    {
      label: "Delete",
      icon: Trash2,
      action: () => {
        onDelete?.(msg);
        closeContextMenu();
      },
      show: isMe,
      danger: true,
    },
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {contextMenu.msg && (
        <>
          {/* Backdrop Layer */}
          <div
            className="fixed inset-0 z-[99998]"
            onClick={closeContextMenu}
            onContextMenu={closeContextMenu}
          />

          {/* Menu */}
          <motion.div
            ref={contextMenuRef}
            initial={{
              opacity: 0,
              scale: 0.96,
              y: contextMenu.position === "top" ? 6 : -6,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="fixed z-[99999] bg-base-100 border border-base-content/10 shadow-xl rounded-xl w-48 p-1.5 backdrop-blur-sm"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <ul className="flex flex-col gap-1">
              {menuItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.label}
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
                      }`}
                      onClick={item.action}
                    >
                      <span>{item.label}</span>
                      <Icon size={16} className="opacity-70" />
                    </button>
                  );
                })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
