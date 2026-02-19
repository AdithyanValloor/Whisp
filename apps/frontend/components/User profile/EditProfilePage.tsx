"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateProfile } from "@/redux/features/profileSlice";
import { motion } from "framer-motion";

interface EditProfileFormProps {
  onBack: () => void;
}

export default function EditProfileForm({ onBack }: EditProfileFormProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.profile.profile);

  const initialValues = {
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    pronouns: user?.pronouns || "",
  };

  const [displayName, setDisplayName] = useState(initialValues.displayName);
  const [bio, setBio] = useState(initialValues.bio);
  const [pronouns, setPronouns] = useState(initialValues.pronouns);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await dispatch(
      updateProfile({
        displayName,
        bio,
        pronouns,
      }),
    );

    onBack();
  };

  const handleReset = () => {
    setDisplayName(initialValues.displayName);
    setBio(initialValues.bio);
    setPronouns(initialValues.pronouns);
  };

  const hasChanges =
    displayName !== initialValues.displayName ||
    bio !== initialValues.bio ||
    pronouns !== initialValues.pronouns;

  // const hasChanges = true

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Display Name */}
      <div className="w-full">
        <label
          htmlFor="displayName"
          className="text-sm font-medium text-base-content/80 mb-1 block"
        >
          Display Name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
          className="w-full h-10 p-3 text-base-content/90 rounded-xl outline-base-content/10 hover:outline
            bg-base-300 focus:outline"
        />
      </div>

      {/* Pronouns */}
      <div className="w-full">
        <label
          htmlFor="pronouns"
          className="text-sm font-medium text-base-content/80 mb-1 block"
        >
          Pronouns
        </label>
        <input
          id="pronouns"
          name="pronouns"
          type="text"
          value={pronouns}
          onChange={(e) => setPronouns(e.target.value)}
          placeholder="e.g. He/Him, She/Her"
          className="w-full h-10 p-3 text-base-content/90 rounded-xl outline-base-content/10 hover:outline
            bg-base-300 focus:outline"
        />
      </div>

      {/* About */}
      <div className="w-full">
        <label
          htmlFor="bio"
          className="text-sm font-medium text-base-content/80 mb-1 block"
        >
          About
        </label>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Write something about yourself..."
          rows={3}
          className="w-full p-3 text-base-content/90 rounded-xl outline-base-content/10 hover:outline
          bg-base-300 focus:outline transition resize-none"
        />
      </div>

      {/* Buttons */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="gap-2 flex flex-col mt-2 bg-base-100 shadow border border-base-content/10 p-2 pl-4 rounded-xl"
        >
          <p className="text-sm">You have made changes! Save changes?</p>
          <div className="flex gap-1 justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-2 text-blue-400 hover:underline underline-offset-2 transition-all cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-4 py-2 cursor-pointer rounded-xl bg-green-700 text-white hover:bg-green-900 transition"
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      )}
    </form>
  );
}
