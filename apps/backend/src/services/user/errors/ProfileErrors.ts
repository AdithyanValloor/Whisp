import { Response } from "express";

// ---------------- PROFILE ----------------

export const handleProfileError = (res: Response, error: Error) => {
  const message = error.message;

  if (message === "Unauthorized: No user info found") {
    return res.status(401).json({ message });
  }

  if (message === "User not found") {
    return res.status(404).json({ message });
  }

  console.error(error);
  return res.status(500).json({ message: "Server error" });
};

// ---------------- FRIEND ----------------

export const handleFriendError = (res: Response, error: Error) => {
  const message = error.message;

  // ---- AUTH ----
  if (message === "Unauthorized") {
    return res.status(401).json({ message });
  }

  // ---- NOT FOUND ----
  if (message === "User not found" || message === "Request not found") {
    return res.status(404).json({ message });
  }

  // ---- BAD REQUEST ----
  if (
    message === "Already friends" ||
    message === "Friend request already exists" ||
    message === "Cannot send request to yourself" ||
    message === "Not friends" ||
    message === "Cannot cancel processed request"
  ) {
    return res.status(400).json({ message });
  }

  // ---- FORBIDDEN ----
  if (
    message === "Not authorized to accept this request" ||
    message === "Not authorized to reject this request" ||
    message === "Not authorized to cancel this request"
  ) {
    return res.status(403).json({ message });
  }

  // ---- FALLBACK ----
  console.error("Unhandled friend error:", error);
  return res.status(500).json({ message: "Server error" });
};
