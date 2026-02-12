"use client";

import { JSX, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import CallSection from "../calls/CallSection";
import FriendsSection from "../friends/FriendsSection";
import InboxSection from "../inbox/InboxSection";
import StatusSection from "../status/StatusSection";
import StarredMessages from "../StarredMessages/StarredMessages";
import ArchivedChats from "../AchievedChats/ArchievedChats";
import ProfileDropdown from "../User profile/UserProfile";

/**
 * Props for MainSection.
 * Controls which section is currently active.
 */
interface MainSectionProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

/**
 * MainSection
 *
 * Renders the left-side content area (Inbox, Friends, Calls, etc.).
 * Handles mobile slide behavior when a chat view is active.
 */
export default function MainSection({
  activeTab,
  setActiveTab,
}: MainSectionProps) {
  const pathname = usePathname();

  // Detect whether a chat is currently open
  const isChatOpen = pathname.startsWith("/chat/");

  const [isMobile, setIsMobile] = useState(false);

  /* ---------- Mobile detection ---------- */

  /**
   * Track viewport size to adjust mobile slide animations.
   */
  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(m.matches);

    update();
    m.addEventListener("change", update);

    return () => m.removeEventListener("change", update);
  }, []);

  /* ---------- Sections ---------- */

  /**
   * Map active tab names to their corresponding sections.
   */
  const sections: Record<string, JSX.Element> = {
    Inbox: <InboxSection />,
    Friends: <FriendsSection setActiveTab={setActiveTab} />,
    "Call history": <CallSection />,
    Status: <StatusSection />,
    "Starred messages": <StarredMessages />,
    "Archived chats": <ArchivedChats />,
    Settings: <ProfileDropdown isOpen initialView="settings" />,
    "User profile": <ProfileDropdown isOpen initialView="profile" />,
  };

  return (
    <div
      className={`flex h-full flex-col pb-3 transition-transform duration-300 ease-in-out
        ${isMobile && isChatOpen ? "-translate-x-full" : "translate-x-0"}`}
    >
      <div
        className={`flex h-full flex-col bg-base-200 shadow-md
          ${!isMobile && "rounded-2xl"} 
           overflow-hidden`}
      >
        {sections[activeTab] ?? (
          <div className="p-3 text-gray-500">Select a tab</div>
        )}
      </div>
    </div>
  );
}
