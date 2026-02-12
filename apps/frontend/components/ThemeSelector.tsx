"use client";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/features/themeSlice";
import { themes } from "@/config/themeConfig";

export default function ThemeToggle() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.current);

  const handleChange = () => {
    dispatch(toggleTheme());
  };

  return (
    <label className="swap swap-rotate cursor-pointer">
      {/* This hidden checkbox controls the swap state */}
      <input
        type="checkbox"
        onChange={handleChange}
        checked={theme === themes.dark}
        className="hidden"
      />

      {/* Sun icon for light mode */}
      <svg
        className="swap-on fill-current w-6 h-6 text-yellow-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          d="M12 4V2m0 20v-2m4.24-13.76 1.42-1.42M6.34 17.66l-1.42 1.42M20 12h2M2 12h2m15.66 5.66 1.42 1.42M4.92 4.92l1.42 1.42M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
        />
      </svg>

      {/* Moon icon for dark mode */}
      <svg
        className="swap-off fill-current w-6 h-6 text-blue-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79Z"
        />
      </svg>
    </label>
  );
}
