"use client";

import { ArrowLeft, CalendarDays, EllipsisVertical } from "lucide-react";
import { FaUserCheck, FaUserClock, FaUserPlus } from "react-icons/fa";
import { useState } from "react";

import ProfilePicture from "../ProfilePicture/ProfilePicture";
import IconButton from "../GlobalComponents/IconButtons";

import { selectUserStatus, useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  addFriend,
  removeFriend,
  cancelFriend,
  acceptFriend,
  rejectFriend,
  FriendRequest,
  addFriendFromSocket,
} from "@/redux/features/friendsSlice";
import ConfirmModal from "../GlobalComponents/ConfirmModal";
import { motion, AnimatePresence, type Variants } from "framer-motion";

interface ProfileViewProps {
  user: {
    _id: string;
    username: string;
    displayName?: string;
    profilePicture?: { url: string | null };
    createdAt?: string;
    about?: string;
    pronouns?: string;
  };
  onBack?: () => void;
}

type FriendAction = "add" | "remove" | "accept" | "reject" | "cancel" | null;

export default function ProfileView({ user, onBack }: ProfileViewProps) {
  const dispatch = useAppDispatch();

  const currentUser = useAppSelector((state) => state.auth.user);
  const friends = useAppSelector((state) => state.friends.friends);
  const { incoming, outgoing } = useAppSelector((state) => state.friends.requests);

  const [pendingAction, setPendingAction] = useState<FriendAction>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const isLoading = (action: FriendAction) => pendingAction === action;

  const status = useAppSelector(selectUserStatus(user._id ?? ""));
  

  // --------------------------------------------------
  // Derived friend status (single source of truth)
  // --------------------------------------------------
  const friendStatus: "friend" | "outgoing" | "incoming" | "none" = (() => {
    if (friends.some((f) => f._id === user._id)) return "friend";
    if (outgoing.some((r) => r.to._id === user._id)) return "outgoing";
    if (incoming.some((r) => r.from._id === user._id)) return "incoming";
    return "none";
  })();

  const incomingReq = incoming.find((r) => r.from._id === user._id);
  const outgoingReq = outgoing.find((r) => r.to._id === user._id);

  // --------------------------------------------------
  // Unified action handler
  // --------------------------------------------------
  const performAction = async (
    action: () => Promise<FriendRequest | string>,
    type: FriendAction,
    after?: () => void
  ): Promise<void> => {
    try {
      setPendingAction(type);
      const result = await action();
      
      // Optimistic update - don't wait for socket
      if (type === 'accept' && result && typeof result !== 'string') {
        // The socket will confirm, but update UI immediately
        const friend = result.from._id === currentUser?._id ? result.to : result.from;
        dispatch(addFriendFromSocket({
          requestId: result._id,
          friend,
        }));
      }
      
      after?.();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingAction(null);
    }
  };

  // --------------------------------------------------
  // Date formatting
  // --------------------------------------------------
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  // --------------------------------------------------
  // Friend button renderer
  // --------------------------------------------------
  const renderFriendButton = () => {
    if (friendStatus === "friend") {
      return (
        <IconButton
          ariaLabel="Remove friend"
          onClick={() => setShowRemoveModal(true)}
        >
          <FaUserCheck size={20} />
        </IconButton>
      );
    }

    if (friendStatus === "outgoing" && outgoingReq) {
      return (
        <IconButton
          ariaLabel="Cancel request"
          disabled={isLoading("cancel")}
          onClick={() =>
            performAction(
              () => dispatch(cancelFriend(outgoingReq._id)).unwrap(),
              "cancel"
            )
          }
          className="bg-base-100 px-5 text-sm text-red-500"
        >
          Cancel Request
        </IconButton>
      );
    }

    return (
      <IconButton
        ariaLabel="Add friend"
        disabled={!!incomingReq || isLoading("add")}
        onClick={() =>
          performAction(
            () => dispatch(addFriend(user.username)).unwrap(),
            "add"
          )
        }
      >
        {incomingReq ? <FaUserClock size={20} /> : <FaUserPlus size={20} />}
      </IconButton>
    );
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative flex flex-col w-full h-full px-3 bg-base-200 overflow-hidden"
    >

      {onBack && 
        <div className="absolute top-3 left-3">
            <IconButton 
              ariaLabel="Go back"
              onClick={onBack}
            >
              <ArrowLeft size={19} />
            </IconButton>
        </div>
      }
      {currentUser?._id !== user._id && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {renderFriendButton()}

          <div className="dropdown dropdown-end">
            <IconButton ariaLabel="More actions" tabIndex={0}>
              <EllipsisVertical size={20} />
            </IconButton>

            <ul
              tabIndex={0}
              className="menu dropdown-content mt-1 bg-base-100 rounded-xl z-10 w-32 p-2 shadow border border-base-content/10"
            >
              <li><a>Ignore</a></li>
              <li><a className="text-red-500">Block</a></li>
              <li><a className="text-red-500">Report User</a></li>
            </ul>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <motion.div variants={itemVariants} className="relative mt-22 z-10">
        <div className="flex items-center gap-4 bg-base-100 rounded-xl p-4 shadow">
          <ProfilePicture
            src={user.profilePicture?.url || ""}
            size="lg"
            status={status ?? "offline"}
          />
          <div className="flex-1">
            <h2 className="text-lg font-semibold leading-tight">
              {user.displayName || user.username}
            </h2>
            <div className="flex items-center gap-2 text-sm opacity-70">
              <p>@{user.username}</p>
              {user.pronouns && <span>• {user.pronouns}</span>}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Incoming Request Banner */}
      <AnimatePresence>
        {incomingReq && (
          <motion.div
            key="incoming-request"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
            className="mt-4 bg-base-100 rounded-2xl shadow p-4"
          >
            <p className="text-sm text-base-content/80">
              <span className="font-semibold text-base-content">
                {user.displayName || user.username}
              </span>{" "}
              sent you a friend request.
            </p>

            <div className="flex gap-2 mt-3">
              <button
                disabled={isLoading("accept")}
                onClick={() =>
                  performAction(
                    () => dispatch(acceptFriend(incomingReq._id)).unwrap(),
                    "accept"
                  )
                }
                className="px-4 py-1.5 rounded-xl cursor-pointer border border-base-content/10 bg-green-700 text-white text-sm hover:bg-green-900"
              >
                Accept
              </button>

              <button
                disabled={isLoading("reject")}
                onClick={() =>
                  performAction(
                    () => dispatch(rejectFriend(incomingReq._id)).unwrap(),
                    "reject"
                  )
                }
                className="px-4 py-1.5 rounded-xl cursor-pointer border border-base-content/10 bg-red-800 text-white text-sm hover:bg-red-900"
              >
                Reject
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* About */}
      <motion.div
        variants={itemVariants}
        className="mt-4 bg-base-100 rounded-xl shadow p-4"
      >
        <p className="text-[11px] uppercase font-medium opacity-60 tracking-wide">
          About
        </p>
        <p className="text-sm mt-1 leading-relaxed">
          {user.about || "Whisp user."}
        </p>
      </motion.div>

      {/* Member Info */}
      <motion.div
        variants={itemVariants}
        className="mt-5 flex items-center justify-between bg-base-100 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 text-xs opacity-80">
          <CalendarDays size={14} />
          <span>Joined {joinedDate}</span>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#004030]">
          Member
        </span>
      </motion.div>

      {/* Accent Bar */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#004030]" />

      {/* Remove Friend Modal */}
      {showRemoveModal && (
        <ConfirmModal
          open
          title={`Remove ${user.displayName || user.username}`}
          description="Are you sure you want to remove this user from your friends?"
          confirmText="Remove"
          confirmLoading={isLoading("remove")}
          onCancel={() => setShowRemoveModal(false)}
          onConfirm={() =>
            performAction(
              () => dispatch(removeFriend(user._id)).unwrap(),
              "remove",
              () => setShowRemoveModal(false)
            )
          }
        />
      )}
    </motion.div>
  );
}