"use client";

import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useAppSelector } from "@/redux/hooks";
import AllFriends from "./AllFriends";
import Requests from "./Requests";
import AddFriendInput from "../GlobalComponents/AddFriendInput";
import SearchInput from "../GlobalComponents/SearchInput";

type FriendsTab = "all" | "pending" | "add";

interface FriendSectionProps {
  setActiveTab: (tab: string) => void;
}

export default function FriendsSection({ setActiveTab }: FriendSectionProps) {
  const [tab, setTab] = useState<FriendsTab>("all");

  const { requests } = useAppSelector((state) => state.friends);

  const pendingCount = useMemo(
    () => requests.incoming.length,
    [requests.incoming.length],
  );

  return (
    <div className="h-full w-full p-3 flex flex-col gap-3 relative">
      <h1 className="text-2xl font-semibold text-base-content p-1">Friends</h1>

      {/* Tabs */}
      <div className="relative flex border-b border-base-content/10 mt-2">
        {(
          [
            { key: "all", label: "All Friends" },
            { key: "pending", label: `Pending ` },
            { key: "add", label: "Add Friend" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="flex-1 py-2 text-sm cursor-pointer"
          >
            <span
              className={`relative inline-flex items-center justify-center gap-2
                transition-colors duration-200
                ${tab === key ? "text-base-content" : "text-base-content/70"}`}
            >
              {label}
              {key === "pending" && pendingCount > 0 && (
                <span className="absolute -right-5 -top-1 leading-none border-2 border-base-200 bg-red-700 font-semibold text-white font-sans text-[10px] rounded-full min-w-5 h-5 px-[4px] flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </span>
          </button>
        ))}

        {/* Active underline */}
        <span
          className="absolute bottom-0 left-0 h-[1px] w-1/3 bg-base-content
            transition-transform duration-300 ease-out"
          style={{
            transform:
              tab === "all"
                ? "translateX(0%)"
                : tab === "pending"
                  ? "translateX(100%)"
                  : "translateX(200%)",
          }}
        />
      </div>

      {/* Search / Add */}
      {tab === "add" ? <AddFriendInput /> : <SearchInput />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "all" && <AllFriends setActiveTab={setActiveTab} />}
        {tab === "pending" && <Requests />}
      </div>
    </div>
  );
}
