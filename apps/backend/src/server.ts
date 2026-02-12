import dotenv from "dotenv";
import http from "http";

import { connectDb } from "./config/db.js";
import { initSocket } from "./socket/index.js";
import { createApp } from "./app.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 9000;

const bootstrap = async () => {
  // DB
  await connectDb();

  // App
  const app = createApp();

  // HTTP server
  const server = http.createServer(app);

  // Socket.IO
  initSocket(server);

  // Start listening
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

bootstrap().catch((err) => {
  console.error("❌ Server failed to start", err);
  process.exit(1);
});