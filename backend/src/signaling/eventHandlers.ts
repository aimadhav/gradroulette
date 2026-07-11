import { Server, Socket } from "socket.io";
import { AuthenticatedSocket } from "./socketMiddleware.js";
import { activeUsers, waitingQueue, activeRooms } from "./state.js";
import {
  JoinQueuePayload,
  ClientWebrtcOfferPayload,
  ClientWebrtcAnswerPayload,
  ClientIceCandidatePayload,
  LeaveCallPayload,
} from "../types.js";

export function registerSocketHandlers(io: Server, socket: Socket) {
  const authSocket = socket as AuthenticatedSocket;
  const socketId = socket.id;

  // 1. Join Queue Event
  socket.on("join_queue", (rawPayload: any) => {
    const user = activeUsers.get(socketId);
    if (!user) {
      socket.emit("error", { code: "AUTH_FAILED", message: "User session not found." });
      return;
    }

    if (user.state !== "IDLE") {
      socket.emit("error", {
        code: "ALREADY_QUEUED",
        message: "You are already queued or active in a call.",
      });
      return;
    }

    // Cast and validate payload fields
    const payload = rawPayload as JoinQueuePayload;
    if (
      !payload ||
      !["anyone", "students_only", "professionals_only"].includes(payload.filterPreference)
    ) {
      socket.emit("error", { code: "INVALID_PAYLOAD", message: "Invalid filter preference." });
      return;
    }

    // Guests are always forced to "anyone" server-side
    user.filterPreference = user.category === "guest" ? "anyone" : payload.filterPreference;
    user.allowGuests = user.category === "guest" ? false : !!payload.allowGuests;
    user.state = "QUEUED";
    user.queuedAt = Date.now();

    // Prevent duplicate entries
    if (!waitingQueue.some((u) => u.socketId === socketId)) {
      waitingQueue.push(user);
    }

    socket.emit("queue_joined", { position: waitingQueue.indexOf(user) + 1 });
  });

  // 2. Leave Queue Event
  socket.on("leave_queue", () => {
    const user = activeUsers.get(socketId);
    if (!user) return;

    const index = waitingQueue.findIndex((u) => u.socketId === socketId);
    if (index !== -1) {
      waitingQueue.splice(index, 1);
    }

    user.state = "IDLE";
    user.queuedAt = null;
    socket.emit("queue_left", {});
  });

  // 3. WebRTC Offer Relay
  socket.on("webrtc_offer", (payload: ClientWebrtcOfferPayload) => {
    if (!payload || !payload.roomId || !payload.sdp) {
      socket.emit("error", { code: "INVALID_PAYLOAD", message: "Missing roomId or sdp." });
      return;
    }

    const room = activeRooms.get(payload.roomId);
    if (!room) {
      socket.emit("error", { code: "ROOM_NOT_FOUND", message: "Room not found." });
      return;
    }

    // Verify caller (userA is the designated caller)
    if (room.userA.socketId !== socketId) {
      socket.emit("error", { code: "NOT_IN_ROOM", message: "Unauthorized offer relay." });
      return;
    }

    // Transition both users to IN_CALL state
    const peerA = activeUsers.get(room.userA.socketId);
    const peerB = activeUsers.get(room.userB.socketId);
    if (peerA) peerA.state = "IN_CALL";
    if (peerB) peerB.state = "IN_CALL";

    // Relay offer to userB
    io.to(room.userB.socketId).emit("webrtc_offer", { sdp: payload.sdp });
  });

  // 4. WebRTC Answer Relay
  socket.on("webrtc_answer", (payload: ClientWebrtcAnswerPayload) => {
    if (!payload || !payload.roomId || !payload.sdp) {
      socket.emit("error", { code: "INVALID_PAYLOAD", message: "Missing roomId or sdp." });
      return;
    }

    const room = activeRooms.get(payload.roomId);
    if (!room) {
      socket.emit("error", { code: "ROOM_NOT_FOUND", message: "Room not found." });
      return;
    }

    // Verify answerer (userB is the designated answerer)
    if (room.userB.socketId !== socketId) {
      socket.emit("error", { code: "NOT_IN_ROOM", message: "Unauthorized answer relay." });
      return;
    }

    // Relay answer to userA
    io.to(room.userA.socketId).emit("webrtc_answer", { sdp: payload.sdp });
  });

  // 5. ICE Candidate Relay
  socket.on("ice_candidate", (payload: ClientIceCandidatePayload) => {
    if (!payload || !payload.roomId || !payload.candidate) {
      socket.emit("error", { code: "INVALID_PAYLOAD", message: "Missing roomId or candidate." });
      return;
    }

    const room = activeRooms.get(payload.roomId);
    if (!room) {
      socket.emit("error", { code: "ROOM_NOT_FOUND", message: "Room not found." });
      return;
    }

    // Determine target recipient
    let targetSocketId: string | null = null;
    if (room.userA.socketId === socketId) {
      targetSocketId = room.userB.socketId;
    } else if (room.userB.socketId === socketId) {
      targetSocketId = room.userA.socketId;
    }

    if (!targetSocketId) {
      socket.emit("error", { code: "NOT_IN_ROOM", message: "User is not in the specified room." });
      return;
    }

    io.to(targetSocketId).emit("ice_candidate", { candidate: payload.candidate });
  });

  // 6. Leave Call / Next Event
  socket.on("leave_call", (payload: LeaveCallPayload) => {
    if (!payload || !payload.roomId) {
      socket.emit("error", { code: "INVALID_PAYLOAD", message: "Missing roomId." });
      return;
    }

    const room = activeRooms.get(payload.roomId);
    if (!room) {
      socket.emit("error", { code: "ROOM_NOT_FOUND", message: "Room not found." });
      return;
    }

    // Identify participants
    const peerA = activeUsers.get(room.userA.socketId);
    const peerB = activeUsers.get(room.userB.socketId);

    // Notify the other partner that they left
    const partnerSocketId = room.userA.socketId === socketId ? room.userB.socketId : room.userA.socketId;
    io.to(partnerSocketId).emit("partner_left", {});

    // Clean up both users' states
    if (peerA) {
      peerA.state = "IDLE";
      peerA.roomId = null;
    }
    if (peerB) {
      peerB.state = "IDLE";
      peerB.roomId = null;
    }

    activeRooms.delete(payload.roomId);
  });

  // 7. Disconnect lifecycle
  socket.on("disconnect", () => {
    const user = activeUsers.get(socketId);
    if (!user) return;

    // A. Remove from waiting queue if present
    const qIndex = waitingQueue.findIndex((u) => u.socketId === socketId);
    if (qIndex !== -1) {
      waitingQueue.splice(qIndex, 1);
    }

    // B. Clean up active calls
    if (user.roomId) {
      const room = activeRooms.get(user.roomId);
      if (room) {
        const partnerSocketId = room.userA.socketId === socketId ? room.userB.socketId : room.userA.socketId;
        const partner = activeUsers.get(partnerSocketId);

        // Notify partner
        io.to(partnerSocketId).emit("partner_left", {});

        if (partner) {
          partner.state = "IDLE";
          partner.roomId = null;
        }

        activeRooms.delete(user.roomId);
      }
    }

    // C. Remove from active users list
    activeUsers.delete(socketId);
  });
}
