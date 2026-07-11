import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { verifyOtp } from "../services/api.js";

interface OtpScreenProps {
  email: string;
  onLoginSuccess: (token: string, institutionName: string, category: string) => void;
  onBack: () => void;
}

export function OtpScreen({ email, onLoginSuccess, onBack }: OtpScreenProps) {
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time Mock
  const [expirySec, setExpirySec] = useState(300);
  const [resendSec, setResendSec] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setExpirySec((prev) => (prev > 0 ? prev - 1 : 0));
      setResendSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatExpiry = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleInputChange = (value: string, index: number) => {
    const cleanedVal = value.replace(/\D/g, "");
    if (!cleanedVal) return;

    const newValues = [...otpValues];
    const char = cleanedVal.slice(-1);
    newValues[index] = char;
    setOtpValues(newValues);

    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newValues = [...otpValues];
      if (!newValues[index] && index > 0) {
        newValues[index - 1] = "";
        setOtpValues(newValues);
        inputRefs.current[index - 1]?.focus();
      } else {
        newValues[index] = "";
        setOtpValues(newValues);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const newValues = [...otpValues];
    for (let i = 0; i < pasteData.length; i++) {
      newValues[i] = pasteData[i] || "";
    }
    setOtpValues(newValues);

    const focusIndex = Math.min(pasteData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpValues.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the full 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await verifyOtp(email, otpCode);
      if (response.success && response.token && response.institutionName && response.category) {
        onLoginSuccess(
          response.token,
          response.institutionName,
          response.category
        );
      } else {
        if (response.error === "INVALID_OTP") {
          setError("Invalid verification code. Please check and try again.");
        } else if (response.error === "EXPIRED_OTP") {
          setError("This verification code has expired. Please go back and request a new one.");
        } else if (response.error === "TOO_MANY_ATTEMPTS") {
          setError("Too many failed attempts. This code has been invalidated. Please request a new one.");
        } else {
          setError(response.error || "Verification failed. Please try again.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const combinedOtp = otpValues.join("");

  return (
    <div style={{ width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "20px", position: "relative" }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          top: "-36px",
          left: "0",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-light-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.85rem",
          fontWeight: "500"
        }}
        title="Back"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Verification Shield Header */}
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "48px",
          height: "48px",
          background: "var(--color-blue)",
          borderRadius: "50%",
          color: "#ffffff",
          marginBottom: "16px",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 11 2 2 4-4" />
          </svg>
        </div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-light-primary)", fontFamily: "var(--font-family-heading)", marginBottom: "4px" }}>
          Verify Your Email
        </h2>
        <p style={{ fontSize: "0.825rem", color: "var(--text-light-secondary)", lineHeight: "1.4" }}>
          Enter the 6-digit code sent to<br />
          <strong style={{ color: "var(--text-light-primary)" }}>{email}</strong>
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
          lineHeight: "1.4"
        }}>
          {error}
        </div>
      )}

      {/* Grid Inputs Form */}
      <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="otp-digit-grid">
          {otpValues.map((val, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={1}
              className="otp-digit-box"
              value={val}
              onChange={(e) => handleInputChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onPaste={idx === 0 ? handlePaste : undefined}
              disabled={isLoading}
              autoFocus={idx === 0}
            />
          ))}
        </div>

        {/* Expiry Clock */}
        <div style={{
          textAlign: "center",
          fontSize: "0.775rem",
          color: "var(--text-light-secondary)",
          marginBottom: "8px"
        }}>
          Code expires in <span style={{ color: expirySec > 60 ? "var(--color-blue-text)" : "var(--color-red)", fontWeight: "600" }}>{formatExpiry(expirySec)}</span>
        </div>

        <button type="submit" className="btn-solid-blue" style={{ height: "46px" }} disabled={isLoading || combinedOtp.length !== 6}>
          {isLoading ? "Verifying..." : "Verify Code"}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="btn-outline-gray"
          disabled={isLoading}
          style={{ height: "46px" }}
        >
          Cancel Entry
        </button>
      </form>

      {/* Resend Action */}
      <div style={{
        marginTop: "16px",
        textAlign: "center",
        fontSize: "0.775rem",
        color: "var(--text-light-secondary)"
      }}>
        Didn't receive the code?{" "}
        {resendSec > 0 ? (
          <span style={{ color: "var(--text-light-muted)" }}>Resend ({resendSec}s)</span>
        ) : (
          <span
            onClick={onBack}
            style={{ color: "var(--color-blue-text)", fontWeight: "600", cursor: "pointer", textDecoration: "underline" }}
          >
            Resend Code
          </span>
        )}
      </div>
    </div>
  );
}
export default OtpScreen;
