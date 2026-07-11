<div align="center">
    
# GradRoulette


### Verified 1:1 Video Networking for Students & Professionals

Connect anonymously with verified students and professionals through
secure peer-to-peer video calls powered by **WebRTC**.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)]()
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)]()
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?logo=socketdotio)]()
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-success)]()

🌐 **Frontend:** https://gradroulette.vercel.app/

⚙️ **Backend:** https://gradroulette.onrender.com/


------------------------------------------------------------------------

## Overview

GradRoulette is an Omegle-inspired networking platform designed for
**verified college students and professionals**.

Instead of exposing personal information, users authenticate using
institutional email addresses (or continue as guests), are matched in
real time, and communicate through encrypted peer-to-peer WebRTC video
calls.

------------------------------------------------------------------------

# Features

-   Secure Email OTP Authentication
-   Google Sign-In
-   Guest Mode
-   Anonymous Identity
-   Real-time Matchmaking
-   WebRTC Peer-to-Peer Video
-   STUN/TURN Fallback
-   JWT Authentication
-   Socket.IO Signaling
-   Live Queue Presence

------------------------------------------------------------------------

# Architecture

``` mermaid
flowchart LR

A["🌐 React Frontend"]

B["🔐 Authentication API"]

C["⚡ Socket.IO Signaling"]

D["🎯 Matchmaker"]

E["🌍 TURN Credential Service"]

F["📹 WebRTC"]

A --> B
A --> C
C --> D
A --> E
E --> F
F <-->|Media| F
```

------------------------------------------------------------------------

# Authentication Flow

``` mermaid
flowchart LR

Email --> OTP
OTP --> JWT
JWT --> Socket
Socket --> Queue
Queue --> Match
Match --> Call
```

------------------------------------------------------------------------

## WebRTC Connection Lifecycle

```mermaid
sequenceDiagram
    participant Caller
    participant Backend
    participant Signaling
    participant Callee

    Caller->>Backend: GET /webrtc/turn-credential
    Backend-->>Caller: ICE Servers

    Caller->>Signaling: Offer (SDP)
    Signaling->>Callee: Forward Offer

    Callee->>Signaling: Answer (SDP)
    Signaling->>Caller: Forward Answer

    loop ICE Exchange
        Caller->>Signaling: ICE Candidate
        Signaling->>Callee: Relay Candidate
        Callee->>Signaling: ICE Candidate
        Signaling->>Caller: Relay Candidate
    end

    Note over Caller,Callee: Peer-to-peer WebRTC media established
```


------------------------------------------------------------------------

# Application State

``` mermaid
stateDiagram-v2

[*] --> Login

Login --> Idle

Idle --> Searching

Searching --> Connected

Connected --> Searching : Next

Connected --> Idle : End

Searching --> Idle : Cancel
```

------------------------------------------------------------------------

# Repository

``` text
backend/
 ├── auth/
 ├── signaling/
 ├── webrtc/
 ├── config/
 └── utils/

frontend/
 ├── screens/
 ├── hooks/
 ├── services/
 └── components/
```

------------------------------------------------------------------------
---

# 🛠 Tech Stack

| Category | Technologies |
|:----------|:-------------|
| **Frontend** | React • Vite • TypeScript |
| **Backend** | Node.js • Express |
| **Real-Time Communication** | Socket.IO |
| **Media** | WebRTC |
| **Authentication** | JWT • Google OAuth • Resend OTP |
| **NAT Traversal** | Metered TURN • Google STUN |
| **Deployment** | Vercel • Render |

---

# 🏛 Architecture

GradRoulette is composed of four primary subsystems that work together to provide secure, anonymous real-time video communication.

| Component | Responsibility |
|:----------|:---------------|
| **Authentication** | Email OTP, Google OAuth, guest sessions, JWT generation, institution verification |
| **Matchmaking** | Queue management, compatibility filtering, guest opt-in logic, live presence |
| **Signaling Server** | Socket.IO signaling, SDP & ICE relay, room lifecycle management |
| **WebRTC Engine** | Peer-to-peer media, TURN fallback, secure ICE credential retrieval |

---

# 📡 REST API

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/auth/request-otp` | Request an email verification code |
| `POST` | `/auth/verify-otp` | Verify OTP and obtain a JWT |
| `POST` | `/auth/google-login` | Authenticate using Google |
| `POST` | `/auth/guest-session` | Start an anonymous guest session |
| `GET` | `/webrtc/turn-credential` | Retrieve temporary TURN credentials |
| `GET` | `/health` | Backend health check |

---

# 🚀 Running Locally

### Clone the repository

```bash
git clone https://github.com/<your-username>/GradRoulette.git
cd GradRoulette
```

### Backend

```bash
cd backend
npm install
npm run dev
```

Runs on **http://localhost:4000**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:5173**

---

# 🌍 Deployment

| Component | URL |
|:----------|:----|
| **Frontend** | https://gradroulette.vercel.app |
| **Backend API** | https://gradroulette.onrender.com |
| **Health Check** | https://gradroulette.onrender.com/health |

---

# 📸 Screenshots

| Login | Matchmaking |
|:------:|:-----------:|
| *Coming Soon* | *Coming Soon* |

| Video Call | Mobile |
|:----------:|:------:|
| *Coming Soon* | *Coming Soon* |

---

# 📄 License

Licensed under the **MIT License**.
