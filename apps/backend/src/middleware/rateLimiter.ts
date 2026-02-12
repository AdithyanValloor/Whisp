import { Request, Response, NextFunction } from "express";

/**
 * ------------------------------------------------------------------
 * In-Memory Message Rate Limiter
 * ------------------------------------------------------------------
 * Purpose:
 * - Prevents users from spamming messages in the same chat
 * - Applies a per-user-per-chat cooldown window
 *
 * Important:
 * - This is an in-memory limiter (per Node.js instance)
 * - In a multi-instance / horizontal scale setup, this should be
 *   replaced with Redis or a centralized store
 */

/**
 * Stores last message timestamps.
 *
 * Key format:
 *   `${userId}:${chatId}`
 *
 * Value:
 *   Unix timestamp (ms) of last allowed message
 */
const rateMap = new Map<string, number>();

/**
 * Minimum delay required between consecutive messages
 * sent by the same user in the same chat.
 */
const RATE_LIMIT_MS = 1000; // 1 second

/**
 * Maximum number of keys allowed in memory.
 *
 * Why:
 * - Prevents unbounded memory growth
 * - Oldest entries are evicted once the limit is exceeded
 */
const MAX_KEYS = 10_000;

/**
 * ------------------------------------------------------------------
 * Message Rate Limiter Middleware
 * ------------------------------------------------------------------
 *
 * @desc    Limits how frequently a user can send messages in a chat
 * @route   Applied to message-sending endpoints
 * @access  Private (requires authenticated user)
 *
 * Behavior:
 * - Identifies requests by (userId + chatId)
 * - Blocks requests sent faster than RATE_LIMIT_MS
 * - Returns HTTP 429 when limit is exceeded
 *
 * Notes:
 * - Relies on `protect` middleware to populate `req.user`
 * - chatId must be present in request body
 */
export const messageRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.user?.id;
  const chatId = req.body?.chatId;

  /**
   * Guard clause:
   * If required identifiers are missing, rate limiting
   * cannot be applied safely.
   */
  if (!userId || !chatId) {
    res.status(400).json({ error: "Invalid request for rate limiting" });
    return;
  }

  // Unique key for this user-chat combination
  const key = `${userId}:${chatId}`;

  const now = Date.now();
  const lastSentAt = rateMap.get(key);

  /**
   * Rate limit check:
   * If the previous message was sent too recently,
   * reject the request.
   */
  if (lastSentAt && now - lastSentAt < RATE_LIMIT_MS) {
    res.status(429).json({
      error: "You're sending messages too fast",
    });
    return;
  }

  // Record current message timestamp
  rateMap.set(key, now);

  /**
   * Memory safety:
   * If map grows beyond MAX_KEYS, evict the oldest entry.
   * Map preserves insertion order, so first key is oldest.
   */
  if (rateMap.size > MAX_KEYS) {
    const iterator = rateMap.keys().next();
    if (!iterator.done) {
      rateMap.delete(iterator.value);
    }
  }

  // Allow request to proceed
  next();
};
