"use client";

import { MessageType } from "@/redux/features/messageSlice";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { MdAddReaction } from "react-icons/md";
import { RiDeleteBin5Fill, RiEditFill, RiFileCopyFill, RiReplyFill, RiShareForwardFill } from "react-icons/ri";
import { FaEdit } from "react-icons/fa";
import { FaCopy, FaTrashCan } from "react-icons/fa6";

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
  setForward: (msg: MessageType | null) => void;
  SetShowForwardModal: () => void;
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
  setForward,
  SetShowForwardModal,
  onEdit,
  onDelete,
}: ContextMenuProps) {
  
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeContextMenu();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [closeContextMenu]);

  const menuItems = [
    {
      label: "React",
      icon: MdAddReaction,
      action: () => {
        openFullPicker(msg._id);
      },
      show: true,
    },
    {
      label: "Reply",
      icon: RiReplyFill,
      action: () => {
        handleReply(msg);
        closeContextMenu();
      },
      show: true,
    },
    {
      label: "Forward",
      icon: RiShareForwardFill,
      action: () => {
        setForward(msg);
        SetShowForwardModal();
        closeContextMenu();
      },
      show: true,
    },
    {
      label: "Edit",
      icon: RiEditFill,
      action: () => {
        setReplyingTo(null);
        onEdit?.(msg);
        closeContextMenu();
      },
      show: isMe && !msg.forwarded,
    },
    {
      label: "Copy",
      icon: RiFileCopyFill,
      action: () => {
        navigator.clipboard.writeText(msg.content);
        closeContextMenu();
      },
      show: true,
    },
    {
      label: "Delete",
      icon: RiDeleteBin5Fill,
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
                    <li key={item.label}>
                      <button
                        className={`
                        flex items-center justify-between 
                        w-full px-3 py-2 
                        rounded-lg 
                        text-sm 
                        transition-colors duration-150
                        cursor-pointer
                        opacity-80
                        ${
                          item.danger
                            ? "text-red-400 hover:bg-red-400/10"
                            : "text-base-content hover:bg-base-content/10"
                        }`}
                        onClick={item.action}
                      >
                        <span>{item.label}</span>
                        <Icon size={18}/>
                      </button>
                    </li>
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
