"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";

import SideBar from "@/components/layout/SideBar";
import MainSection from "@/components/layout/MainSection";

import { bootstrapApp } from "@/redux/features/bootstrapSlice";
import { getSocket, disconnectSocket } from "@/utils/socket";
import type { Socket } from "socket.io-client";
import { useIsMobile } from "@/utils/screenSize";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  const { user, sessionLoading } = useAppSelector(state => state.auth);

  console.log("USER ======================", user);
  

  const theme = useAppSelector((state) => state.theme.current);

  const socketRef = useRef<Socket | null>(null);
  const allChatIdsRef = useRef<string[]>([]);

  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [activeTab, setActiveTab] = useState("Chats");

  const isChatOpen = pathname !== "/chat";

  useEffect(() => {
    const suppress = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", suppress);
    return () => document.removeEventListener("contextmenu", suppress);
  }, []);

  const isMobile = useIsMobile();

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setBootstrapDone(false);
      return;
    }

    dispatch(bootstrapApp())
      .unwrap()
      .then((res) => {
        allChatIdsRef.current = res.chats.map((c) => c._id);
        setBootstrapDone(true);
      })
      .catch((err) => {
        console.error("❌ Bootstrap failed", err);
        setBootstrapDone(true);
      });
  }, [user, sessionLoading, dispatch]);

  useEffect(() => {
    if (!user || !bootstrapDone) return;
    socketRef.current = getSocket(user._id, allChatIdsRef.current);
    return () => disconnectSocket();
  }, [user, bootstrapDone]);

  if (!user || !bootstrapDone) {
    return (
      <div className="h-screen flex items-center justify-center text-base-content bg-base-200">
        <span className="loading loading-spinner loading-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-base-300 h-screen transition-all ease-in-out duration-300">

      {/* Desktop top bar */}
      <div className="hidden md:flex h-10 items-center justify-center shrink-0" />

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar (icon strip, 60px) */}
        <div className="hidden md:block w-[60px] shrink-0">
          <SideBar setActiveTab={setActiveTab} activeTab={activeTab} />
        </div>

        {/* Chat list panel —
            Desktop: always rendered, fixed width.
            Mobile:  only rendered when NO chat is open — unmounting it removes
                     all its <input> elements from the DOM so Chrome on Android
                     cannot auto-focus them and open the keyboard. */}
        {(!isMobile || !isChatOpen) && (
          <div
            className={`
              transition-all duration-300
              ${isMobile ? "flex-1 w-full" : "w-[350px] shrink-0 mr-2"}
            `}
          >
            <MainSection setActiveTab={setActiveTab} activeTab={activeTab} />
          </div>
        )}

        {/* Chat content panel */}
        <div
          className={`
            transition-all duration-300
            ${isMobile
              ? isChatOpen
                ? "flex-1 w-full flex flex-col"
                : "hidden"
              : "flex-1"
            }
          `}
        >
          {children}
        </div>
      </div>

      {/* Mobile bottom navigation bar */}
      <div className="md:hidden shrink-0 border-t border-base-content/10 bg-base-300">
        <SideBar setActiveTab={setActiveTab} activeTab={activeTab} />
      </div>

    </div>
  );
}