import { Request, Response, NextFunction } from "express";

/**
 * In-memory per-user-per-chat message rate limiter.
 *
 * Prevents rapid message spam. Single-instance only —
 * replace with Redis for horizontal scaling.
 */

const rateMap = new Map<string, number>();
const RATE_LIMIT_MS = 1000; // 1 second
const MAX_KEYS = 10_000;

export const messageRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  
  const userId = req.user?.id;
  const chatId = req.body?.chatId;

  if (!userId || !chatId) {
    res.status(400).json({ error: "Invalid request for rate limiting" });
    return;
  }

  const key = `${userId}:${chatId}`;

  const now = Date.now();
  const lastSentAt = rateMap.get(key);

  if (lastSentAt && now - lastSentAt < RATE_LIMIT_MS) {
    res.status(429).json({
      error: "You're sending messages too fast",
    });
    return;
  }

  rateMap.set(key, now);

  if (rateMap.size > MAX_KEYS) {
    const iterator = rateMap.keys().next();
    if (!iterator.done) {
      rateMap.delete(iterator.value);
    }
  }

  next();
};
