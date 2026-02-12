"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  X,
  ArrowLeft,
  UserMinus,
  Shield,
  ShieldOff,
} from "lucide-react";
import { useAppSelector } from "@/redux/hooks";
import FriendCardGroup from "../Message/FriendCardGroup";
import ProfileView from "./profileView";
import Image from "next/image";

interface GroupSidebarProps {
  group: {
    _id: string;
    chatName: string;
    members: {
      _id: string;
      username: string;
      displayName?: string;
      profilePicture?: { url: string | null };
      status?: string | null | undefined;
    }[];
    admin?: { _id: string }[];
  };
  currentUserId: string;
  onAddMembers?: (userIds: string[]) => void;
  onLeaveGroup?: () => void;
  onDeleteGroup?: () => void;
  onRemoveMember?: (userId: string) => void;
  onMakeAdmin?: (userId: string) => void;
  onRemoveAdmin?: (userId: string) => void;
}

export default function GroupSidebar({
  group,
  currentUserId,
  onAddMembers,
  onLeaveGroup,
  onDeleteGroup,
  onRemoveMember,
  onMakeAdmin,
  onRemoveAdmin,
}: GroupSidebarProps) {
  const [selectedProfile, setSelectedProfile] = useState<null | typeof group.members[0]>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const { friends } = useAppSelector((state) => state.friends);
  const adminIds = new Set(group.admin?.map((a) => a._id) || []);
  const membersWithRoles = group.members.map((m) => ({
    ...m,
    role: adminIds.has(m._id) ? "admin" : "member",
  }));
  const isAdmin = adminIds.has(currentUserId);

  useEffect(() => {
    if (!showAddModal) return;
    const available = friends.filter(
      (f: any) => !group.members.some((m) => m._id === f._id)
    );
    setAvailableFriends(available);
  }, [showAddModal, friends, group.members]);

  const toggleUserSelection = (id: string) => {
    setSelectedUsers((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };

    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openDropdownId]);

  const handleAddSelected = () => {
    if (onAddMembers) onAddMembers(Array.from(selectedUsers));
    setSelectedUsers(new Set());
    setShowAddModal(false);
  };

  const handleProfileSelect = (member: typeof group.members[0]) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedProfile(member);
      setIsTransitioning(false);
    }, 150);
  };

  const handleProfileBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedProfile(null);
      setIsTransitioning(false);
    }, 150);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Main Group Info View */}
      <div
        className={`absolute inset-0 transition-all duration-300 ease-in-out ${
          selectedProfile 
            ? '-translate-x-full opacity-0' 
            : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="relative flex flex-col w-full h-full bg-base-200 overflow-hidden">
          {/* Header banner */}
          <div className="relative h-32 bg-base-300">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="absolute top-3 right-3 flex items-center gap-1 p-2 rounded-full border border-[#004030] text-[#004030] hover:bg-[#004030] hover:text-white transition-all"
              >
                <UserPlus size={16} />
                <span className="text-sm">Add</span>
              </button>
            )}
          </div>

          {/* Floating group picture + info card */}
          <div className="relative px-5 -mt-12 z-10">
            <div className="flex flex-col items-center text-center bg-base-100 rounded-xl p-4 border border-base-content/10">
              <div className="w-20 h-20 rounded-full bg-base-200 border border-base-content/10 flex items-center justify-center text-3xl font-semibold">
                {group.chatName[0]}
              </div>
              <h2 className="mt-3 text-lg font-semibold">{group.chatName}</h2>
              <p className="text-sm opacity-70">{group.members.length} members</p>
            </div>
          </div>

          {/* Members list */}
          <div className="mt-4 mx-5 bg-base-100 rounded-xl border border-base-content/10 py-4 flex-1 overflow-y-auto">
            <p className="px-4 text-[11px] uppercase font-medium opacity-60 tracking-wide mb-2">
              Members
            </p>
            <ul className="flex flex-col gap-1">
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
                      setOpenDropdownId(m._id);
                    }
                  }}
                  className="hover:bg-base-200 py-1 px-3 rounded-md transition-colors cursor-pointer relative"
                >
                  <FriendCardGroup member={m} />
                  
                  {/* Context menu dropdown */}
                  {isAdmin && m._id !== currentUserId && openDropdownId === m._id && (
                    <div 
                      className="absolute right-2 top-8 bg-base-100 rounded-lg z-[100] w-44 p-2 shadow-xl border border-base-content/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ul className="menu menu-compact w-full p-0">
                        <li>
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
                          <li>
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
                          <li>
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

          {/* Actions */}
          <div className="mx-5 mt-4 mb-5 flex items-center justify-between bg-base-100 rounded-xl p-3 border border-base-content/10">
            {isAdmin ? (
              <button
                type="button"
                onClick={onDeleteGroup}
                className="p-2 w-full rounded-lg border border-red-700 text-red-700 hover:bg-red-700 hover:text-white transition-all"
              >
                Delete Group
              </button>
            ) : (
              <button
                type="button"
                onClick={onLeaveGroup}
                className="p-2 w-full rounded-lg border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all"
              >
                Leave Group
              </button>
            )}
          </div>

          {/* Accent footer */}
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#004030]" />
        </div>
      </div>

      {/* Profile View */}
      <div
        className={`absolute inset-0 transition-all duration-300 ease-in-out ${
          selectedProfile 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0'
        }`}
      >
        {selectedProfile && (
          <div className="bg-base-200 h-full flex flex-col relative border border-base-content/10">
            <button
              className="m-2 p-2 rounded-full hover:bg-base-300 transition absolute top-0 left-0 cursor-pointer z-10"
              onClick={handleProfileBack}
              type="button"
            >
              <ArrowLeft size={19} />
            </button>
            <ProfileView user={selectedProfile} />
          </div>
        )}
      </div>

      {/* Add Members Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-base-100 p-4 rounded-xl w-80 max-h-[80vh] overflow-y-auto relative border border-base-content/10 animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-base-200 transition"
            >
              <X size={18} />
            </button>
            <h3 className="font-semibold text-lg mb-3">Add Members</h3>
            {availableFriends.length === 0 ? (
              <p className="text-sm text-center opacity-60">No friends to add</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {availableFriends.map((u) => (
                  <li
                    key={u._id}
                    className={`p-2 rounded-lg flex items-center justify-between cursor-pointer border border-transparent transition-all ${
                      selectedUsers.has(u._id)
                        ? "bg-[#004030]/10 border-[#004030]"
                        : "hover:bg-base-200"
                    }`}
                    onClick={() => toggleUserSelection(u._id)}
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={u.profilePicture?.url || "/default-pfp.png"}
                        alt={u.username}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <span className="text-sm">{u.username}</span>
                    </div>
                    {selectedUsers.has(u._id) && (
                      <span className="text-[#004030] font-bold">✓</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={selectedUsers.size === 0}
              className="mt-4 w-full p-2 bg-[#004030] text-white rounded-lg hover:bg-[#006644] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Selected
            </button>
          </div>
        </div>
      )}
    </div>
  );
}