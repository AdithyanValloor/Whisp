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

    // Desktop sidebar style
    return (
      <div key={btn.title} className="relative">
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer
            transition-colors duration-200 w-full justify-start shadow-accent-content
            ${activeTab === btn.title ? "bg-base-200 border-l-2" : "hover:bg-base-100"}`}
        >
        {/* <button
          onClick={handleClick}
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer
            transition-colors duration-200 w-full justify-start shadow-accent-content
            ${activeTab === btn.title ? "bg-base-200 border-l-2" : "hover:bg-base-100"}`}
        > */}
          <div className="flex-shrink-0 w-10 flex justify-center relative">
            {btn.icon}
            {btn.notificationCount !== undefined &&
              btn.notificationCount > 0 && (
                <span className="absolute -top-1 leading-none -right-1 border-2 border-base-300 bg-red-700 font-semibold text-white font-sans text-[10px] rounded-full min-w-5 h-5 px-[4px] flex items-center justify-center">
                  {btn.notificationCount > 99 ? "99+" : btn.notificationCount}
                </span>
              )}
          </div>
          <div
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out
              ${isExpanded ? "max-w-[150px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"}`}
          >
            {btn.title !== "Menu" ? btn.title : ""}
          </div>
        </button>
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

  // Desktop sidebar with overlay expansion
  return (
    <div className="relative h-full w-[60px] bg-base-300 flex-shrink-0">
      {/* Base sidebar - always 60px wide */}
      <div
        ref={sidebarRef}
        className={`absolute inset-0 flex flex-col px-1 bg-base-300 justify-between z-50
          transition-all  ease-in-out
          ${isExpanded ? "w-60 rounded-r-xl shadow-xl" : "w-[60px]"}`}
      >
        <div className="flex flex-col gap-2 py-2">
          {buttons.map((btn) => renderButton(btn))}
        </div>
        <div className="flex flex-col gap-2 py-2">
          {bottomButtons.map((btn) => renderButton(btn))}
        </div>
      </div>
    </div>
  );
}
