interface OtpRecord {
  otp: string;
  expiresAt: number;
  attempts: number;
}

interface RateLimitRecord {
  timestamps: number[];
}

const otpMap = new Map<string, OtpRecord>();
const rateLimitMap = new Map<string, RateLimitRecord>();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 3;

/**
 * Checks if the email is rate-limited for requesting OTPs.
 * If not rate-limited, logs the request timestamp.
 */
export function checkRateLimitAndRecord(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();
  let record = rateLimitMap.get(normalizedEmail);

  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(normalizedEmail, record);
  }

  // Filter timestamps to only keep those in the active window
  record.timestamps = record.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limited
  }

  record.timestamps.push(now);
  return true;
}

/**
 * Generates and stores a 6-digit numeric OTP for the email.
 */
export function generateAndStoreOtp(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  otpMap.set(normalizedEmail, {
    otp,
    expiresAt,
    attempts: 0,
  });

  return otp;
}

export type VerifyOtpResult = "SUCCESS" | "INVALID_OTP" | "EXPIRED_OTP" | "TOO_MANY_ATTEMPTS" | "NO_RECORD";

/**
 * Verifies the OTP for the given email.
 * If successful, deletes the OTP record.
 */
export function verifyOtp(email: string, otpInput: string): VerifyOtpResult {
  const normalizedEmail = email.trim().toLowerCase();
  const record = otpMap.get(normalizedEmail);

  if (!record) {
    return "NO_RECORD";
  }

  const now = Date.now();

  // Check if expired
  if (now > record.expiresAt) {
    otpMap.delete(normalizedEmail);
    return "EXPIRED_OTP";
  }

  // Check if too many attempts
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    otpMap.delete(normalizedEmail);
    return "TOO_MANY_ATTEMPTS";
  }

  // Verify match
  if (record.otp !== otpInput.trim()) {
    record.attempts += 1;
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      otpMap.delete(normalizedEmail);
      return "TOO_MANY_ATTEMPTS";
    }
    return "INVALID_OTP";
  }

  // Success: consume and delete the OTP
  otpMap.delete(normalizedEmail);
  return "SUCCESS";
}
