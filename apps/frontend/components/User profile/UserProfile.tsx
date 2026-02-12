"use client";

import UserProfile from "./UserProfileContent";
import UserSettings from "./UserSettings";
import { useState, useEffect } from "react";

interface ProfileDropdownProps {
  isOpen: boolean;
  initialView: "profile" | "settings";
}

export default function ProfileDropdown({
  isOpen,
  initialView,
}: ProfileDropdownProps) {
  const [view, setView] = useState<"profile" | "settings">(initialView);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
    }
  }, [isOpen, initialView]);

  const handleOpenSettings = () => {
    setView("settings");
  };

  const handleBackToProfile = () => {
    setView("profile");
  };

  if (!isOpen) return null;

  return (
    <div className="h-full w-full">
      {view === "settings" ? (
        <UserSettings onBack={handleBackToProfile} />
      ) : (
        <UserProfile openSettings={handleOpenSettings} />
      )}
    </div>
  );
}