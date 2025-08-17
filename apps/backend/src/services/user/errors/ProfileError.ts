import { Response } from "express";

export const handleProfileError = (res: Response, error: Error) => {
  const message = error.message
  if (message === "Unauthorized: No user info found") res.status(401).json({ message })
  else if (message === "User not found") res.status(404).json({ message })
  else {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
}

export const handleFriendError = (res: Response, error: Error) => {
  const message = error.message;
  if (message === "Unauthorized") res.status(401).json({ message })
  else if (message === "User not found") res.status(404).json({ message })
  else if (message === "Already friends") res.status(400).json({ message })
  else if (message === "Request already sent") res.status(400).json({ message })
  else if (message === "Request not found") res.status(404).json({ message })
  else if (message === "Not authorized to accept this request") res.status(401).json({ message })
  else res.status(500).json({ message: "Server error" }) //console.error(error) && 
};
