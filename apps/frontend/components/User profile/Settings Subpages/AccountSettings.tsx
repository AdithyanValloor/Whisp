"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ChevronRight, X } from "lucide-react";
import {
  LuShieldAlert,
  LuTrash2,
  LuUserX,
  LuLock,
  LuMail,
  LuAtSign,
} from "react-icons/lu";
import { useSelector } from "react-redux";
import {
  updateUsername,
  updateEmail,
  changePassword,
  deactivateAccount,
  scheduleAccountDeletion,
  checkPassword,
} from "@/redux/features/authSlice";

import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/GlobalComponents/ConfirmModal";
import { RootState } from "@/redux/store";
import { useAppDispatch } from "@/redux/hooks";
import { unblockUser } from "@/redux/features/blockSlice";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Section =
  | "username"
  | "email"
  | "password"
  | "blocked"
  | "deactivate"
  | "delete"
  | null;

// ---------------------------------------------------------------------------
// Shared sub-components (unchanged)
// ---------------------------------------------------------------------------

function SectionRow({
  icon: Icon,
  label,
  description,
  danger,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 p-3 py-4 rounded-lg hover:bg-base-content/10 transition-colors cursor-pointer group text-left"
    >
      <div className="flex items-center gap-3">
        <Icon
          size={18}
          className={danger ? "text-red-400" : "text-base-content/60"}
        />
        <div>
          <p
            className={`text-sm font-medium ${danger ? "text-red-400" : "text-base-content"}`}
          >
            {label}
          </p>
          <p className="text-xs text-base-content/50 mt-0.5">{description}</p>
        </div>
      </div>
      <ChevronRight
        size={15}
        className={`${danger ? "text-red-400/60" : "text-base-content/30"} group-hover:translate-x-0.5 transition-transform`}
      />
    </button>
  );
}

function FieldInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  rightSlot,
  prefix,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rightSlot?: React.ReactNode;
  prefix?: string;
}) {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="text-sm font-medium text-base-content/80 mb-1 block"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm text-base-content/40 pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-10 p-3 ${prefix ? "pl-7" : ""} ${rightSlot ? "pr-10" : ""} text-base-content/90 rounded-xl outline-base-content/10 hover:outline bg-base-300 focus:outline`}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

function SaveBar({
  hasChanges,
  onReset,
  label = "Save Changes",
  loading,
}: {
  hasChanges: boolean;
  onReset: () => void;
  label?: string;
  loading?: boolean;
}) {
  return (
    <AnimatePresence>
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
              onClick={onReset}
              disabled={loading}
              className="px-2 py-2 text-blue-400 hover:underline underline-offset-2 transition-all cursor-pointer disabled:opacity-40"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 cursor-pointer rounded-xl bg-green-700 text-white hover:bg-green-900 transition disabled:opacity-60"
            >
              {loading ? (
                <span className="loading loading-dots loading-sm" />
              ) : (
                label
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Section: Change Username
// ---------------------------------------------------------------------------
function ChangeUsernameSection() {
  const dispatch = useAppDispatch();
  const { accountLoading, error } = useSelector((s: RootState) => s.auth);

  const [username, setUsername] = useState("");
  const [success, setSuccess] = useState(false);

  const hasChanges = username !== "";
  const isValid = username.length >= 3;

  const handleChange = (v: string) => {
    setSuccess(false);
    setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  };

  const handleReset = () => {
    setUsername("");
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const result = await dispatch(updateUsername({ username }));
    if (updateUsername.fulfilled.match(result)) {
      setUsername("");
      setSuccess(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FieldInput
        id="username"
        label="New Username"
        value={username}
        onChange={handleChange}
        placeholder="your_username"
        prefix="@"
      />

      <AnimatePresence>
        {username.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={`text-xs font-medium -mt-3 px-1 ${isValid ? "text-green-500" : "text-yellow-500"}`}
          >
            {isValid
              ? `@${username} looks good!`
              : "Username must be at least 3 characters"}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Error / success feedback */}
      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
      {success && (
        <p className="text-xs text-green-500 px-1">
          Username updated successfully!
        </p>
      )}

      <div className="bg-base-300 rounded-xl p-3 flex gap-2.5">
        <LuAtSign size={15} className="text-base-content/40 mt-0.5 shrink-0" />
        <p className="text-xs text-base-content/50 leading-relaxed">
          Your username is visible to others and used to mention you in posts
          and messages.
        </p>
      </div>

      <SaveBar
        hasChanges={hasChanges && isValid}
        onReset={handleReset}
        label="Update Username"
        loading={accountLoading}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Section: Change Email
// ---------------------------------------------------------------------------
function ChangeEmailSection() {
  const dispatch = useAppDispatch();
  const { accountLoading, error } = useSelector((s: RootState) => s.auth);

  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  const hasChanges = email !== "" || confirmEmail !== "";

  const handleReset = () => {
    setEmail("");
    setConfirmEmail("");
    setMismatch(false);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email !== confirmEmail) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    const result = await dispatch(updateEmail({ email }));
    if (updateEmail.fulfilled.match(result)) {
      handleReset();
      setSuccess(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FieldInput
        id="newEmail"
        label="New Email Address"
        type="email"
        value={email}
        onChange={(v) => {
          setEmail(v);
          setSuccess(false);
        }}
        placeholder="Enter new email"
      />
      <FieldInput
        id="confirmEmail"
        label="Confirm New Email"
        type="email"
        value={confirmEmail}
        onChange={(v) => {
          setConfirmEmail(v);
          setMismatch(false);
        }}
        placeholder="Re-enter new email"
      />

      {mismatch && (
        <p className="text-xs text-red-400 -mt-3 px-1">
          Email addresses do not match
        </p>
      )}
      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
      {success && (
        <p className="text-xs text-green-500 px-1">
          Email updated! Please verify your new address.
        </p>
      )}

      <SaveBar
        hasChanges={hasChanges}
        onReset={handleReset}
        label="Update Email"
        loading={accountLoading}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Section: Change Password
// ---------------------------------------------------------------------------
function ChangePasswordSection() {
  const dispatch = useAppDispatch();
  const { accountLoading, error } = useSelector((s: RootState) => s.auth);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  const hasChanges = current !== "" || next !== "" || confirm !== "";

  const handleReset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setMismatch(false);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    const result = await dispatch(
      changePassword({ currentPassword: current, newPassword: next }),
    );
    if (changePassword.fulfilled.match(result)) {
      handleReset();
      setSuccess(true);
    }
  };

  const toggle = (
    show: boolean,
    setter: React.Dispatch<React.SetStateAction<boolean>>,
  ) => (
    <button
      type="button"
      onClick={() => setter(!show)}
      className="text-base-content/40 hover:text-base-content/70 transition-colors"
    >
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FieldInput
        id="currentPassword"
        label="Current Password"
        type={showCurrent ? "text" : "password"}
        value={current}
        onChange={setCurrent}
        placeholder="Enter current password"
        rightSlot={toggle(showCurrent, setShowCurrent)}
      />
      <FieldInput
        id="newPassword"
        label="New Password"
        type={showNext ? "text" : "password"}
        value={next}
        onChange={setNext}
        placeholder="Enter new password"
        rightSlot={toggle(showNext, setShowNext)}
      />
      <FieldInput
        id="confirmPassword"
        label="Confirm New Password"
        type={showConfirm ? "text" : "password"}
        value={confirm}
        onChange={setConfirm}
        placeholder="Re-enter new password"
        rightSlot={toggle(showConfirm, setShowConfirm)}
      />

      {mismatch && (
        <p className="text-xs text-red-400 -mt-3 px-1">
          Passwords do not match
        </p>
      )}
      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
      {success && (
        <p className="text-xs text-green-500 px-1">
          Password changed successfully!
        </p>
      )}

      <SaveBar
        hasChanges={hasChanges}
        onReset={handleReset}
        label="Update Password"
        loading={accountLoading}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Section: Blocked Users (wired to Redux in your blockSlice separately)
// ---------------------------------------------------------------------------

function BlockedUsersSection() {
  const dispatch = useAppDispatch();
  const { blockedUsers, loading, actionLoading } = useSelector(
    (s: RootState) => s.block,
  );

  const handleUnblock = (targetUserId: string) => {
    dispatch(unblockUser(targetUserId));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-sm text-base-content/40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {blockedUsers.length === 0 && (
        <p className="text-sm text-base-content/50 text-center py-6">
          No blocked users.
        </p>
      )}
      <AnimatePresence>
        {blockedUsers.map((u) => (
          <motion.div
            key={u._id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
            className="flex items-center justify-between p-3 rounded-xl bg-base-300"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-base-content/10 overflow-hidden shrink-0 relative">
                {u.profilePicture?.url ? (
                  <Image
                    src={u.profilePicture.url}
                    alt={u.displayName ?? u.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-base-content/40 font-medium">
                    {(u.displayName ?? u.username)?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-base-content">
                  {u.displayName ?? u.username}
                </p>
                <p className="text-xs text-base-content/50">@{u.username}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleUnblock(u._id)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline underline-offset-2 cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X size={13} />
              Unblock
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Deactivate Account
// ---------------------------------------------------------------------------
function DeactivateSection() {
  const dispatch = useAppDispatch();
  const { accountLoading } = useSelector((s: RootState) => s.auth);
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);

  const handleConfirm = async () => {
    const result = await dispatch(deactivateAccount());
    if (deactivateAccount.fulfilled.match(result)) {
      setModalOpen(false);
      router.replace("/login"); // user = null, session ended
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-base-300 rounded-xl p-4 flex gap-3">
        <LuShieldAlert size={18} className="text-yellow-400 mt-0.5 shrink-0" />
        <p className="text-sm text-base-content/70 leading-relaxed">
          Deactivating your account will hide your profile and content from
          other users. You can reactivate at any time by logging back in.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full py-2.5 rounded-xl border border-yellow-500/40 text-yellow-400 text-sm font-medium hover:bg-yellow-500/10 transition cursor-pointer"
      >
        Deactivate My Account
      </button>

      <ConfirmModal
        open={modalOpen}
        title="Deactivate your account?"
        description="Your profile will be hidden from other users. You can reactivate at any time by logging back in."
        confirmText="Yes, Deactivate"
        onCancel={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        confirmLoading={accountLoading}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Delete Account
// ---------------------------------------------------------------------------
function DeleteSection() {
  const dispatch = useAppDispatch();
  const { accountLoading } = useSelector((s: RootState) => s.auth);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Verify password first, only open modal if correct
  const handleDeleteClick = async () => {
    if (!password) return;
    setPasswordError(null);
    setVerifying(true);

    const result = await dispatch(checkPassword({ password }));

    setVerifying(false);

    if (checkPassword.fulfilled.match(result)) {
      setModalOpen(true); // ← only opens if password is correct
    } else {
      setPasswordError(result.payload ?? "Incorrect password");
    }
  };

  const handleConfirm = async () => {
    const result = await dispatch(scheduleAccountDeletion({ password }));
    if (scheduleAccountDeletion.fulfilled.match(result)) {
      setModalOpen(false);
      router.replace("/login");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-base-300 rounded-xl p-4 flex gap-3">
        <LuTrash2 size={18} className="text-red-400 mt-0.5 shrink-0" />
        <p className="text-sm text-base-content/70 leading-relaxed">
          Deleting your account will{" "}
          <span className="font-semibold text-red-400">permanently</span> remove
          your profile after a 15-day grace period. You may cancel before then
          by logging back in.
        </p>
      </div>

      <FieldInput
        id="deletePassword"
        label="Confirm Your Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(v) => {
          setPassword(v);
          setPasswordError(null);
        }}
        placeholder="Enter your password to continue"
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="text-base-content/40 hover:text-base-content/70 transition-colors"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
      />

      {/* Password error shown inline, not in modal */}
      {passwordError && (
        <p className="text-xs text-red-400 px-1">{passwordError}</p>
      )}

      <button
        type="button"
        onClick={handleDeleteClick}
        disabled={!password || verifying}
        className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {verifying ? (
          <span className="loading loading-dots loading-sm" />
        ) : (
          "Delete My Account"
        )}
      </button>

      <ConfirmModal
        open={modalOpen}
        title="Schedule account deletion?"
        description={
          <span>
            Your account will be{" "}
            <span className="text-red-400 font-semibold">
              permanently deleted
            </span>{" "}
            after 15 days. You can cancel during this period by logging back in.
          </span>
        }
        confirmText="Delete Account"
        onCancel={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        confirmLoading={accountLoading}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AccountSettings — unchanged
// ---------------------------------------------------------------------------
const accountSections: {
  key: Section;
  icon: React.ElementType;
  label: string;
  description: string;
  danger?: boolean;
}[] = [
  {
    key: "username",
    icon: LuAtSign,
    label: "Change Username",
    description: "Update your @username",
  },
  {
    key: "email",
    icon: LuMail,
    label: "Change Email",
    description: "Update the email address linked to your account",
  },
  {
    key: "password",
    icon: LuLock,
    label: "Change Password",
    description: "Set a new password for your account",
  },
  {
    key: "blocked",
    icon: LuUserX,
    label: "Blocked Users",
    description: "Manage users you have blocked",
  },
  {
    key: "deactivate",
    icon: LuShieldAlert,
    label: "Deactivate Account",
    description: "Temporarily hide your account",
    danger: true,
  },
  {
    key: "delete",
    icon: LuTrash2,
    label: "Delete Account",
    description: "Permanently remove your account and all data",
    danger: true,
  },
];

export default function AccountSettings() {
  const [activeSection, setActiveSection] = useState<Section>(null);

  if (activeSection) {
    const sectionMeta = accountSections.find((s) => s.key === activeSection)!;

    return (
      <div className="flex flex-col gap-4 p-1">
        <div className="flex items-center gap-2 pb-3 border-b border-base-content/10">
          <button
            type="button"
            onClick={() => setActiveSection(null)}
            className="text-xs text-blue-400 hover:underline underline-offset-2 cursor-pointer transition"
          >
            ← Account
          </button>
          <span className="text-base-content/30 text-xs">/</span>
          <p
            className={`text-sm font-semibold ${sectionMeta.danger ? "text-red-400" : "text-base-content"}`}
          >
            {sectionMeta.label}
          </p>
        </div>

        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {activeSection === "username" && <ChangeUsernameSection />}
          {activeSection === "email" && <ChangeEmailSection />}
          {activeSection === "password" && <ChangePasswordSection />}
          {activeSection === "blocked" && <BlockedUsersSection />}
          {activeSection === "deactivate" && <DeactivateSection />}
          {activeSection === "delete" && <DeleteSection />}
        </motion.div>
      </div>
    );
  }

  const general = accountSections.filter((s) => !s.danger);
  const danger = accountSections.filter((s) => s.danger);

  return (
    <div className="flex flex-col gap-1 p-1">
      {general.map((s) => (
        <SectionRow
          key={s.key}
          icon={s.icon}
          label={s.label}
          description={s.description}
          onClick={() => setActiveSection(s.key)}
        />
      ))}

      <div className="my-2 border-t border-base-content/10" />

      <p className="text-xs font-semibold text-red-400/70 uppercase tracking-widest px-3 mb-1">
        Danger Zone
      </p>
      {danger.map((s) => (
        <SectionRow
          key={s.key}
          icon={s.icon}
          label={s.label}
          description={s.description}
          danger
          onClick={() => setActiveSection(s.key)}
        />
      ))}
    </div>
  );
}
