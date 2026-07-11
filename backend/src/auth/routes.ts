import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { v4 as uuidv4 } from "uuid";
import { resolveInstitution } from "./resolveInstitution.js";
import {
  checkRateLimitAndRecord,
  generateAndStoreOtp,
  verifyOtp,
} from "./otpStore.js";
import { sendOtpEmail } from "../utils/email.js";
import { signToken } from "./jwt.js";
import {
  RequestOtpRequest,
  RequestOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  GuestSessionResponse,
} from "../types.js";

const router = Router();

// Basic IP rate limiting mapping for Guest session endpoint to prevent spam
const guestIpLimitMap = new Map<string, { count: number; resetTime: number }>();
const GUEST_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const GUEST_MAX_SESSIONS = 10;

function isGuestIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = guestIpLimitMap.get(ip);

  if (!record) {
    guestIpLimitMap.set(ip, { count: 1, resetTime: now + GUEST_LIMIT_WINDOW_MS });
    return false;
  }

  if (now > record.resetTime) {
    // Reset window
    record.count = 1;
    record.resetTime = now + GUEST_LIMIT_WINDOW_MS;
    return false;
  }

  if (record.count >= GUEST_MAX_SESSIONS) {
    return true;
  }

  record.count += 1;
  return false;
}

// 1. Request OTP Endpoint
router.post(
  "/request-otp",
  async (
    req: Request<{}, {}, RequestOtpRequest>,
    res: Response<RequestOtpResponse>
  ) => {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ success: false, error: "INVALID_REQUEST" });
    }

    // Resolve institution from email domain
    const resolved = resolveInstitution(email);
    if (!resolved) {
      return res.status(400).json({ success: false, error: "UNSUPPORTED_DOMAIN" });
    }

    // Check sliding window rate limit
    const allowed = checkRateLimitAndRecord(email);
    if (!allowed) {
      return res.status(429).json({ success: false, error: "RATE_LIMITED" });
    }

    // Generate and store OTP code
    const otp = generateAndStoreOtp(email);

    // Send code via email helper (Resend or local console print)
    const sent = await sendOtpEmail(email, otp);
    if (!sent) {
      return res.status(500).json({ success: false, error: "EMAIL_SEND_FAILED" });
    }

    return res.status(200).json({ success: true, message: "OTP sent" });
  }
);

// 2. Verify OTP Endpoint
router.post(
  "/verify-otp",
  async (
    req: Request<{}, {}, VerifyOtpRequest>,
    res: Response<VerifyOtpResponse>
  ) => {
    const { email, otp } = req.body;

    if (!email || !otp || typeof email !== "string" || typeof otp !== "string") {
      return res.status(400).json({ success: false, error: "INVALID_REQUEST" });
    }

    // Verify code validation
    const outcome = verifyOtp(email, otp);
    if (outcome !== "SUCCESS") {
      // Return specific error matching outcome
      return res.status(400).json({ success: false, error: outcome });
    }

    // Resolve details again
    const resolved = resolveInstitution(email);
    if (!resolved) {
      return res.status(400).json({ success: false, error: "UNSUPPORTED_DOMAIN" });
    }

    // Success: Issue JWT
    const userId = uuidv4();
    const token = signToken({
      userId,
      institutionName: resolved.name,
      category: resolved.category,
    });

    return res.status(200).json({
      success: true,
      token,
      institutionName: resolved.name,
      category: resolved.category,
    });
  }
);

// 3. Guest Session Creation Endpoint
router.post(
  "/guest-session",
  (req: Request, res: Response<GuestSessionResponse | { success: boolean; error: string }>) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown-ip";

    // Standard IP rate limiting for guests
    if (isGuestIpRateLimited(ip)) {
      return res.status(429).json({ success: false, error: "TOO_MANY_GUEST_SESSIONS" });
    }

    const userId = uuidv4();
    const token = signToken({
      userId,
      institutionName: "Guest",
      category: "guest",
    });

    return res.status(200).json({
      success: true,
      token,
      institutionName: "Guest",
      category: "guest",
    });
  }
);

// 4. Real Google Sign-In Verification Endpoint
router.post(
  "/google-login",
  async (req: Request, res: Response) => {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ success: false, error: "INVALID_REQUEST" });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId || googleClientId === "mock") {
      console.warn("[WARN] GOOGLE_CLIENT_ID is not configured in .env");
      return res.status(500).json({ success: false, error: "GOOGLE_AUTH_NOT_CONFIGURED" });
    }

    try {
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ success: false, error: "INVALID_GOOGLE_TOKEN" });
      }

      const email = payload.email;
      const resolved = resolveInstitution(email);
      if (!resolved) {
        return res.status(400).json({ success: false, error: "UNSUPPORTED_DOMAIN" });
      }

      const userId = uuidv4();
      const token = signToken({
        userId,
        institutionName: resolved.name,
        category: resolved.category,
      });

      return res.status(200).json({
        success: true,
        token,
        institutionName: resolved.name,
        category: resolved.category,
      });
    } catch (err) {
      console.error("[ERROR] Google OAuth verification failed:", err);
      return res.status(400).json({ success: false, error: "GOOGLE_VERIFICATION_FAILED" });
    }
  }
);

export default router;
