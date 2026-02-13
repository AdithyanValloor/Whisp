/**
 * Server bootstrap.
 *
 * Initializes infrastructure (env, database, HTTP, sockets)
 * and starts the application listener.
 *
 * Exported instead of auto-executed to allow controlled startup
 * (e.g., testing, CLI tools, worker processes).
 */

import dotenv from "dotenv";
import http from "http";

import { connectDb } from "./config/db.js";
import { initSocket } from "./socket/index.js";
import { createApp } from "./app.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 9000;

export const startServer = async (): Promise<void> => {
  try {
    await connectDb();

    const app = createApp();
    const server = http.createServer(app);

    initSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};