// Shared Core Data Models
export interface UserSession {
  socketId: string;
  userId: string;
  institutionName: string;
  category: "student" | "professional" | "guest";
  filterPreference: "anyone" | "students_only" | "professionals_only";
  allowGuests: boolean;
  state: "IDLE" | "QUEUED" | "MATCHED" | "IN_CALL";
  roomId: string | null;
  queuedAt: number | null;
}

export interface RoomParticipant {
  socketId: string;
  userId: string;
  institutionName: string;
  category: "student" | "professional" | "guest";
}

export interface Room {
  roomId: string;
  userA: RoomParticipant;
  userB: RoomParticipant;
  createdAt: number;
}

// REST API Payload Types
export interface RequestOtpRequest {
  email: string;
}

export interface RequestOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  token?: string;
  institutionName?: string;
  category?: "student" | "professional" | "guest";
  error?: string;
}

export interface GuestSessionResponse {
  success: boolean;
  token?: string;
  institutionName?: "Guest";
  category?: "guest";
  error?: string;
}

export interface TurnCredentialResponse {
  iceServers: RTCIceServer[];
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// WebSocket Event Payload Types
export interface JoinQueuePayload {
  filterPreference: "anyone" | "students_only" | "professionals_only";
  allowGuests?: boolean;
}

export interface QueueJoinedPayload {
  position: number;
  widened?: boolean;
}

export interface PresenceUpdatePayload {
  anyone: number;
  students_only: number;
  professionals_only: number;
  totalOnline: number;
}

export interface MatchFoundPayload {
  roomId: string;
  role: "caller" | "callee";
  partner: {
    institutionName: string;
    category: "student" | "professional" | "guest";
  };
}

export interface ClientWebrtcOfferPayload {
  roomId: string;
  sdp: any;
}

export interface ServerWebrtcOfferPayload {
  sdp: any;
}

export interface ClientWebrtcAnswerPayload {
  roomId: string;
  sdp: any;
}

export interface ServerWebrtcAnswerPayload {
  sdp: any;
}

export interface ClientIceCandidatePayload {
  roomId: string;
  candidate: any;
}

export interface ServerIceCandidatePayload {
  candidate: any;
}

export interface LeaveCallPayload {
  roomId: string;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
}
