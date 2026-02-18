"use client";

import { Check, X } from "lucide-react";
import FriendCard from "../Message/FriendCard";
import IconButton from "../GlobalComponents/IconButtons";
import SearchInput from "../GlobalComponents/SearchInput";
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface User {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: { url: string | null };
}

interface AddMembersModalProps {
  show: boolean;
  onClose: () => void;
  availableFriends: User[];
  selectedUsers: Set<string>;
  toggleUserSelection: (id: string) => void;
  handleAddSelected: () => void;
}

export default function AddMembersModal({
  show,
  onClose,
  availableFriends,
  selectedUsers,
  toggleUserSelection,
  handleAddSelected,
}: AddMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return availableFriends;

    const query = searchQuery.toLowerCase();

    return availableFriends.filter(
      (friend) =>
        friend.displayName?.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query),
    );
  }, [availableFriends, searchQuery]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex text-base-content items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 5 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
            className="relative z-10 bg-base-200 flex flex-col gap-3 p-3 rounded-xl w-80 max-h-[80vh] overflow-y-auto border border-base-content/10 shadow-xl"
          >
            {/* HEADER */}
            <div className="flex pl-2 items-center justify-between">
              <h3 className="font-semibold text-lg">Add Members</h3>
              <IconButton onClick={onClose} ariaLabel="Close modal">
                <X size={18} />
              </IconButton>
            </div>

            {/* SEARCH */}
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends"
              autoFocus
            />

            {/* LIST */}
            {filteredFriends.length === 0 ? (
              <p className="text-sm text-center opacity-60">
                No friends to add
              </p>
            ) : (
              <ul>
                {filteredFriends.map((u) => {
                  const isSelected = selectedUsers.has(u._id);

                  return (
                    <li
                      key={u._id}
                      className={`relative my-1 rounded-lg w-full cursor-pointer border transition-all ${
                        isSelected
                          ? "bg-[#004030]/10 border-[#004030]"
                          : "border-transparent hover:bg-base-300"
                      }`}
                      onClick={() => toggleUserSelection(u._id)}
                    >
                      <FriendCard
                        groupMember={{
                          _id: u._id,
                          username: u.username,
                          displayName: u.displayName ?? u.username,
                          profilePicture: u.profilePicture,
                        }}
                        msgId={u._id}
                      />

                      {isSelected && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#004030]">
                          <Check />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* BUTTON */}
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={selectedUsers.size === 0}
              className="mt-4 w-full p-2 cursor-pointer bg-[#004030] text-white rounded-lg hover:bg-[#006644] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Selected
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
