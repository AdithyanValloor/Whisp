"use client";

import { useState } from "react";
import { logoutUser } from "@/redux/features/authSlice"; // <-- async thunk for logout
import {
  ArrowLeft,
  Bell,
  LogOut,
  Palette,
  UserCog,
  UserLock,
  UserPen,
} from "lucide-react";
import { SubPage } from "./UserSettingsSubPages";
import EditProfileForm from "./EditProfilePage";
import ThemeSettings from "./ThemeSettings";
import { useAppDispatch } from "@/redux/hooks";
import ConfirmModal from "../GlobalComponents/ConfirmModal";

interface UserSettingsProps {
  onBack: () => void;
}

export default function UserSettings({ onBack }: UserSettingsProps) {
  const [activePage, setActivePage] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const [showLogout, setShowLogout] = useState(false);

  // Handle logout confirm
  const handleLogout = async () => {
    await dispatch(logoutUser());
    window.location.href = "/login"; 
  };

  if (activePage) {
    return (
      <SubPage title={activePage} onBack={() => setActivePage(null)}>
        {activePage === "Profile" && (
          <EditProfileForm onBack={() => setActivePage(null)} />
        )}
        {activePage === "Account" && <p>Manage account settings…</p>}
        {activePage === "Theme" && <ThemeSettings onBack={() => setActivePage(null)} />}
        {activePage === "Notifications" && <p>Notification preferences…</p>}
        {activePage === "Privacy" && <p>Privacy controls…</p>}
      </SubPage>
    );
  }

  return (
    <>
      <div className="w-full h-full relative">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-base-300">
          <button
            onClick={onBack}
            className="p-2 cursor-pointer rounded-full hover:bg-base-200 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>

        {/* Sections */}
        <div className="p-4 flex flex-col gap-1">
          <div
            onClick={() => setActivePage("Profile")}
            className="p-3 rounded-lg flex justify-between hover:bg-base-200 items-center cursor-pointer"
          >
            <h3 className="text-sm font-medium opacity-70">Profile</h3>
            <UserPen size={20} />
          </div>

          <div
            onClick={() => setActivePage("Account")}
            className="p-3 rounded-lg flex justify-between hover:bg-base-200 items-center cursor-pointer"
          >
            <h3 className="text-sm font-medium opacity-70">Account</h3>
            <UserCog size={20} />
          </div>

          <div
            onClick={() => setActivePage("Theme")}
            className="p-3 rounded-lg flex justify-between hover:bg-base-200 items-center cursor-pointer"
          >
            <h3 className="text-sm font-medium opacity-70">Theme</h3>
            <Palette size={20} />
          </div>

          <div
            onClick={() => setActivePage("Notifications")}
            className="p-3 rounded-lg flex justify-between hover:bg-base-200 items-center cursor-pointer"
          >
            <h3 className="text-sm font-medium opacity-70">Notifications</h3>
            <Bell size={20} />
          </div>

          <div
            onClick={() => setActivePage("Privacy")}
            className="p-3 rounded-lg flex justify-between hover:bg-base-200 items-center cursor-pointer"
          >
            <h3 className="text-sm font-medium opacity-70">Privacy</h3>
            <UserLock size={20} />
          </div>

          {/* Logout */}
          {/* <div
            onClick={() =>
              (document.getElementById("logout_modal") as HTMLDialogElement)?.showModal()
            }
            className="p-3 rounded-lg flex justify-between hover:bg-base-200 items-center cursor-pointer"
          >
            <h3 className="text-sm text-[#D22B2B] font-medium opacity-70">
              Logout
            </h3>
            <LogOut color="#D22B2B" size={20} />
          </div> */}

          {/* <div
            onClick={() =>
              (document.getElementById("logout_modal") as HTMLDialogElement)?.showModal()
            }
            className="p-3 rounded-lg flex justify-between hover:bg-base-200 items-center cursor-pointer"
          >
            <h3 className="text-sm text-[#D22B2B] font-medium opacity-70">Logout</h3>
            <LogOut color="#D22B2B" size={20} />
          </div> */}

          <div
            onClick={() => setShowLogout(true)}
            className="p-3 rounded-lg flex justify-between hover:bg-base-200 items-center cursor-pointer"
          >
            <h3 className="text-sm text-[#D22B2B] font-medium opacity-70">Logout</h3>
            <LogOut color="#D22B2B" size={20} />
          </div>

          {/* Logout Modal */}
          
        </div>
      </div>
     {showLogout && (
        <ConfirmModal
          open
          title="Confirm Logout"
          description="Are you sure you want to log out?"
          confirmText="Logout"
          onCancel={() => setShowLogout(false)}
          onConfirm={handleLogout}
        />
      )}
    </>
  );
}
