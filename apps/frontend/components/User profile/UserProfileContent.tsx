"use client";

import { Settings, CalendarDays } from "lucide-react";
import ProfilePicture from "../ProfilePicture/ProfilePicture";
import { useAppSelector } from "@/redux/hooks";

interface UserProfileProps {
  openSettings: () => void;
}

export default function UserProfile({ openSettings }: UserProfileProps) {
  const user = useAppSelector((state: any) => state.auth.user);

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm opacity-70">No user loaded</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-full h-full bg-base-200 overflow-hidden border border-base-300">
      {/* Header banner - flat solid color */}
      <div className="relative h-32 bg-base-300">
        <button
          onClick={openSettings}
          className="absolute top-3 cursor-pointer right-3 bg-base-300 hover:bg-base-100 transition-colors rounded-full p-2 backdrop-blur-sm"
        >
          <Settings size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Floating profile card */}
      <div className="relative px-5 -mt-12 z-10">
        <div className="flex items-center gap-4 bg-base-100 rounded-xl p-4 border border-base-content/10">
          <ProfilePicture
            src={user.profilePicture?.url || ""}
            size="lg"
            status="online"
          />
          <div className="flex-1">
            <h2 className="text-lg font-semibold leading-tight">
              {user.displayName || user.name || user.username}
            </h2>
            <div className="flex items-center gap-2 text-sm opacity-70">
              <p>@{user.username}</p>
              {user.pronouns && <span>• {user.pronouns}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* About section */}
      <div className="mt-4 mx-5 bg-base-100 rounded-xl border border-base-content/10 p-4">
        <p className="text-[11px] uppercase font-medium opacity-60 tracking-wide">
          About
        </p>
        <p className="text-sm mt-1 text-base-content/90 leading-relaxed">
          {user.bio || "This user hasn’t added a bio yet."}
        </p>
      </div>

      {/* Member info */}
      <div className="mx-5 mt-5 flex items-center justify-between bg-base-100 rounded-xl p-3 border border-base-content/10">
        <div className="flex items-center gap-2 text-xs opacity-80">
          <CalendarDays size={14} />
          <span>
            Joined{" "}
            {user.createdAt
              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
        </div>
        <div className="text-[11px] text-[#004030] font-semibold uppercase tracking-wider">
          Member
        </div>
      </div>

      {/* Subtle accent footer */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#004030]" />
    </div>
  );
}
