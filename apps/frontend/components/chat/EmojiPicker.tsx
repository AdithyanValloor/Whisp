"use client";

import EmojiPicker, { EmojiClickData, EmojiStyle, Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface EmojiPickerBoxProps {
  onEmojiClick: (emoji: string) => void;
  setShowPicker: React.Dispatch<React.SetStateAction<boolean>>;
  showPicker: boolean;
  isMobile: boolean;
}

export default function EmojiPickerBox({
  onEmojiClick,
  showPicker,
  setShowPicker,
  isMobile,
}: EmojiPickerBoxProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!showPicker || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const pickerWidth = 350;
    const pickerHeight = 450;
    const gap = 8;

    let top = rect.top - pickerHeight - gap;
    let left = rect.right - pickerWidth;

    if (top < 8) top = rect.bottom + gap;
    if (left < 8) left = 8;
    if (left + pickerWidth > window.innerWidth - 8)
      left = window.innerWidth - pickerWidth - 8;

    setPickerPos({ top, left });
  }, [showPicker]);

  // Close on outside mousedown
  useEffect(() => {
    if (!showPicker) return;
    const handle = (e: MouseEvent) => {
      if (
        pickerRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      )
        return;
      setShowPicker(false);
    };
    window.addEventListener("mousedown", handle, { capture: true });
    return () => window.removeEventListener("mousedown", handle, { capture: true });
  }, [showPicker, setShowPicker]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPicker(false);
    };
    if (showPicker) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPicker, setShowPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiClick(emojiData.emoji);
  };

  return (
    <div className="emoji-picker-container">
      <button
        ref={buttonRef}
        title="Emojis"
        type="button"
        className="p-2 text-base-content rounded-full opacity-80 hover:rotate-180 transition-all duration-400 hover:scale-110 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker((prev) => !prev);
        }}
      >
        <Smile strokeWidth={2} />
      </button>

      {typeof window !== "undefined" &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed z-[99999]"
            style={{
              top: pickerPos.top,
              left: pickerPos.left,
              // CSS-only show/hide — picker stays mounted and pre-rendered
              opacity: showPicker ? 1 : 0,
              pointerEvents: showPicker ? "auto" : "none",
              transform: showPicker ? "scale(1) translateY(0)" : "scale(0.95) translateY(8px)",
              transition: "opacity 0.15s ease, transform 0.15s ease",
            }}
          >
            <EmojiPicker
              emojiStyle={EmojiStyle.TWITTER}
              onEmojiClick={handleEmojiClick}
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
              theme={Theme.AUTO}
              width={350}
              height={450}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}