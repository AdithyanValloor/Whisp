import mongoose from "mongoose";
import dotenv from "dotenv";

/**
 * ------------------------------------------------------------------
 * Environment Configuration
 * ------------------------------------------------------------------
 * Loads environment variables from `.env` into `process.env`.
 * This must be executed before accessing any env variables.
 */
dotenv.config();

/**
 * MongoDB connection URI
 * Expected format:
 * mongodb://<host>:<port>/<db>
 * or
 * mongodb+srv://<user>:<password>@<cluster>/<db>
 */
const MONGO_URI = process.env.MONGO_URI;

/**
 * Fail fast if MongoDB URI is missing.
 *
 * Why:
 * - Prevents the app from running in a broken state
 * - Makes misconfiguration obvious during startup
 */
if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

/**
 * ------------------------------------------------------------------
 * MongoDB Connection Helper
 * ------------------------------------------------------------------
 *
 * @desc    Establishes a connection to MongoDB using Mongoose
 * @returns Promise<void>
 *
 * Behavior:
 * - Attempts to connect using the provided connection string
 * - Logs the connected host on success
 * - Terminates the process on failure
 *
 * Notes:
 * - This function should be called **once** during app bootstrap
 * - Mongoose maintains an internal connection pool afterward
 */
export const connectDb = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(MONGO_URI);

    console.log(
      `🍃 MongoDB connected successfully: ${connection.connection.host}`
    );
  } catch (error) {
    /**
     * Connection failure is considered fatal.
     * The server should not continue running without a database.
     */
    console.error(
      "❌ MongoDB connection failed:",
      error instanceof Error ? error.message : error
    );

    // Exit the process with failure code
    process.exit(1);
  }
};
