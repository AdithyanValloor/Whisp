"use client";

import EmojiPicker, { EmojiClickData, EmojiStyle,Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { useAppSelector } from "@/redux/hooks";

interface EmojiPickerBoxProps {
  onEmojiClick: (emoji: string) => void;
  setShowPicker: React.Dispatch<React.SetStateAction<boolean>>;
  showPicker:boolean,
  isMobile:boolean
}

export default function EmojiPickerBox({ onEmojiClick, showPicker, setShowPicker, isMobile }: EmojiPickerBoxProps) {
  
  const theme = useAppSelector((state) => state.theme.current);
  const pickerTheme = (theme === "dark" || theme === "forest") ? Theme.DARK : Theme.LIGHT;


  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiClick(emojiData.emoji);
  };

  return (
    <div className="emoji-picker-container">
      <button 
        title="Emojis"
        type="button"
        className="p-2 text-base-content rounded-full opacity-80 hover:rotate-180 transition-all duration-400 hover:scale-110 cursor-pointer"
        onClick={(e) => { 
          e.stopPropagation();
          setShowPicker((prev) => !prev);
        }}
      >
        {/* <Smile strokeWidth={1.3} /> */}
        <Smile strokeWidth={2} />
      </button>

      {showPicker && (
        // <div
        //   className={`absolute px-20 bg-red-300 bottom-22 right-14 z-50`}
        //   onClick={(e) => e.stopPropagation()} // prevents closing on click
        // >
        <div
          className={`absolute bottom-22 ${isMobile ? "left-1/2 -translate-x-1/2" : "right-14"}  z-50`}
          onClick={(e) => e.stopPropagation()} // prevents closing on click
        >
          <EmojiPicker
            emojiStyle={EmojiStyle.TWITTER}
            theme={pickerTheme}
            onEmojiClick={handleEmojiClick}
          />
        </div>
      )}
      
      {/* <div className={`absolute bottom-22 right-14 z-50 ${showPicker ? "block" : "hidden"}`}>
        <EmojiPicker emojiStyle={EmojiStyle.TWITTER} theme={pickerTheme} onEmojiClick={handleEmojiClick} />
      </div> */}
    </div>
  );
}
