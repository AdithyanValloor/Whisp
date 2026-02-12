"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateProfile } from "@/redux/features/profileSlice";

interface EditProfileFormProps {
  onBack: () => void;
}

export default function EditProfileForm({ onBack }: EditProfileFormProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: any) => state.auth.user);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [pronouns, setPronouns] = useState(user?.pronouns || "");

  const handleSave = async () => {
    await dispatch(
      updateProfile({
        displayName,
        bio,
        pronouns,
      })
    );
    onBack();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Display Name */}
      <div className="w-full">
        <label className="text-sm font-medium text-base-content/80 mb-1 block">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
          className="w-full h-10 px-4 rounded-full border border-base-300 bg-base
                     focus:outline-none focus:ring-2 focus:ring-[#004030] transition"
        />
      </div>

      {/* Pronouns */}
      <div className="w-full">
        <label className="text-sm font-medium text-base-content/80 mb-1 block">
          Pronouns
        </label>
        <input
          type="text"
          value={pronouns}
          onChange={(e) => setPronouns(e.target.value)}
          placeholder="e.g. He/Him, She/Her"
          className="w-full h-10 px-4 rounded-full border border-base-300 bg-base
                     focus:outline-none focus:ring-2 focus:ring-[#004030] transition"
        />
      </div>

      {/* Bio */}
      <div className="w-full">
        <label className="text-sm font-medium text-base-content/80 mb-1 block">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Write something about yourself..."
          rows={3}
          className="w-full px-4 pt-2 rounded-xl border border-base-300 bg-base
                     focus:outline-none focus:ring-2 focus:ring-[#004030] transition resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-full border border-base-300 bg-base hover:bg-base-200 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-full bg-[#004030] text-white hover:bg-[#006644] transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}
