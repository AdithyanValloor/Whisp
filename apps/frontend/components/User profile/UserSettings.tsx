"use client";

import { useState } from "react";
import { logoutUser } from "@/redux/features/authSlice";
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
import IconButton from "../GlobalComponents/IconButtons";

interface UserSettingsProps {
  onBack: () => void;
}

export default function UserSettings({ onBack }: UserSettingsProps) {
  const [activePage, setActivePage] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    window.location.href = "/login";
  };

  // 🔥 Settings config array
  const settingsItems = [
    {
      label: "Profile",
      icon: UserPen,
      action: () => setActivePage("Profile"),
    },
    {
      label: "Account",
      icon: UserCog,
      action: () => setActivePage("Account"),
    },
    {
      label: "Theme",
      icon: Palette,
      action: () => setActivePage("Theme"),
    },
    {
      label: "Notifications",
      icon: Bell,
      action: () => setActivePage("Notifications"),
    },
    {
      label: "Privacy",
      icon: UserLock,
      action: () => setActivePage("Privacy"),
    },
    {
      label: "Logout",
      icon: LogOut,
      action: () => setShowLogout(true),
      danger: true,
    },
  ];

  if (activePage) {
    return (
      <SubPage title={activePage} onBack={() => setActivePage(null)}>
        {activePage === "Profile" && (
          <EditProfileForm onBack={() => setActivePage(null)} />
        )}
        {activePage === "Account" && <p>Manage account settings…</p>}
        {activePage === "Theme" && (
          // <ThemeSettings onBack={() => setActivePage(null)} />
          <ThemeSettings />
        )}
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
          <IconButton
            onClick={onBack}
            ariaLabel="Go back"
          >
            <ArrowLeft size={18} />
          </IconButton>
          <h2 className="text-lg font-semibold text-base-content">Settings</h2>
        </div>

        {/* Sections */}
        <div className="p-3 flex flex-col gap-1">
          {settingsItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                onClick={item.action}
                className="p-3 py-4 rounded-lg flex justify-between hover:bg-base-content/10 items-center cursor-pointer"
              >
                <h3
                  className={`text-sm font-medium text-base-content ${
                    item.danger ? "text-red-400" : ""
                  }`}
                >
                  {item.label}
                </h3>
                <Icon
                  size={20}
                  className={`${item.danger ? "text-red-400" : "text-base-content"}`}
                />
              </div>
            );
          })}
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