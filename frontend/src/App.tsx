import { useState, useEffect, useCallback } from "react";
import { Sparkles, Lock, ShieldCheck, Sliders, Target, Video as VideoIcon } from "lucide-react";
import { useMediaStream } from "./hooks/useMediaStream.ts";
import { useSocket } from "./hooks/useSocket.ts";
import { useWebRTC } from "./hooks/useWebRTC.ts";
import { LoginScreen } from "./screens/LoginScreen.tsx";
import { OtpScreen } from "./screens/OtpScreen.tsx";
import { FilterScreen } from "./screens/FilterScreen.tsx";
import { SearchingScreen } from "./screens/SearchingScreen.tsx";
import { CallScreen } from "./screens/CallScreen.tsx";

export function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("gr_token"));
  const [institutionName, setInstitutionName] = useState<string>(() => localStorage.getItem("gr_inst") || "");
  const [category, setCategory] = useState<"student" | "professional" | "guest">(() => {
    return (localStorage.getItem("gr_cat") as any) || "student";
  });
  
  const [email, setEmail] = useState<string | null>(null);
  
  // Keep track of search preferences to auto-requeue on partner disconnect
  const [lastFilterPref, setLastFilterPref] = useState<"anyone" | "students_only" | "professionals_only">("anyone");
  const [lastAllowGuests, setLastAllowGuests] = useState(false);
  const [partnerLeftAlert, setPartnerLeftAlert] = useState(false);

  // Sync token to storage
  useEffect(() => {
    if (token) {
      localStorage.setItem("gr_token", token);
      localStorage.setItem("gr_inst", institutionName);
      localStorage.setItem("gr_cat", category);
    } else {
      localStorage.removeItem("gr_token");
      localStorage.removeItem("gr_inst");
      localStorage.removeItem("gr_cat");
    }
  }, [token, institutionName, category]);

  // Hooks
  const { localStream, error: mediaError, requestStream, stopStream } = useMediaStream();
  const {
    socket,
    isConnected,
    presence,
    matchData,
    queuePosition,
    isWidened,
    joinQueue,
    leaveQueue,
    leaveCall,
    setMatchData,
  } = useSocket(token);

  // Handle WebRTC connection failures
  const handleConnectionFailed = useCallback(() => {
    console.warn("Connection state failed or disconnected. Re-queueing...");
    if (matchData) {
      leaveCall(matchData.roomId);
    }
    // Re-enter queue automatically
    joinQueue(lastFilterPref, lastAllowGuests);
  }, [matchData, leaveCall, joinQueue, lastFilterPref, lastAllowGuests]);

  const { remoteStream, connectionState } = useWebRTC({
    socket,
    token,
    matchData,
    localStream,
    onConnectionFailed: handleConnectionFailed,
  });

  // Partner Disconnect Auto-Requeue trigger
  useEffect(() => {
    // If we had a match, but now matchData is null (and we are NOT in idle state, meaning we didn't click End Call)
    // Wait, useSocket sets matchData to null when the server emits partner_left.
    // We want to auto-requeue after 1 second!
    if (token && !matchData && queuePosition === null && localStream) {
      // Show alert, then auto-search
      setPartnerLeftAlert(true);
      const timer = setTimeout(() => {
        setPartnerLeftAlert(false);
        joinQueue(lastFilterPref, lastAllowGuests);
      }, 1500);

      return () => clearTimeout(timer);
    }
    return;
  }, [matchData, token, queuePosition, localStream, joinQueue, lastFilterPref, lastAllowGuests]);

  // Screen State Resolver
  let currentScreen: "LOGIN" | "OTP" | "FILTER" | "SEARCHING" | "CALL";
  if (!token) {
    currentScreen = email ? "OTP" : "LOGIN";
  } else if (matchData) {
    currentScreen = "CALL";
  } else if (queuePosition !== null) {
    currentScreen = "SEARCHING";
  } else {
    currentScreen = "FILTER";
  }

  // Action callbacks
  const handleOtpRequested = (targetEmail: string) => {
    setEmail(targetEmail);
  };

  const handleLoginSuccess = (newToken: string, newInst: string, newCat: string) => {
    setToken(newToken);
    setInstitutionName(newInst);
    setCategory(newCat as any);
    setEmail(null);
  };

  const handleLogout = () => {
    stopStream();
    setToken(null);
    setInstitutionName("");
    setCategory("student");
    setEmail(null);
    setMatchData(null);
  };

  const handleStartSearch = async (
    filterPreference: "anyone" | "students_only" | "professionals_only",
    allowGuests: boolean
  ) => {
    try {
      // 1. Obtain Media Stream once per session
      await requestStream();
      // 2. Remember preferences for requeueing
      setLastFilterPref(filterPreference);
      setLastAllowGuests(allowGuests);
      // 3. Register in signaling queue
      joinQueue(filterPreference, allowGuests);
    } catch (err) {
      // Permission error is captured by useMediaStream
      console.error("Camera access required to join queue:", err);
    }
  };

  const handleCancelSearch = () => {
    leaveQueue();
  };

  const handleNextCall = () => {
    if (matchData) {
      leaveCall(matchData.roomId);
    }
    // Instantly rejoin search queue
    joinQueue(lastFilterPref, lastAllowGuests);
  };

  const handleEndCall = () => {
    if (matchData) {
      leaveCall(matchData.roomId);
    }
    // Return to filter configuration screen
  };

  return (
    <div className="desktop-viewport-container">
      {/* Top Header Branding (Unauthenticated/Filter screens only) */}
      {currentScreen !== "CALL" && currentScreen !== "SEARCHING" && (
        <header style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          width: "100%",
          maxWidth: "1000px",
          marginBottom: "24px",
          fontFamily: "var(--font-family-heading)",
          animation: "fadeInUp 0.4s ease-out"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              background: "var(--color-blue)",
              borderRadius: "8px",
              color: "#ffffff"
            }}>
              <VideoIcon size={14} fill="#ffffff" />
            </div>
            <span style={{ fontSize: "1.2rem", fontWeight: "700", color: "#ffffff" }}>
              GradRoulette
            </span>
            <span style={{
              fontSize: "0.55rem",
              fontWeight: "700",
              textTransform: "uppercase",
              padding: "1px 4px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              color: "var(--text-dark-secondary)"
            }}>
              MVP
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dark-muted)", marginTop: "4px" }}>
            Meet peers. Learn. Grow.
          </span>
        </header>
      )}

      {/* Main Screen Router */}
      <main style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%"
      }}>
        {(currentScreen === "LOGIN" || currentScreen === "OTP") ? (
          <div className="auth-split-layout">
            {/* Left side brand showcase panel */}
            <div className="auth-brand-pane">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    background: "var(--color-blue)",
                    borderRadius: "10px",
                    color: "#ffffff"
                  }}>
                    <VideoIcon size={16} fill="#ffffff" />
                  </div>
                  <span style={{ fontSize: "1.4rem", fontWeight: "700", color: "#ffffff", fontFamily: "var(--font-family-heading)" }}>
                    GradRoulette
                  </span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-dark-muted)", display: "block", marginTop: "6px" }}>
                  Meet peers. Learn. Grow.
                </span>

                <div className="feature-list-wrap">
                  {/* Item 1 */}
                  <div className="feature-item-inline">
                    <div className="feature-item-icon-box">
                      <Lock size={16} />
                    </div>
                    <div>
                      <span className="feature-item-title">Secure & Private</span>
                      <span className="feature-item-desc">Email domain verification ensures safe connection. Guests stay hidden by default.</span>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="feature-item-inline">
                    <div className="feature-item-icon-box">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <span className="feature-item-title">Safe & Reliable</span>
                      <span className="feature-item-desc">OTP codes limit registrations. Account rates throttle abuse vectors.</span>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="feature-item-inline">
                    <div className="feature-item-icon-box">
                      <Sliders size={16} />
                    </div>
                    <div>
                      <span className="feature-item-title">Customizable Matches</span>
                      <span className="feature-item-desc">Filter targets for students or professionals. Control guest matching rules.</span>
                    </div>
                  </div>

                  {/* Item 4 */}
                  <div className="feature-item-inline">
                    <div className="feature-item-icon-box">
                      <Target size={16} />
                    </div>
                    <div>
                      <span className="feature-item-title">Smart Matching</span>
                      <span className="feature-item-desc">Concentric dial loaders show real-time diagnostics. Auto-widens targets.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "0.7rem", color: "var(--text-dark-muted)" }}>
                © 2026 GradRoulette. Verified Identity lounge MVP.
              </div>
            </div>

            {/* Right side form panel */}
            <div className="auth-form-pane">
              {currentScreen === "LOGIN" && (
                <LoginScreen
                  onOtpRequested={handleOtpRequested}
                  onLoginSuccess={handleLoginSuccess}
                />
              )}
              {currentScreen === "OTP" && (
                <OtpScreen
                  email={email!}
                  onLoginSuccess={handleLoginSuccess}
                  onBack={() => setEmail(null)}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            {currentScreen === "FILTER" && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                {/* Camera permission error warning */}
                {mediaError && (
                  <div className="callout-blue" style={{
                    maxWidth: "1000px",
                    width: "100%",
                    background: "rgba(220, 38, 38, 0.08)",
                    borderColor: "rgba(220, 38, 38, 0.2)",
                    color: "#f87171"
                  }}>
                    {mediaError} Please check browser camera configurations.
                  </div>
                )}
                
                {/* Auto-requeue alert notice */}
                {partnerLeftAlert && (
                  <div className="callout-blue" style={{
                    maxWidth: "1000px",
                    width: "100%"
                  }}>
                    <Sparkles size={16} style={{ color: "var(--color-blue)" }} />
                    <span>Partner left. Re-scanning for next peer...</span>
                  </div>
                )}

                <FilterScreen
                  institutionName={institutionName}
                  category={category}
                  presence={presence}
                  onStartSearch={handleStartSearch}
                  onLogout={handleLogout}
                />
              </div>
            )}

            {currentScreen === "SEARCHING" && (
              <SearchingScreen
                queuePosition={queuePosition}
                isWidened={isWidened}
                presence={presence}
                filterPreference={lastFilterPref}
                onCancel={handleCancelSearch}
              />
            )}

            {currentScreen === "CALL" && (
              <CallScreen
                localStream={localStream}
                remoteStream={remoteStream}
                connectionState={connectionState}
                matchData={matchData!}
                onNext={handleNextCall}
                onEnd={handleEndCall}
              />
            )}
          </>
        )}
      </main>

      {/* 5-Column Mockup Features Footer (Auth & Filter screens only) */}
      {(currentScreen === "LOGIN" || currentScreen === "OTP" || currentScreen === "FILTER") && (
        <footer className="marketing-row-footer">
          {/* Column 1: Secure & Private */}
          <div className="m-footer-col">
            <div className="m-footer-icon-box">
              <Lock size={16} />
            </div>
            <span className="m-footer-title">Secure & Private</span>
            <span className="m-footer-desc">
              Email verification for trusted community. Guests stay hidden by default.
            </span>
          </div>

          {/* Column 2: Safe & Reliable */}
          <div className="m-footer-col">
            <div className="m-footer-icon-box">
              <ShieldCheck size={16} />
            </div>
            <span className="m-footer-title">Safe & Reliable</span>
            <span className="m-footer-desc">
              OTP verification prevents account misuse. Rate limits protect against abuse.
            </span>
          </div>

          {/* Column 3: Customizable Matches */}
          <div className="m-footer-col">
            <div className="m-footer-icon-box">
              <Sliders size={16} />
            </div>
            <span className="m-footer-title">Customizable Matches</span>
            <span className="m-footer-desc">
              Choose who you want to meet. Explicit control over guest visibility.
            </span>
          </div>

          {/* Column 4: Smart Matching */}
          <div className="m-footer-col">
            <div className="m-footer-icon-box">
              <Target size={16} />
            </div>
            <span className="m-footer-title">Smart Matching</span>
            <span className="m-footer-desc">
              Real-time queue diagnostics. Auto-widens targets to reduce waiting.
            </span>
          </div>

          {/* Column 5: High Quality Calls */}
          <div className="m-footer-col">
            <div className="m-footer-icon-box">
              <VideoIcon size={16} />
            </div>
            <span className="m-footer-title">High Quality Calls</span>
            <span className="m-footer-desc">
              HD video & clean WebRTC audio. Intuitive call controls bar.
            </span>
          </div>
        </footer>
      )}

      {/* Floating Network Telemetry Status */}
      {currentScreen !== "CALL" && (
        <div style={{
          position: "fixed",
          bottom: "16px",
          right: "20px",
          fontSize: "0.675rem",
          color: "var(--text-dark-muted)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(10, 14, 26, 0.8)",
          padding: "4px 8px",
          borderRadius: "4px",
          border: "1px solid rgba(255,255,255,0.03)",
          zIndex: 50
        }}>
          <span style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            backgroundColor: isConnected ? "var(--color-green)" : "var(--color-red)"
          }}></span>
          <span>{isConnected ? "con: online" : "con: offline"}</span>
        </div>
      )}
    </div>
  );
}
export default App;
