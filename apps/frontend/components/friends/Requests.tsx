"use client";

import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import ProfilePicture from "../ProfilePicture/ProfilePicture";
import {
  fetchRequests,
  acceptFriend,
  rejectFriend,
  cancelFriend,
  FriendRequest,
} from "@/redux/features/friendsSlice";
import FriendCard from "../Message/FriendCard";
import IconButton from "../GlobalComponents/IconButtons";

export default function Requests() {
  const dispatch = useAppDispatch();

  const { requests, requestLoading } = useAppSelector(
    (state) => state.friends
  );

  const { incoming, outgoing } = requests;

  useEffect(() => {
    dispatch(fetchRequests());
  }, [dispatch]);

  const renderRequestCard = (
    request: FriendRequest,
    type: "incoming" | "outgoing"
  ) => {
    const user = type === "incoming" ? request.from : request.to;

    return (
      <FriendCard
        key={request._id}
        msgId={request._id}
        user={{
          name: user.username,
          displayName: user.displayName ?? user.username,
          profilePic: user.profilePicture?.url || "/default-pfp.png",
        }}
        chatType="other"
        hideLastMessage
        rightSlot={
          type === "incoming" ? (
            <div className="flex gap-1">
              <IconButton
                ariaLabel="Accept friend request"
                onClick={() => dispatch(acceptFriend(request._id))}
              >
                <Check size={20} />
              </IconButton>

              <IconButton
                ariaLabel="Reject friend request"
                onClick={() => dispatch(rejectFriend(request._id))}
              >
                <X size={20} />
              </IconButton>
            </div>
          ) : (
            <IconButton
              ariaLabel="Cancel friend request"
              onClick={() => dispatch(cancelFriend(request._id))}
            >
              <X size={20} />
            </IconButton>
          )
        }
      />
    );
  };
  if (requestLoading) {
    return (
      <div className="flex justify-center py-6">
        <span className="loading loading-spinner loading-sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Incoming */}
      {incoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-center uppercase opacity-70 mb-2">
            Received
          </h2>
          <hr className="text-base-content/10 pb-2" />

          {incoming.map((r) => renderRequestCard(r, "incoming"))}
        </section>
      )}
        
      {/* Outgoing */}
      {outgoing.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-center uppercase opacity-70 mb-2">
            Sent
          </h2>
          <hr className="text-base-content/10 pb-2" />

          {outgoing.map((r) => renderRequestCard(r, "outgoing"))}
        </section>
      )}
    </div>
  );
}
