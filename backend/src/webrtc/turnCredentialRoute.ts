import { Router, Request, Response } from "express";
import { verifyToken } from "../auth/jwt.js";
import { TurnCredentialResponse } from "../types.js";

const router = Router();



// Default fallback ICE Servers (Google STUN)
const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

router.get(
  "/webrtc/turn-credential",
  async (req: Request, res: Response<TurnCredentialResponse | { error: string }>) => {
    // 1. Authenticate via JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "UNAUTHORIZED_MISSING_TOKEN" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "UNAUTHORIZED_INVALID_TOKEN" });
    }

    let userId: string;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (err) {
      return res.status(401).json({ error: "UNAUTHORIZED_EXPIRED_TOKEN" });
    }

    // 2. Fetch credentials from Metered.ca
    // If not configured, fall back to Google STUN gracefully
    const meteredSecretKey = process.env.METERED_SECRET_KEY;
    const meteredAppDomain = process.env.METERED_APP_DOMAIN || "gradroulette.metered.live";

    if (!meteredSecretKey || meteredSecretKey === "mock") {
      console.warn("[WARN] METERED_SECRET_KEY not set. Falling back to STUN-only.");
      return res.status(200).json({ iceServers: DEFAULT_ICE_SERVERS });
    }

    try {
      // Step A: Create the credential
      const createUrl = `https://${meteredAppDomain}/api/v1/turn/credential?secretKey=${meteredSecretKey}`;
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiryInSeconds: 1800, // 30 minutes
          label: userId,
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Metered Create Credential failed: ${createRes.statusText}`);
      }

      const credentialData = (await createRes.json()) as {
        username: string;
        password?: string;
        apiKey: string;
      };

      // Step B: Get ICE servers list using apiKey
      const getServersUrl = `https://${meteredAppDomain}/api/v1/turn/credentials?apiKey=${credentialData.apiKey}`;
      const getServersRes = await fetch(getServersUrl);

      if (!getServersRes.ok) {
        throw new Error(`Metered Get Credentials failed: ${getServersRes.statusText}`);
      }

      const iceServers = (await getServersRes.json()) as any[];

      return res.status(200).json({ iceServers });
    } catch (error) {
      console.error("[ERROR] Failed to fetch TURN credentials from Metered.ca:", error);
      // Fallback to STUN-only so the call can still attempt P2P connection
      return res.status(200).json({ iceServers: DEFAULT_ICE_SERVERS });
    }
  }
);

export default router;
