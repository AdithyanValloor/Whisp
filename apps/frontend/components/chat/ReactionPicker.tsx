"use client";

import EmojiPicker, { EmojiClickData, EmojiStyle, Theme } from "emoji-picker-react";
import { useAppSelector } from "@/redux/hooks";

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export default function ReactionPicker({
  visible,
  onClose,
  onSelect
}: ReactionPickerProps) {

  const theme = useAppSelector((state) => state.theme.current);
  const pickerTheme = (theme === "dark" || theme === "forest") ? Theme.DARK : Theme.LIGHT;

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/10 flex items-center justify-center-safe z-[100]"
      onClick={onClose}
    >
      <div
        className="relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <EmojiPicker
          onEmojiClick={(emojiData: EmojiClickData) => onSelect(emojiData.emoji)}
          theme={pickerTheme}
          emojiStyle={EmojiStyle.TWITTER}
          previewConfig={{ showPreview: false }}
          width={350}
          height={450}
        />
      </div>
    </div>
  )
}
