import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { PresenceUpdatePayload, MatchFoundPayload } from "../types.js";

const getSignalingUrl = () => {
  const envUrl = import.meta.env.VITE_SIGNALING_SERVER_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:4000`;
};

const SIGNALING_URL = getSignalingUrl();

export function useSocket(token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState<PresenceUpdatePayload>({
    anyone: 0,
    students_only: 0,
    professionals_only: 0,
    totalOnline: 0,
  });
  const [matchData, setMatchData] = useState<MatchFoundPayload | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [isWidened, setIsWidened] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Connection trigger
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setMatchData(null);
      setQueuePosition(null);
      setIsWidened(false);
      return;
    }

    const socket = io(SIGNALING_URL, {
      auth: { token },
      autoConnect: true,
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
      setSocketError(null);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
      setQueuePosition(null);
      setIsWidened(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setSocketError(error.message);
      setIsConnected(false);
    });

    // Custom events
    socket.on("presence_update", (data: PresenceUpdatePayload) => {
      setPresence(data);
    });

    socket.on("queue_joined", (data: { position: number; widened?: boolean }) => {
      setQueuePosition(data.position);
      if (data.widened) {
        setIsWidened(true);
      }
    });

    socket.on("queue_left", () => {
      setQueuePosition(null);
      setIsWidened(false);
    });

    socket.on("match_found", (data: MatchFoundPayload) => {
      setMatchData(data);
      setQueuePosition(null);
    });

    socket.on("partner_left", () => {
      // Clear current match data when partner leaves
      setMatchData(null);
    });

    socket.on("error", (err: { code: string; message: string }) => {
      console.error("Server-side socket error:", err);
      setSocketError(err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // Command helpers
  const joinQueue = useCallback((filterPreference: string, allowGuests: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join_queue" as any, { filterPreference, allowGuests } as any);
      setSocketError(null);
    }
  }, []);

  const leaveQueue = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave_queue" as any);
      setQueuePosition(null);
      setIsWidened(false);
    }
  }, []);

  const leaveCall = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave_call" as any, { roomId } as any);
      setMatchData(null);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    presence,
    matchData,
    queuePosition,
    isWidened,
    socketError,
    setMatchData,
    joinQueue,
    leaveQueue,
    leaveCall,
  };
}
export type UseSocketResult = ReturnType<typeof useSocket>;
