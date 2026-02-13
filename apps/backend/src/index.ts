/**
 * Application entry point.
 *
 * Separates process execution from server initialization logic.
 * This allows the server to be imported in tests without
 * automatically starting the HTTP listener.
 */

import { startServer } from "./server.js";

startServer();