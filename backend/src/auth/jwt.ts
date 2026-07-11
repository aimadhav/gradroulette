import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev-only-change-in-prod";

export interface TokenPayload {
  userId: string;
  institutionName: string;
  category: "student" | "professional" | "guest";
}

export function signToken(payload: TokenPayload): string {
  // Expiry set to 24h
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
