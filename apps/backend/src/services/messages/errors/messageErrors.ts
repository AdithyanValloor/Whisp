import { Response } from "express";

export const handleMessageError = (res: Response, error: Error) => {
  const message = error.message;

  if (message === "Unauthorized") {
    res.status(401).json({ message })
  } else if (message === "Not authorized to edit this message") {
    res.status(401).json({ message })
  } else if (message === "Message not found") {
    res.status(404).json({ message })
  } else if (message === "Content is required") {
    res.status(400).json({ message })
  } else if (message === "ChatId is required") {
    res.status(400).json({ message })
  } else {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
};
