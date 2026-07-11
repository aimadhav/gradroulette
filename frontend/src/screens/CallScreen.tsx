import { useEffect, useRef, useState } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  PhoneOff,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { MatchFoundPayload } from "../types.js";

interface CallScreenProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  matchData: MatchFoundPayload;
  onNext: () => void;
  onEnd: () => void;
}

export function CallScreen({
  localStream,
  remoteStream,
  connectionState,
  matchData,
  onNext,
  onEnd,
}: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);

  // Active call duration timer
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: any;
    if (connectionState === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionState]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Bind streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleToggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const partner = matchData.partner;
  const isConnecting = connectionState !== "connected";

  const getBadgeBg = (cat: string) => {
    if (cat === "student") return "var(--color-blue)";
    if (cat === "professional") return "var(--color-amber)";
    return "var(--text-dark-muted)";
  };

  return (
    <div className="desktop-call-layout">
      <div className="desktop-call-viewport">
        
        {/* Remote Video Stream */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="fullscreen-video"
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            color: "var(--text-dark-secondary)",
            background: "#0c101d"
          }}>
            <Loader2 size={36} style={{ animation: "spinnerRotate 2s linear infinite", color: "var(--color-blue)" }} />
            <p className="text-mono" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.75 }}>
              {isConnecting ? "Negotiating WebRTC Connection pipeline..." : "Awaiting remote client feed..."}
            </p>
          </div>
        )}

        {/* Top Overlay Banner (Partner Metadata & Timer) */}
        <div style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          zIndex: 10,
          background: "rgba(10, 14, 26, 0.75)",
          backdropFilter: "blur(10px)",
          padding: "10px 16px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "700", fontSize: "1rem", color: "#ffffff", fontFamily: "var(--font-family-heading)" }}>
              {partner.institutionName}
            </span>
            <span style={{
              fontSize: "0.6rem",
              fontWeight: "700",
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: "4px",
              background: getBadgeBg(partner.category),
              color: "#ffffff"
            }}>
              {partner.category}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.7rem", color: "rgba(255,255,255,0.75)" }}>
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: connectionState === "connected" ? "var(--color-green)" : "var(--color-amber)",
              boxShadow: connectionState === "connected" ? "0 0 6px var(--color-green)" : "none"
            }}></span>
            <span>
              {connectionState === "connected" ? `CONNECTED - ${formatTime(callDuration)}` : connectionState.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Local Floating Video (PiP) */}
        <div className="floating-local-pip">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {(!videoEnabled || !micEnabled) && (
            <div style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              display: "flex",
              gap: "4px",
              zIndex: 16,
              transform: "scaleX(-1)" // Keep icons facing forward
            }}>
              {!videoEnabled && <VideoOff size={11} style={{ color: "var(--color-red)" }} />}
              {!micEnabled && <MicOff size={11} style={{ color: "var(--color-red)" }} />}
            </div>
          )}
        </div>

        {/* Translucent Controls bar */}
        <div className="translucent-controls-dock">
          {/* Mutes */}
          <button
            onClick={handleToggleVideo}
            className={`dock-btn ${!videoEnabled ? "active-muted" : ""}`}
            title={videoEnabled ? "Mute Camera" : "Unmute Camera"}
          >
            {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          <button
            onClick={handleToggleMic}
            className={`dock-btn ${!micEnabled ? "active-muted" : ""}`}
            title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          <button
            onClick={() => setSpeakerEnabled(!speakerEnabled)}
            className={`dock-btn ${!speakerEnabled ? "active-muted" : ""}`}
            title={speakerEnabled ? "Mute Speaker" : "Unmute Speaker"}
          >
            <Volume2 size={18} />
          </button>

          <div className="dock-divider"></div>

          {/* Call Actions */}
          <button
            onClick={onNext}
            className="dock-btn"
            style={{ backgroundColor: "var(--color-blue)", borderColor: "var(--color-blue)" }}
            title="Next Partner"
          >
            <ArrowRight size={18} />
          </button>

          <button
            onClick={onEnd}
            className="dock-btn"
            style={{ backgroundColor: "var(--color-red)", borderColor: "var(--color-red)" }}
            title="End Call"
          >
            <PhoneOff size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
export default CallScreen;
