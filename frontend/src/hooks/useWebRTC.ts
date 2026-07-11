import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { MatchFoundPayload } from "../types.js";
import { getTurnCredential } from "../services/api.js";

interface UseWebRTCOptions {
  socket: Socket | null;
  token: string | null;
  matchData: MatchFoundPayload | null;
  localStream: MediaStream | null;
  onConnectionFailed: () => void;
}

export function useWebRTC({
  socket,
  token,
  matchData,
  localStream,
  onConnectionFailed,
}: UseWebRTCOptions) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteDescSetRef = useRef(false);
  const candidateBufferRef = useRef<any[]>([]);

  useEffect(() => {
    const activeSocket = socket as Socket;
    if (!activeSocket || !token || !matchData || !localStream) {
      // Cleanup peer connection if we leave call
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      setRemoteStream(null);
      setConnectionState("new");
      remoteDescSetRef.current = false;
      candidateBufferRef.current = [];
      return;
    }

    const roomId = matchData.roomId;
    const role = matchData.role;

    let isDestroyed = false;

    async function initializeConnection() {
      try {
        // 1. Fetch TURN Configuration
        let iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
        try {
          const turnData = await getTurnCredential(token!);
          if (turnData && turnData.iceServers) {
            iceServers = [
              { urls: "stun:stun.l.google.com:19302" },
              ...turnData.iceServers,
            ];
          }
        } catch (err) {
          console.warn("Failed to retrieve TURN credentials. Falling back to public STUN.", err);
        }

        if (isDestroyed) return;

        // 2. Create RTCPeerConnection
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        // 3. Add local tracks
        localStream!.getTracks().forEach((track) => {
          pc.addTrack(track, localStream!);
        });

        // 4. Set connection state handlers
        pc.onconnectionstatechange = () => {
          if (isDestroyed) return;
          console.log(`WebRTC Connection State: ${pc.connectionState}`);
          setConnectionState(pc.connectionState);

          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            onConnectionFailed();
          }
        };

        // 5. ICE candidate generator
        pc.onicecandidate = (event) => {
          if (event.candidate && activeSocket.connected) {
            activeSocket.emit("ice_candidate" as any, {
              roomId,
              candidate: event.candidate,
            } as any);
          }
        };

        // 6. Track receiver
        pc.ontrack = (event) => {
          console.log("WebRTC ontrack received remote stream:", event.streams[0]);
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          }
        };

        // 7. Signaling Handlers
        activeSocket.on("webrtc_offer", async (payload: { sdp: any }) => {
          if (isDestroyed || !pcRef.current) return;
          console.log("Received webrtc_offer");
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            remoteDescSetRef.current = true;

            // Flush buffered candidates
            console.log(`Flushing ${candidateBufferRef.current.length} buffered ICE candidates`);
            for (const candidate of candidateBufferRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            candidateBufferRef.current = [];

            // Create and send answer
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            activeSocket.emit("webrtc_answer" as any, { roomId, sdp: answer } as any);
          } catch (err) {
            console.error("Failed to handle webrtc_offer:", err);
          }
        });

        activeSocket.on("webrtc_answer", async (payload: { sdp: any }) => {
          if (isDestroyed || !pcRef.current) return;
          console.log("Received webrtc_answer");
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            remoteDescSetRef.current = true;

            // Flush buffered candidates
            console.log(`Flushing ${candidateBufferRef.current.length} buffered ICE candidates`);
            for (const candidate of candidateBufferRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            candidateBufferRef.current = [];
          } catch (err) {
            console.error("Failed to handle webrtc_answer:", err);
          }
        });

        activeSocket.on("ice_candidate", async (payload: { candidate: any }) => {
          if (isDestroyed || !pcRef.current) return;
          try {
            if (remoteDescSetRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              // Buffer candidate
              candidateBufferRef.current.push(payload.candidate);
            }
          } catch (err) {
            console.error("Failed to add ice_candidate:", err);
          }
        });

        // 8. Initiate Caller/Callee logic
        if (role === "caller") {
          console.log("Acting as caller, creating offer...");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          activeSocket.emit("webrtc_offer" as any, { roomId, sdp: offer } as any);
        } else {
          console.log("Acting as callee, waiting for offer...");
        }

      } catch (err) {
        console.error("Failed to initialize WebRTC connection:", err);
        onConnectionFailed();
      }
    }

    initializeConnection();

    return () => {
      isDestroyed = true;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      activeSocket.off("webrtc_offer");
      activeSocket.off("webrtc_answer");
      activeSocket.off("ice_candidate");
      setRemoteStream(null);
      setConnectionState("disconnected");
      remoteDescSetRef.current = false;
      candidateBufferRef.current = [];
    };
  }, [socket, token, matchData, localStream, onConnectionFailed]);

  return {
    remoteStream,
    connectionState,
  };
}
export type UseWebRTCResult = ReturnType<typeof useWebRTC>;
