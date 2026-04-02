//otpStore.ts

// In-memory store: email → { otp, expiresAt }
// Replace with Redis in production for multi-instance support

const store = new Map<string, { otp: string; expiresAt: number }>();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const saveOtp = (email: string, otp: string) => {
  store.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });
};

export const verifyOtp = (email: string, otp: string): boolean => {
  const entry = store.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { store.delete(email); return false; }
  if (entry.otp !== otp) return false;
  store.delete(email); // single-use
  return true;
};

export const markVerified = (email: string) => {
  store.set(email, { otp: "__verified__", expiresAt: Date.now() + OTP_TTL_MS });
};

export const isVerified = (email: string): boolean => {
  const entry = store.get(email);
  return !!entry && entry.otp === "__verified__" && Date.now() <= entry.expiresAt;
};

export const clearEmail = (email: string) => store.delete(email);