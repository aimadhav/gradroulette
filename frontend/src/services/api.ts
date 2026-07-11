import {
  RequestOtpResponse,
  VerifyOtpResponse,
  GuestSessionResponse,
  TurnCredentialResponse,
} from "../types.js";

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_SIGNALING_SERVER_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:4000`;
};

const API_BASE_URL = getApiBaseUrl();

export async function requestOtp(email: string): Promise<RequestOtpResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function verifyOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  return res.json();
}

export async function googleLogin(idToken: string): Promise<VerifyOtpResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/google-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return res.json();
}

export async function guestSession(): Promise<GuestSessionResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/guest-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

export async function getTurnCredential(token: string): Promise<TurnCredentialResponse> {
  const res = await fetch(`${API_BASE_URL}/webrtc/turn-credential`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch TURN configurations: ${res.statusText}`);
  }
  return res.json();
}
