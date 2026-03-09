"use client";

import { useState, useMemo, useEffect } from "react";
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

  useEffect(() => {
    if (requests.incoming.length === 0 && requests.outgoing.length === 0) {
      setTab("all");
    }
  }, [requests.incoming.length, requests.outgoing.length]);

  const tabs = [
    "all",
    ...(requests.incoming.length > 0 || requests.outgoing.length > 0
      ? ["pending"]
      : []),
    "add",
  ];

  return (
    <div className="h-full w-full p-3 flex flex-col gap-3 relative">
      <h1 className="text-2xl font-semibold text-base-content p-1">Friends</h1>

      {/* Tabs */}
      <div className="relative flex border-b border-base-content/10 mt-2">
        {(
          [
            { key: "all", label: "All Friends" },
            ...(requests.incoming.length > 0 || requests.outgoing.length > 0
              ? [{ key: "pending", label: "Pending " } as const]
              : []),
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
                <span className="absolute -right-4 -top-1 leading-none  bg-red-600 font-semibold text-white text-xs rounded-full min-w-4 h-4 px-[4px] flex items-center justify-center">
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
            transform: `translateX(${tabs.indexOf(tab) * 100}%)`,
            width: `${100 / tabs.length}%`,
          }}
        />
      </div>

      {/* Search / Add */}
      {tab === "add" ? <AddFriendInput /> : <SearchInput />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "all" && <AllFriends setActiveTab={setActiveTab} />}
        {tab === "pending" &&
          (requests.incoming.length > 0 || requests.outgoing.length > 0 ? (
            <Requests />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/40">
              <span className="text-4xl">🎉</span>
              <p className="text-sm">No pending requests</p>
            </div>
          ))}
      </div>
    </div>
  );
}
