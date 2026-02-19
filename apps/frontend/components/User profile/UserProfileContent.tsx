"use client";

import { Settings, CalendarDays, SquarePen } from "lucide-react";
import ProfilePicture from "../ProfilePicture/ProfilePicture";
import { useAppSelector } from "@/redux/hooks";
import IconButton from "../GlobalComponents/IconButtons";
import { motion, type Variants } from "framer-motion";

interface UserProfileProps {
  openSettings: (page?: string) => void;
}
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

export default function UserProfile({ openSettings }: UserProfileProps) {
  const user = useAppSelector((state) => state.profile.profile);

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-sm opacity-70">No user loaded</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative flex flex-col w-full h-full bg-base-200 overflow-hidden border border-base-300"
    >
      {/* Settings Button */}
      <div className="absolute top-3 right-3">
        <IconButton onClick={() => openSettings()} ariaLabel="open settings">
          <Settings size={18} strokeWidth={1.5} />
        </IconButton>
      </div>

      {/* Profile Card */}
      <motion.div variants={itemVariants} className="relative px-5 mt-22 z-10">
        <div
          onClick={() => openSettings("Profile")}
          className="relative flex items-center gap-4 bg-base-100 rounded-xl p-4 border border-base-content/10 cursor-pointer hover:border-base-content/30 transition group"
        >
          <div className="absolute top-1 right-1 opacity-40 group-hover:opacity-100">
            <IconButton ariaLabel="Edit profile">
              <SquarePen size={16} />
            </IconButton>
          </div>
          <ProfilePicture
            src={user.profilePicture?.url || ""}
            size="lg"
            status="online"
          />
          <div className="flex-1">
            <h2 className="text-lg font-semibold leading-tight">
              {user.displayName || user.username}
            </h2>
            <div className="flex items-center gap-2 text-sm opacity-70">
              <p>@{user.username}</p>
              {user.pronouns && <span>• {user.pronouns}</span>}
            </div>
          </div>
        </div>
      </motion.div>
      {/* About */}
      <motion.div
        variants={itemVariants}
        className="mt-4 mx-5 bg-base-100 rounded-xl border border-base-content/10 p-4"
      >
        <p className="text-[11px] uppercase font-medium opacity-60 tracking-wide">
          About
        </p>
        <p className="text-sm mt-1 text-base-content/90 leading-relaxed">
          {user.bio || "This user hasn’t added a bio yet."}
        </p>
      </motion.div>

      {/* Member Info */}
      <motion.div
        variants={itemVariants}
        className="mx-5 mt-5 flex items-center justify-between bg-base-100 rounded-xl p-3 border border-base-content/10"
      >
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
      </motion.div>

      {/* Accent */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#004030]" />
    </motion.div>
  );
}
