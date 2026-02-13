/**
 * Express application factory.
 *
 * Creates and configures the HTTP layer without starting the server.
 * Exported as a factory to improve testability and keep bootstrap
 * logic separate (see server.ts).
 */

import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { userRouter } from "./services/user/routes/user.routes.js";
import { profileRouter } from "./services/user/routes/profile.routes.js";
import { friendRouter } from "./services/user/routes/friend.routes.js";
import { chatRouter } from "./services/chat/routes/chat.routes.js";
import { groupChatRouter } from "./services/chat/routes/group.routes.js";
import { messageRouter } from "./services/messages/routes/messages.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

export const createApp = (): Application => {
  const app = express();

  // Global middleware
  app.use(
    cors({
      origin: true, // Restrict in production via env (e.g., CLIENT_URL)
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  // API routes
  app.use("/api/user", userRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/friends", friendRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/group", groupChatRouter);
  app.use("/api/message", messageRouter);

  // Must be registered after all routes
  app.use(errorHandler);

  return app;
};