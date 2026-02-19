"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  X,
  ArrowLeft,
  UserMinus,
  Shield,
  ShieldOff,
  LogOut,
  Trash2,
} from "lucide-react";
import { useAppSelector } from "@/redux/hooks";
import ProfileView from "./profileView";
import Image from "next/image";
import FriendCard from "../Message/FriendCard";
import IconButton from "../GlobalComponents/IconButtons";
import AddMembersModal from "../chat/AddMembersModal";
import ConfirmModal from "../GlobalComponents/ConfirmModal";
import TransferOwnershipModal from "../chat/TransferOwnershipModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: { url: string | null };
}

interface MemberWithRole extends Member {
  role: "admin" | "member" | "owner";
}

interface Friend {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: { url: string | null };
}

interface Group {
  _id: string;
  chatName: string;
  members: Member[];
  admin?: Member[];
  createdBy?: Member;
}

interface GroupSidebarProps {
  group: Group;
  currentUserId: string;
  onAddMembers?: (userIds: string[]) => void;
  onLeaveGroup?: () => void;
  onDeleteGroup?: () => void;
  onRemoveMember?: (userId: string) => void;
  onMakeAdmin?: (userId: string) => void;
  onRemoveAdmin?: (userId: string) => void;
  onTransferOwnership?: (userId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GroupSidebar({
  group,
  currentUserId,
  onAddMembers,
  onLeaveGroup,
  onDeleteGroup,
  onTransferOwnership,
  onRemoveMember,
  onMakeAdmin,
  onRemoveAdmin,
}: GroupSidebarProps) {
  const [selectedProfile, setSelectedProfile] = useState<MemberWithRole | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [dropdownPos, setDropdownPos] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const { friends } = useAppSelector((state) => state.friends);

  const adminIds = new Set(group.admin?.map((a) => a._id) ?? []);

  const creatorId = group.createdBy?._id;
  const isOwner = creatorId === currentUserId;
  const isAdmin = adminIds.has(currentUserId);
  const canManageMembers = isOwner || isAdmin;

  const membersWithRoles: MemberWithRole[] = group.members.map((m) => {
    if (m._id === creatorId) {
      return { ...m, role: "owner" };
    }

    if (adminIds.has(m._id)) {
      return { ...m, role: "admin" };
    }

    return { ...m, role: "member" };
  });

  console.log("MEMBER WITH ROLES : =====================", membersWithRoles);
  

console.log(
  "Duplicate check:",
  new Set(membersWithRoles.map(m => m._id)).size,
  membersWithRoles.length
);

  console.log("creatorId:", creatorId);
  console.log(
    "members:",
    group.members.map((m) => m._id),
  );

  // Populate available friends when modal opens
  useEffect(() => {
    if (!showAddModal) return;
    const available = (friends as Friend[]).filter(
      (f) => !group.members.some((m) => m._id === f._id),
    );
    setAvailableFriends(available);
  }, [showAddModal, friends, group.members]);

  // Close dropdown on outside click
  const handleClickOutside = useCallback(() => setOpenDropdownId(null), []);

  useEffect(() => {
    if (!openDropdownId) return;
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdownId, handleClickOutside]);

  const toggleUserSelection = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSelected = () => {
    onAddMembers?.(Array.from(selectedUsers));
    setSelectedUsers(new Set());
    setShowAddModal(false);
  };

  const handleProfileSelect = (member: MemberWithRole) => {
    setSelectedProfile(member);
  };

  const handleProfileBack = () => {
    setSelectedProfile(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full text-base-content overflow-hidden bg-base-200">
      {/* ── Main Group Info Panel ── */}
      <div
        className={`
          absolute inset-0 flex flex-col
          transition-transform duration-300 ease-in-out will-change-transform
          ${selectedProfile ? "-translate-x-full" : "translate-x-0"}
        `}
      >
        {/* Scrollable content wrapper */}
        <div className="flex flex-col w-full h-full overflow-y-auto overflow-x-hidden px-3 pb-4">
          {/* Add Members button */}
          {isAdmin && (
            <div className="flex justify-end py-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-green-900 text-green-500 hover:bg-green-900/30 cursor-pointer transition-colors text-sm"
              >
                <UserPlus size={15} />
                <span>Add</span>
              </button>
            </div>
          )}

          {/* Group profile card */}
          <div className={`mt-${isAdmin ? "2" : "10"} shrink-0`}>
            <div className="flex border border-base-content/10 flex-col items-center text-center bg-base-100 rounded-xl p-4 shadow">
              <div className="w-20 h-20 rounded-full bg-base-200 border border-base-content/10 flex items-center justify-center text-3xl font-semibold select-none">
                {group.chatName[0]}
              </div>
              <h2 className="mt-3 text-lg font-semibold">{group.chatName}</h2>
              <p className="text-sm opacity-70">
                {group.members.length}{" "}
                {group.members.length === 1 ? "member" : "members"}
              </p>
            </div>
          </div>

          {/* About */}
          <div className="mt-4 bg-base-100 border border-base-content/10 rounded-xl shadow p-4 shrink-0">
            <p className="text-[11px] uppercase font-medium opacity-60 tracking-wide">
              About
            </p>
            <p className="text-sm mt-1 leading-relaxed">
              Group description goes here.
            </p>
          </div>

          {/* Members list */}
          <div className="mt-4 shrink-0">
            <p className="text-[11px] uppercase font-medium opacity-60 tracking-wide px-4">
              {group.members.length}{" "}
              {group.members.length === 1 ? "Member" : "Members"}
            </p>

            <ul className="flex flex-col">
              {membersWithRoles.map((m) => (
                <li
                  key={m._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProfileSelect(m);
                  }}
                  onContextMenu={(e) => {
                    if (isAdmin && m._id !== currentUserId) {
                      e.preventDefault();
                      e.stopPropagation();

                      if (openDropdownId === m._id) {
                        setOpenDropdownId(null);
                        return;
                      }

                      const rect = e.currentTarget.getBoundingClientRect();

                      const menuWidth = 176; // w-44
                      const menuHeight = 140; // approx

                      let offsetX = e.clientX - rect.left;
                      let offsetY = e.clientY - rect.top;

                      // Prevent RIGHT overflow
                      if (offsetX + menuWidth > rect.width) {
                        offsetX = rect.width - menuWidth - 8;
                      }

                      // Prevent LEFT overflow
                      if (offsetX < 8) {
                        offsetX = 8;
                      }

                      // Prevent BOTTOM overflow
                      if (offsetY + menuHeight > rect.height) {
                        offsetY = rect.height - menuHeight - 8;
                      }

                      // Prevent TOP overflow
                      if (offsetY < 8) {
                        offsetY = 8;
                      }

                      setDropdownPos({ x: offsetX, y: offsetY });
                      setOpenDropdownId(m._id);
                    }
                  }}
                  className="hover:bg-base-200 py-1 rounded-md transition-colors cursor-pointer relative"
                >
                  <FriendCard
                    groupMember={{
                      _id: m._id,
                      username: m.username,
                      displayName: m.displayName ?? m.username,
                      profilePicture: m.profilePicture,
                      role: m.role,
                    }}
                    openDropdown={openDropdownId === m._id}
                    msgId={m._id}
                  />

                  {/* Context menu dropdown */}
                  {canManageMembers &&
                    m._id !== currentUserId &&
                    openDropdownId === m._id && (
                      <div
                        style={{
                          position: "absolute",
                          top: dropdownPos.y,
                          left: dropdownPos.x,
                        }}
                        className="bg-base-100 rounded-lg z-[100] w-44 p-2 shadow-xl border border-base-content/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ul className="menu menu-compact w-full p-0">
                          <li key={`remove-${m._id}`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveMember?.(m._id);
                                setOpenDropdownId(null);
                              }}
                              className="flex justify-between items-center"
                            >
                              <span>Remove User</span>
                              <UserMinus size={16} />
                            </button>
                          </li>

                          {m.role === "member" ? (
                            <li key={`make-admin-${m._id}`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMakeAdmin?.(m._id);
                                  setOpenDropdownId(null);
                                }}
                                className="flex justify-between items-center"
                              >
                                <span>Make Admin</span>
                                <Shield size={16} />
                              </button>
                            </li>
                          ) : (
                            <li key={`remove-admin-${m._id}`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveAdmin?.(m._id);
                                  setOpenDropdownId(null);
                                }}
                                className="flex justify-between items-center"
                              >
                                <span>Remove Admin</span>
                                <ShieldOff size={16} />
                              </button>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                </li>
              ))}
            </ul>
          </div>
          <div className="py-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setShowLeaveModal(true);
              }}
              className="w-full cursor-pointer px-6 py-4 rounded-lg flex items-center gap-3 text-red-400 text-sm font-medium hover:bg-base-content/5"
            >
              <LogOut />
              Leave Group
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full cursor-pointer px-6 py-4 rounded-lg flex items-center gap-3 text-red-400 text-sm font-medium hover:bg-base-content/5"
              >
                <Trash2 />
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile View Panel ── */}
      <div
        className={`
          absolute inset-0
          transition-transform duration-300 ease-in-out will-change-transform
          ${selectedProfile ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="relative h-full w-full overflow-y-auto">
          {selectedProfile && (
            <ProfileView onBack={handleProfileBack} user={selectedProfile} />
          )}
        </div>
      </div>

      <AddMembersModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        availableFriends={availableFriends}
        selectedUsers={selectedUsers}
        toggleUserSelection={toggleUserSelection}
        handleAddSelected={handleAddSelected}
      />

      {showLeaveModal && (
        <ConfirmModal
          open
          title={
            isOwner ? `Transfer Ownership Required` : `Exit ${group.chatName}`
          }
          confirmText={isOwner ? "Continue" : "Leave Group"}
          cancelText="Cancel"
          onCancel={() => setShowLeaveModal(false)}
          onConfirm={() => {
            setShowLeaveModal(false);
            if (isOwner) {
              setShowTransferModal(true);
            } else {
              onLeaveGroup?.();
            }
          }}
          description={
            isOwner
              ? `You are the owner of this group. 
           You must transfer ownership to another member before leaving.`
              : `Are you sure you want to leave this group? 
           You won't be able to rejoin unless invited again.`
          }
        />
      )}

      {isOwner && showTransferModal && (
        <TransferOwnershipModal
          show={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          members={group.members}
          currentUserId={currentUserId}
          onTransfer={(newOwnerId) => {
            setShowTransferModal(false);
            onTransferOwnership?.(newOwnerId);
            console.log("Transfer to:", newOwnerId);
          }}
        />
      )}

      {showDeleteModal && (
        <ConfirmModal
          open
          title={`Delete ${group.chatName}`}
          confirmText="Delete Group"
          cancelText="No"
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => {
            setShowDeleteModal(false);
            onDeleteGroup?.();
          }}
          description={`This will permanently delete "${group.chatName}" for all members. 
          All conversations and shared content will be removed. 
          This action cannot be undone.`}
        />
      )}
    </div>
  );
}
