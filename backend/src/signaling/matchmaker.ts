import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { UserSession, Room } from "../types.js";
import { activeUsers, waitingQueue, activeRooms } from "./state.js";

/**
 * Checks if two user sessions are compatible for a 1:1 match.
 * Compatibility requires:
 * 1. Mutual filter preferences are satisfied (e.g. if U wants student, V must be student).
 * 2. Guest gating constraints are met (if one is a guest, the other verified user must explicitly allow guests).
 */
export function isCompatible(u: UserSession, v: UserSession): boolean {
  if (u.socketId === v.socketId || u.userId === v.userId) {
    return false;
  }

  const checkFilter = (
    filter: "anyone" | "students_only" | "professionals_only",
    otherCategory: "student" | "professional" | "guest"
  ): boolean => {
    if (filter === "anyone") {
      return true;
    }
    if (filter === "students_only" && otherCategory === "student") {
      return true;
    }
    if (filter === "professionals_only" && otherCategory === "professional") {
      return true;
    }
    return false;
  };

  // Both filters must be satisfied
  const uFiltersV = checkFilter(u.filterPreference, v.category);
  const vFiltersU = checkFilter(v.filterPreference, u.category);

  if (!uFiltersV || !vFiltersU) {
    return false;
  }

  // Guest gating logic
  if (u.category === "guest" && v.category === "guest") {
    return true; // Guest-to-guest is always compatible if filters match (guests are forced to "anyone")
  }

  if (u.category === "guest" && v.category !== "guest") {
    return v.allowGuests;
  }

  if (v.category === "guest" && u.category !== "guest") {
    return u.allowGuests;
  }

  // Both are verified (student or professional)
  return true;
}

/**
 * Runs the matchmaking loop to find pairs of compatible users.
 * Also handles queue aging/widening: after 20s, a queued user's filter
 * preference auto-widens to "anyone", notifying the client.
 */
export function runMatchmaker(io: Server) {
  const now = Date.now();

  // 1. Process Queue Aging (Widening)
  for (let i = 0; i < waitingQueue.length; i++) {
    const u = waitingQueue[i];
    if (!u) continue;

    const waitTime = u.queuedAt ? now - u.queuedAt : 0;
    if (waitTime > 20000 && u.filterPreference !== "anyone") {
      console.log(`[AGED] Widening search filters for user ${u.userId} (${u.institutionName}) after 20s.`);
      u.filterPreference = "anyone";

      // Notify the client that their filter preference has been widened
      io.to(u.socketId).emit("queue_joined", {
        position: i + 1,
        widened: true,
      });
    }
  }

  // 2. Perform Matching (FIFO order)
  for (let i = 0; i < waitingQueue.length; i++) {
    const u = waitingQueue[i];
    if (!u || u.state !== "QUEUED") continue;

    // Find compatible candidates
    const candidates: UserSession[] = [];
    for (let j = 0; j < waitingQueue.length; j++) {
      const v = waitingQueue[j];
      if (!v || v.socketId === u.socketId || v.state !== "QUEUED") continue;

      if (isCompatible(u, v)) {
        candidates.push(v);
      }
    }

    if (candidates.length > 0) {
      // Sort candidates by wait time (descending)
      // Since candidates are in FIFO order, we can check wait times.
      // u.queuedAt is smaller for users who waited longer.
      candidates.sort((c1, c2) => {
        const t1 = c1.queuedAt ? now - c1.queuedAt : 0;
        const t2 = c2.queuedAt ? now - c2.queuedAt : 0;
        return t2 - t1; // Largest wait time first
      });

      const partner = candidates[0];
      if (partner) {
        // Create Room & pair them
        createRoom(io, u, partner);

        // Remove both from waiting queue
        const uIndex = waitingQueue.indexOf(u);
        if (uIndex !== -1) waitingQueue.splice(uIndex, 1);

        const partnerIndex = waitingQueue.indexOf(partner);
        if (partnerIndex !== -1) waitingQueue.splice(partnerIndex, 1);

        // Adjust index since we mutated the array
        i--;
      }
    }
  }
}

/**
 * Creates an active room between two matched users,
 * sets their states, and emits "match_found" events.
 */
function createRoom(io: Server, u: UserSession, v: UserSession) {
  const roomId = uuidv4();
  const now = Date.now();

  // Whichever user has been in queue longer is userA (caller)
  const uWait = u.queuedAt ? now - u.queuedAt : 0;
  const vWait = v.queuedAt ? now - v.queuedAt : 0;

  const userA = uWait >= vWait ? u : v;
  const userB = uWait >= vWait ? v : u;

  const room: Room = {
    roomId,
    userA: {
      socketId: userA.socketId,
      userId: userA.userId,
      institutionName: userA.institutionName,
      category: userA.category,
    },
    userB: {
      socketId: userB.socketId,
      userId: userB.userId,
      institutionName: userB.institutionName,
      category: userB.category,
    },
    createdAt: now,
  };

  activeRooms.set(roomId, room);

  // Update states on both users
  u.state = "MATCHED";
  u.roomId = roomId;
  u.queuedAt = null;

  v.state = "MATCHED";
  v.roomId = roomId;
  v.queuedAt = null;

  // Emit match_found events
  // UserA is the caller, UserB is the callee
  io.to(userA.socketId).emit("match_found", {
    roomId,
    role: "caller",
    partner: {
      institutionName: userB.institutionName,
      category: userB.category,
    },
  });

  io.to(userB.socketId).emit("match_found", {
    roomId,
    role: "callee",
    partner: {
      institutionName: userA.institutionName,
      category: userA.category,
    },
  });

  console.log(`[MATCH] Matched userA (${userA.userId} - ${userA.institutionName}) with userB (${userB.userId} - ${userB.institutionName}) in room ${roomId}`);
}
