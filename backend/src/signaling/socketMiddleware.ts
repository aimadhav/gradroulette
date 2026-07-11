import { Socket } from "socket.io";
import { verifyToken } from "../auth/jwt.js";
import { activeUsers } from "./state.js";

// Extend the Socket type locally or cast
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  institutionName?: string;
  category?: "student" | "professional" | "guest";
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const authSocket = socket as AuthenticatedSocket;
  const token = authSocket.handshake.auth.token;

  if (!token) {
    return next(new Error("AUTH_FAILED"));
  }

  try {
    const payload = verifyToken(token);
    authSocket.userId = payload.userId;
    authSocket.institutionName = payload.institutionName;
    authSocket.category = payload.category;

    // Register active user in IDLE state on connect
    activeUsers.set(socket.id, {
      socketId: socket.id,
      userId: payload.userId,
      institutionName: payload.institutionName,
      category: payload.category,
      filterPreference: "anyone", // Default
      allowGuests: false, // Default
      state: "IDLE",
      roomId: null,
      queuedAt: null,
    });

    next();
  } catch (error) {
    next(new Error("AUTH_FAILED"));
  }
}
