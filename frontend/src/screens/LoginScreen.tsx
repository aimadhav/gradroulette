import React, { useState, useEffect } from "react";
import { Mail, Video, ShieldCheck, User } from "lucide-react";
import { requestOtp, guestSession, googleLogin } from "../services/api.js";

interface LoginScreenProps {
  onOtpRequested: (email: string) => void;
  onLoginSuccess: (token: string, institutionName: string, category: string) => void;
}

export function LoginScreen({ onOtpRequested, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await googleLogin(response.credential);
      if (res.success && res.token && res.institutionName && res.category) {
        onLoginSuccess(res.token, res.institutionName, res.category);
      } else {
        if (res.error === "UNSUPPORTED_DOMAIN") {
          setError("Supported domains only. Please login with a verified college or work Google Workspace account.");
        } else {
          setError(res.error || "Google sign-in failed. Please try again.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach server. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId && googleClientId !== "mock") {
      const checkAndInitGoogle = () => {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            context: "signin",
          });
          (window as any).google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            { theme: "outline", size: "large", width: 340 }
          );
        } else {
          setTimeout(checkAndInitGoogle, 100);
        }
      };
      checkAndInitGoogle();
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestOtp(email);
      if (response.success) {
        onOtpRequested(email);
      } else {
        if (response.error === "UNSUPPORTED_DOMAIN") {
          setError("Supported domains only. Blocked consumer domains (Gmail, Yahoo, etc.) are not allowed.");
        } else if (response.error === "RATE_LIMITED") {
          setError("Too many requests. Please wait a few minutes before trying again.");
        } else {
          setError(response.error || "Failed to send code. Please try again.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach server. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await guestSession();
      if (response.success && response.token && response.institutionName && response.category) {
        onLoginSuccess(response.token, response.institutionName, response.category);
      } else {
        setError(response.error || "Failed to start guest session.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach server. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Brand Header (Shows on mobile when branding-pane is hidden) */}
      <div className="mobile-only-header" style={{ textAlign: "center", marginBottom: "12px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "44px",
          height: "44px",
          background: "var(--color-blue)",
          borderRadius: "10px",
          color: "#ffffff",
          marginBottom: "8px"
        }}>
          <Video size={20} fill="#ffffff" />
        </div>
        <h1 style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--text-light-primary)", fontFamily: "var(--font-family-heading)" }}>
          GradRoulette
        </h1>
        <p style={{ fontSize: "0.75rem", color: "var(--text-light-secondary)" }}>
          Meet peers. Learn. Grow.
        </p>
      </div>

      {/* Welcome Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-light-primary)", fontFamily: "var(--font-family-heading)", marginBottom: "4px" }}>
          Welcome!
        </h2>
        <p style={{ fontSize: "0.825rem", color: "var(--text-light-secondary)", lineHeight: "1.4" }}>
          Enter your email to continue<br />or join as a guest.
        </p>
      </div>

      {error && (
        <div style={{
          padding: "10px 14px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#ef4444",
          fontSize: "0.775rem",
          lineHeight: "1.4",
          textAlign: "left"
        }}>
          {error}
        </div>
      )}

      {/* Email Login Form */}
      <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="form-group-light" style={{ marginBottom: 0 }}>
          <label className="form-label-light" htmlFor="email-input">Email address</label>
          <div style={{ position: "relative" }}>
            <Mail size={16} style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-light-muted)"
            }} />
            <input
              id="email-input"
              type="email"
              className="form-input-light"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              style={{ paddingLeft: "42px" }}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-solid-blue" style={{ height: "46px" }} disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Verification Code"}
        </button>
      </form>

      {/* Google Login Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", alignItems: "center", marginTop: "4px" }}>
        {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
          <div id="google-signin-btn" style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: "44px" }}></div>
        ) : (
          <div style={{
            fontSize: "0.725rem",
            color: "var(--text-light-secondary)",
            border: "1px dashed var(--input-border)",
            borderRadius: "10px",
            padding: "12px",
            textAlign: "center",
            width: "100%",
            background: "#f8fafc"
          }}>
            OAuth: Add <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code> to activate Google Sign-In.
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{
        display: "flex",
        alignItems: "center",
        color: "var(--text-light-muted)",
        fontSize: "0.725rem",
        margin: "8px 0"
      }}>
        <div style={{ flex: 1, height: "1px", background: "var(--border-light)" }}></div>
        <span style={{ padding: "0 10px" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "var(--border-light)" }}></div>
      </div>

      {/* Guest Mode */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <button
          type="button"
          onClick={handleGuestLogin}
          className="btn-outline-gray"
          disabled={isLoading}
          style={{ gap: "8px", height: "46px" }}
        >
          <User size={16} />
          Enter as Guest
        </button>

        {/* Guest Warning Box */}
        <div className="callout-blue">
          <ShieldCheck size={20} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: "1px" }} />
          <div style={{ fontSize: "0.75rem", color: "var(--text-light-secondary)", lineHeight: "1.4" }}>
            <strong style={{ color: "var(--text-light-primary)" }}>Guests are hidden by default.</strong>
            <br />
            Verified users can filter you out. Verify to appear in more matches.
          </div>
        </div>
      </div>

      {/* Terms disclaimer */}
      <div style={{
        textAlign: "center",
        fontSize: "0.7rem",
        color: "var(--text-light-muted)",
        lineHeight: "1.4"
      }}>
        By continuing, you agree to our<br />
        <span style={{ textDecoration: "underline", cursor: "pointer" }}>Terms & Privacy Policy</span>.
      </div>
    </div>
  );
}
export default LoginScreen;
