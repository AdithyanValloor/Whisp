import { MessageType } from "@/redux/features/messageSlice";
import { SmilePlus, Reply, Pencil, Trash2, Copy } from "lucide-react";
import { motion } from "framer-motion";

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
  onDelete
}: ContextMenuProps) {
  return (
    <motion.div
      ref={contextMenuRef}
      initial={{ 
        opacity: 0, 
        scale: 0.95, 
        y: contextMenu.position === "top" ? 10 : -10 
      }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 border border-base-content/10 bg-base-100 shadow-lg rounded-lg w-40"
      style={{
        left: `${contextMenu.x}px`,
        top: `${contextMenu.y}px`,
      }}
    >
      <ul className="menu menu-compact w-full">
        
        {/* React */}
        <li>
          <button
            className="my-[2px] rounded-md hover:bg-base-200 w-full flex justify-between items-center px-3"
            onClick={() => {
              openFullPicker(msg._id);
            }}
          >
            <span>React</span>
            <SmilePlus size={18} className="ml-2" />
          </button>
        </li>

        {/* Reply */}
        <li>
          <button
            className="my-[2px] rounded-md hover:bg-base-200 w-full flex justify-between items-center px-3"
            onClick={() => {
              handleReply(msg);
              closeContextMenu();
            }}
          >
            <span>Reply</span>
            <Reply size={18} className="ml-2" />
          </button>
        </li>

        {/* Edit / Delete (Only for Me) */}
        {isMe && (
          <>
            <li>
              <button
                className="my-[2px] rounded-md hover:bg-base-200 w-full flex justify-between items-center px-3"
                onClick={() => {
                  setReplyingTo(null);
                  onEdit?.(msg);
                  closeContextMenu();
                }}
              >
                <span>Edit</span>
                <Pencil size={18} className="ml-2" />
              </button>
            </li>

            <li>
              <button
                className="my-[2px] rounded-md hover:bg-base-200 w-full flex justify-between items-center px-3"
                onClick={() => {
                  onDelete?.(msg);
                  closeContextMenu();
                }}
              >
                <span>Delete</span>
                <Trash2 size={18} className="ml-2" />
              </button>
            </li>
          </>
        )}

        {/* Copy */}
        <li>
          <button
            className="my-[2px] rounded-md hover:bg-base-200 w-full flex justify-between items-center px-3"
            onClick={() => {
              navigator.clipboard.writeText(msg.content);
              closeContextMenu();
            }}
          >
            <span>Copy</span>
            <Copy size={18} className="ml-2" />
          </button>
        </li>
      </ul>
    </motion.div>
  );
}