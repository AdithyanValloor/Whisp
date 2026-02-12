// "/app/(app)/chat/layout.tsx"

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";

import SideBar from "@/components/layout/SideBar";
import MainSection from "@/components/layout/MainSection";

import { bootstrapApp } from "@/redux/features/bootstrapSlice";
import { getSocket, disconnectSocket } from "@/utils/socket";
import type { Socket } from "socket.io-client";

import Image from "next/image";
import logoDark from "@/public/LogoDark.png";
import logoLight from "@/public/LogoLight.png";
import { themes } from "@/config/themeConfig";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  // const user = useAppSelector((state) => state.auth.user);
  const { user, sessionLoading } = useAppSelector(state => state.auth);

  console.log("USER : ", user);

  const theme = useAppSelector((state) => state.theme.current);

  const socketRef = useRef<Socket | null>(null);
  const allChatIdsRef = useRef<string[]>([]);

  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState("Inbox");

  const isChatOpen = pathname !== "/chat";

  /* ---------- Responsive ---------- */

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  /* ---------- Bootstrap ---------- */

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


  /* ---------- Socket ---------- */

  useEffect(() => {
    if (!user || !bootstrapDone) return;

    socketRef.current = getSocket(user._id, allChatIdsRef.current);

    return () => disconnectSocket();
  }, [user, bootstrapDone]);

  /* ---------- Loading ---------- */

  /**
   * Show loading while bootstrap is running
   * Note: We trust that this layout will only be rendered when user exists
   * because RootPage handles authentication redirects
   */
  if (!user || !bootstrapDone) {
    return (
      <div className="h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-xl" />
      </div>
    );
  }

  /* ---------- UI ---------- */

  return (
    <div className="flex flex-col bg-base-300 h-screen">
      {/* Top bar */}
      <div className="h-10 flex items-center justify-center">
        {/* <Image
          src={theme === themes.dark ? logoDark : logoLight}
          alt="Logo"
          width={80}
          height={40}
          style={{ height: 'auto' }}
        /> */}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop only) */}
        <div className="hidden md:block w-[60px]">
          <SideBar setActiveTab={setActiveTab} activeTab={activeTab} />
        </div>

        {/* Chat list */}
        <div
          className={`mr-2 ${
            isMobile && isChatOpen ? "hidden" : "w-[350px]"
          }`}
        >
          <MainSection setActiveTab={setActiveTab} activeTab={activeTab} />
        </div>

        {/* Chat content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
