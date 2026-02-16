"use client";

import { UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { addFriend } from "@/redux/features/friendsSlice";

export default function AddFriendInput() {
  const [username, setUsername] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const dispatch = useAppDispatch();
  const { actionLoading } = useAppSelector((state) => state.friends);

  useEffect(() => {
    if (!statusMsg) return;

    const timer = setTimeout(() => {
      setStatusMsg("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [statusMsg]);

  const handleAddFriend = async () => {
    if (!username.trim() || actionLoading) return;

    const value = username.trim();
    setUsername("");         
    setStatusMsg("");

    try {
      await dispatch(addFriend(value)).unwrap();
      setStatusMsg(`Friend request sent to ${value}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStatusMsg(err.message);
      } else {
        setStatusMsg("Failed to send request");
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (statusMsg) setStatusMsg("");
          }}
          placeholder="Enter friend's Whip username"
          className="w-full h-12 pl-5 focus:outline-1 text-sm hover:outline-1 outline-base-content/10 rounded-full bg-base-300"
        />

        <div className="absolute right-0 top-1/2 -translate-y-1/2 px-2 flex items-center">
          <button
            type="button"
            aria-label="Send friend request"
            onClick={handleAddFriend}
            disabled={!username.trim() || actionLoading}
            className="bg-[#004030] text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-auto"
          >
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      {statusMsg && (
        <p className="text-sm text-[#004030] text-center py-2">
          {statusMsg}
        </p>
      )}
    </div>
  );
}