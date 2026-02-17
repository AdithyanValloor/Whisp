"use client";

import { EllipsisVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchFriends, removeFriend } from "@/redux/features/friendsSlice";
import { accessChat } from "@/redux/features/chatSlice";
import FriendCard from "../Message/FriendCard";
import IconButton from "../GlobalComponents/IconButtons";

interface AllFriendsProps {
  setActiveTab: (tab: string) => void;
}

export default function AllFriends({ setActiveTab }: AllFriendsProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { friends, listLoading } = useAppSelector(
    (state) => state.friends
  );
  const { user } = useAppSelector((state) => state.auth);
  const onlineUsers = useAppSelector((state) => state.presence.users);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMenuId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(".dropdown") ||
        target.closest("[data-right-slot]")
      ) {
        return;
      }

      setActiveMenuId(null);
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuId]);

  useEffect(() => {
    dispatch(fetchFriends());
  }, [dispatch]);

  const openChat = async (friendId: string) => {
    if (!user) return;

    const chat = await dispatch(accessChat(friendId)).unwrap();

    router.push(`/chat/${chat._id}`);
    setActiveTab("Inbox");
  };

  if (listLoading) {
    return (
      <div className="flex justify-center p-4">
        <span className="loading loading-spinner loading-xs" />
      </div>
    );
  }

  if (!friends.length) {
    return (
      <p className="p-3 text-center opacity-70">
        No friends to show
      </p>
    );
  }
  

  return (
    <div className="flex flex-col gap-1">
      {friends.map((friend) => {
        
        return (
          <FriendCard
            key={friend._id}
            msgId={friend._id}
            user={{
              name: friend.username,
              displayName: friend.displayName ?? friend.username,
              profilePic: friend.profilePicture?.url || "/default-pfp.png",
            }}
            forceActive={activeMenuId === friend._id}
            chatType="personal"
            onClick={() => openChat(friend._id)}
            rightSlot={
              <div className="flex gap-1">
                <div className="dropdown dropdown-end">
                  <IconButton
                    ariaLabel="More options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(
                        activeMenuId === friend._id ? null : friend._id
                      );
                    }}
                  >
                    <EllipsisVertical size={20} strokeWidth={1.5} />
                  </IconButton>

                  <ul
                    className="menu dropdown-content mt-1 bg-base-100 rounded-box w-32 p-2 shadow"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <li>
                      <button
                        className="text-red-600"
                        onClick={() => {
                          dispatch(removeFriend(friend._id));
                          setActiveMenuId(null);
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
