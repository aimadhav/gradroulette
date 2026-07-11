import { UserSession, Room } from "../types.js";

// Maps socketId to UserSession
export const activeUsers = new Map<string, UserSession>();

// Array of UserSessions currently waiting in queue (FIFO)
export const waitingQueue: UserSession[] = [];

// Maps roomId to Room data structure
export const activeRooms = new Map<string, Room>();
