"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Film,
  Menu,
  MessageCircleMore,
  Phone,
  Settings,
  Star,
  Target,
  User2Icon,
  UsersRound,
} from "lucide-react";
import { useAppSelector } from "@/redux/hooks";
import { AiFillMessage } from "react-icons/ai";
import { motion } from "framer-motion";

interface SideBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface ButtonType {
  title: string;
  icon: React.ReactNode;
  isMenu?: boolean;
  notificationCount?: number;
}

export default function SideBar({ activeTab, setActiveTab }: SideBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const totalUnread = useAppSelector((state) => state.unread.total);
  const { requests } = useAppSelector((state) => state.friends);
    const pendingCount = useMemo(
      () => requests.incoming.length,
      [requests.incoming.length],
    );

  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(!!e.matches);
    };
    setIsMobile(!!m.matches);
    m.addEventListener
      ? m.addEventListener("change", onChange)
      : (m.onchange = onChange);

    return () => {
      m.removeEventListener
        ? m.removeEventListener("change", onChange)
        : (m.onchange = null);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const buttons: ButtonType[] = [
    { title: "Menu", icon: <Menu size={20} />, isMenu: true },
    {
      title: "Inbox",
      icon: <AiFillMessage size={22} />,
      notificationCount: totalUnread,
    },
    { title: "Friends", 
      icon: <UsersRound size={20} />, 
      notificationCount: pendingCount,
    },
    { title: "Call history", icon: <Phone size={20} /> },
    { title: "Status", icon: <Film size={20} /> },
  ];

  const bottomButtons: ButtonType[] = [
    { title: "Starred messages", icon: <Star size={20} /> },
    { title: "Archived chats", icon: <Archive size={20} /> },
    { title: "Settings", icon: <Settings size={20} /> },
    { title: "User profile", icon: <User2Icon size={20} /> },
  ];

  // Mobile: show only main navigation items
  const mobileButtons: ButtonType[] = [
    {
      title: "Inbox",
      icon: <MessageCircleMore strokeWidth={1.5} size={22} />,
      notificationCount: totalUnread,
    },
    { title: "Friends", icon: <UsersRound strokeWidth={1.5} size={22} /> },
    { title: "Call history", icon: <Phone strokeWidth={1.5} size={22} /> },
    { title: "Status", icon: <Target strokeWidth={1.5} size={22} /> },
    { title: "User profile", icon: <User2Icon strokeWidth={1.5} size={22} /> },
  ];

  const renderButton = (btn: ButtonType, isMobileView: boolean = false) => {
    const handleClick = () => {
      if (btn.isMenu) {
        setIsExpanded((prev) => !prev);
      } else {
        setActiveTab(btn.title);
        setIsExpanded(false);
      }
    };

    if (isMobileView) {
      // Mobile bottom nav style
      return (
        <div key={btn.title} className="flex-1 relative">
          <button
            onClick={handleClick}
            className={`w-full flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg
              transition-colors duration-100
              ${activeTab === btn.title ? "text-primary" : "text-base-content/70"}`}
          >
            <div className="relative">
              {btn.icon}
              {btn.notificationCount !== undefined &&
                btn.notificationCount > 0 && (
                  <span className="absolute -top-2 leading-none -right-2 bg-error text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-semibold">
                    {btn.notificationCount > 99 ? "99+" : btn.notificationCount}
                  </span>
                )}
            </div>
            <span
              className={`text-[10px] font-medium ${activeTab === btn.title ? "font-semibold" : ""}`}
            >
              {btn.title === "Call history"
                ? "Calls"
                : btn.title === "User profile"
                  ? "Profile"
                  : btn.title}
            </span>
          </button>
        </div>
      );
    }
    
return (
  <div key={btn.title} className="relative">
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={`
        relative flex items-center h-11
        px-3 ml-1
        rounded-xl
        cursor-pointer
        transition-colors duration-200
        ${
          activeTab === btn.title
            ? "bg-cyan-900/80 backdrop-blur-md text-white"
            : "text-base-content/70 hover:bg-cyan-900/40 hover:text-white"
        }
      `}
    >
      {/* Active Sliding Bar */}
      {activeTab === btn.title && (
        <motion.div
          layoutId="activeBar"
          className="absolute left-0 h-6 w-[3px] bg-cyan-400 rounded-r-full"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      {/* Icon */}
      <div className="w-10 flex justify-center flex-shrink-0 relative">
        {btn.icon}

        {btn.notificationCount !== undefined &&
          btn.notificationCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="absolute -top-1 -right-0 bg-red-600 font-sans text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-semibold"
            >
              {btn.notificationCount > 99 ? "99+" : btn.notificationCount}
            </motion.span>
          )}
      </div>

      {/* Label — NOW PART OF FLEX */}
      <motion.span
        animate={{
          opacity: isExpanded ? 1 : 0,
          width: isExpanded ? "auto" : 0,
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden whitespace-nowrap text-sm font-medium"
      >
        {btn.title !== "Menu" ? btn.title : ""}
      </motion.span>
    </motion.button>
  </div>
);
  };

  // Mobile bottom navigation
  if (isMobile) {
    return (
      <div ref={sidebarRef} className="w-full px-1 py-1">
        <div className="flex items-center justify-around gap-1 max-w-2xl mx-auto">
          {mobileButtons.map((btn) => renderButton(btn, true))}
        </div>
      </div>
    );
  }

return (
  <div className="relative h-full flex-shrink-0 z-50">
    <motion.div
      animate={{ width: isExpanded ? 240 : 60 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className={`absolute inset-0 flex flex-col mb-3 ${isExpanded && " shadow-lg"} justify-between bg-base-300 rounded-2xl overflow-hidden`}
      ref={sidebarRef}
    >
      <div className="flex flex-col gap-2 py-3">
        {buttons.map((btn) => renderButton(btn))}
      </div>

      <div className="flex flex-col gap-2 py-3">
        {bottomButtons.map((btn) => renderButton(btn))}
      </div>
    </motion.div>
  </div>
);
}