"use client";

import ThemeToggle from "./Settings Subpages/ThemeSelector";

export default function ThemeSettings() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}

      {/* Theme Toggle */}
      <div className="flex items-center justify-between gap-4 p-2 mt-2">
        <span className="text-sm font-medium opacity-70">Switch Theme</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
