/**
 * Builds the Express app without starting the HTTP server.
 * Keeps app setup separate from process/bootstrap code.
 */

import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { errorHandler } from "./middleware/error.middleware.js";
import { startScheduledDeletionJob } from "./jobs/scheduledDeletionJob.js";
import { registerRoutes } from "./routes.js";

export const createApp = (): Application => {
  const app = express();

  // Keep explicit local origins during development while allowing cookies.
  // app.use(
  //   cors({
  //     origin: true, // Restrict in production via env (e.g., CLIENT_URL)
  //     credentials: true,
  //   })
  // );

  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        "http://192.168.20.50:3000",
        "http://192.168.20.50:3001",
      ],
      credentials: true,
    }),
  );

  // Start background cleanup when the app boots.
  startScheduledDeletionJob();

  app.use(express.json());
  app.use(cookieParser());

  // Register feature routes under the API namespace.
  registerRoutes(app);

  // Register last so route and middleware errors reach the global handler.
  app.use(errorHandler);

  return app;
};
