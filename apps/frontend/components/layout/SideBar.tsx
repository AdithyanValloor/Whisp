"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Inbox,
  Menu,
  MessageCircleMore,
  Phone,
  Settings,
  UsersRound,
} from "lucide-react";
import { useAppSelector } from "@/redux/hooks";
import { AiFillMessage } from "react-icons/ai";
import { motion } from "framer-motion";
import Image from "next/image";
import defaultPFP from "@/public/default-pfp.png";
import { selectActiveUnreadTotal } from "@/redux/selectors/unreadSelectors";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/utils/screenSize";

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
  const [indicatorTop, setIndicatorTop] = useState(0);
  const [indicatorVisible, setIndicatorVisible] = useState(false);

  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sidebarRef = useRef<HTMLDivElement>(null);

  const totalUnread = useAppSelector(selectActiveUnreadTotal);
  const { requests } = useAppSelector((state) => state.friends);
  const notificationUnread = useAppSelector(
    (state) => state.notifications.unreadCount,
  );
  const pendingCount = useMemo(
    () => requests.incoming.length,
    [requests.incoming.length],
  );

  const pathname = usePathname();
  const isChatOpen = pathname.startsWith("/chat/");
  const user = useAppSelector((state) => state.profile.profile);
  const isMobile = useIsMobile();

  /* ---------- Track active button position for indicator ---------- */

  useEffect(() => {
    const activeBtn = buttonRefs.current[activeTab];
    const sidebar = sidebarRef.current;
    if (!activeBtn || !sidebar) return;

    const btnRect = activeBtn.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();

    // Center the 24px (h-6) indicator on the button
    setIndicatorTop(btnRect.top - sidebarRect.top + btnRect.height / 2 - 12);
    setIndicatorVisible(true);
  }, [activeTab]);

  /* ---------- Click outside to collapse ---------- */

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

  /* ---------- Button definitions ---------- */

  const buttons: ButtonType[] = [
    { title: "Menu", icon: <Menu size={20} />, isMenu: true },
    {
      title: "Chats",
      icon: <AiFillMessage size={22} />,
      notificationCount: totalUnread,
    },
    {
      title: "Friends",
      icon: <UsersRound size={20} />,
      notificationCount: pendingCount,
    },
    { title: "Call history", icon: <Phone size={20} /> },
  ];

  const bottomButtons: ButtonType[] = [
    {
      title: "Inbox",
      icon: <Inbox size={20} />,
      notificationCount: notificationUnread,
    },
    { title: "Archived chats", icon: <Archive size={20} /> },
    { title: "Settings", icon: <Settings size={20} /> },
    {
      title: "User profile",
      icon: (
        <Image
          src={user?.profilePicture?.url ?? defaultPFP}
          alt="profile"
          width={35}
          height={35}
          className="rounded-full object-cover border cursor-pointer"
        />
      ),
    },
  ];

  const mobileButtons: ButtonType[] = [
    {
      title: "Chats",
      icon: <MessageCircleMore strokeWidth={1.5} size={22} />,
      notificationCount: totalUnread,
    },
    {
      title: "Friends",
      icon: <UsersRound strokeWidth={1.5} size={22} />,
      notificationCount: pendingCount,
    },
    { title: "Call history", icon: <Phone strokeWidth={1.5} size={22} /> },
    {
      title: "Inbox",
      icon: <Inbox size={20} />,
      notificationCount: notificationUnread,
    },
    {
      title: "User profile",
      icon: (
        <Image
          src={user?.profilePicture?.url ?? defaultPFP}
          alt="profile"
          width={35}
          height={35}
          className="rounded-full object-cover border cursor-pointer"
        />
      ),
    },
  ];

  /* ---------- Render helpers ---------- */

  const renderDesktopButton = (btn: ButtonType) => {
    const isActive = activeTab === btn.title;

    const handleClick = () => {
      if (btn.isMenu) {
        setIsExpanded((prev) => !prev);
      } else {
        setActiveTab(btn.title);
        setIsExpanded(false);
      }
    };

    return (
      <div key={btn.title} className="relative">
        <motion.button
          ref={(el) => {
            buttonRefs.current[btn.title] = el;
          }}
          onClick={handleClick}
          whileTap={{ scale: 0.96 }}
          whileHover={{ y: -1 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`
            relative flex items-center h-11 px-3 ml-1 rounded-xl cursor-pointer
            transition-colors duration-200
            ${btn.title === "Menu" ? "hover:bg-transparent text-base-content/70" : ""}
            ${
              isActive
                ? "bg-cyan-950/80 backdrop-blur-md text-white"
                : "text-base-content/70 hover:bg-cyan-900/50 hover:text-white"
            }
          `}
        >
          {/* Icon */}
          <div className="w-10 flex justify-center flex-shrink-0 relative">
            {btn.icon}
            {!!btn.notificationCount && btn.notificationCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="absolute -top-1 -right-0 bg-red-600 text-white text-xs rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-semibold"
              >
                {btn.notificationCount > 99 ? "99+" : btn.notificationCount}
              </motion.span>
            )}
          </div>

          {/* Expandable label */}
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

  const renderMobileButton = (btn: ButtonType) => {
    const isActive = activeTab === btn.title;

    const handleClick = () => {
      setActiveTab(btn.title);
    };

    return (
      <div key={btn.title} className="flex-1 relative">
        <button
          onClick={handleClick}
          className={`
            w-full flex flex-col items-center justify-center gap-1 py-2 px-1
            rounded-lg transition-colors duration-150
            ${isActive ? "text-cyan-600" : "text-base-content/70 hover:text-base-content/80"}
          `}
        >
          <div className="relative">
            {btn.icon}
            {!!btn.notificationCount && btn.notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs leading-none rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                {btn.notificationCount > 99 ? "99+" : btn.notificationCount}
              </span>
            )}
          </div>

          <span
            className={`text-[10px] font-medium ${isActive ? "text-cyan-900" : ""}`}
          >
            {btn.title === "Call history"
              ? "Calls"
              : btn.title === "User profile"
                ? "Profile"
                : btn.title}
          </span>

          {/* Active dot */}
          {isActive && (
            <motion.div
              layoutId="mobileActiveIndicator"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      </div>
    );
  };

  /* ---------- Mobile bottom nav ---------- */

  if (isMobile) {
    if (isChatOpen) return null;

    return (
      <div
        ref={sidebarRef}
        className="absolute bottom-0 bg-base-100 shadow w-full px-2 py-1"
      >
        <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
          {mobileButtons.map((btn) => renderMobileButton(btn))}
        </div>
      </div>
    );
  }

  /* ---------- Desktop sidebar ---------- */

  return (
    <div className="relative h-full flex-shrink-0 z-50">
      <motion.div
        animate={{ width: isExpanded ? 240 : 60 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={`absolute inset-0 flex flex-col mb-3 justify-between bg-base-300 rounded-2xl overflow-hidden ${
          isExpanded ? "shadow-lg" : ""
        }`}
        ref={sidebarRef}
      >
        {/*
          Single indicator bar — ONE element always in the DOM.
          Animates its `top` value to slide between active buttons.
          This is the correct pattern; layoutId across multiple elements does NOT work.
        */}
        <motion.div
          className="absolute left-0 w-[3px] h-6 bg-cyan-400 rounded-r-full pointer-events-none z-10"
          animate={{
            top: indicatorTop,
            opacity: indicatorVisible ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />

        <div className="flex flex-col gap-2 py-3">
          {buttons.map(renderDesktopButton)}
        </div>

        <div className="flex flex-col gap-2 py-3">
          {bottomButtons.map(renderDesktopButton)}
        </div>
      </motion.div>
    </div>
  );
}