import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as dotenv from "dotenv";
import authRoutes from "./auth/routes.js";
import turnRoutes from "./webrtc/turnCredentialRoute.js";
import { socketAuthMiddleware } from "./signaling/socketMiddleware.js";
import { registerSocketHandlers } from "./signaling/eventHandlers.js";
import { runMatchmaker } from "./signaling/matchmaker.js";
import { waitingQueue, activeUsers } from "./signaling/state.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for API requests
const corsOptions = {
  origin: "*", // For MVP development. Can be locked down to Vercel/Netlify frontend domain in production
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: Date.now() });
});

// REST Routes
app.use("/auth", authRoutes);
app.use(turnRoutes);

// HTTP Server
const httpServer = createServer(app);

// WebSocket Server
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for WebSocket connections in dev
    methods: ["GET", "POST"],
  },
});

// Auth Middleware for Socket.io
io.use(socketAuthMiddleware);

// Handle Connection Lifecycle
io.on("connection", (socket) => {
  console.log(`[CONNECT] Socket connected: ${socket.id}`);
  registerSocketHandlers(io, socket);
});

// Matchmaker Loop: run every 1 second
setInterval(() => {
  try {
    runMatchmaker(io);
  } catch (error) {
    console.error("[ERROR] Matchmaker loop crashed:", error);
  }
}, 1000);

// Presence Broadcast: run every 3 seconds
setInterval(() => {
  try {
    let anyone = 0;
    let students_only = 0;
    let professionals_only = 0;

    for (const user of waitingQueue) {
      if (user.filterPreference === "anyone") {
        anyone++;
      } else if (user.filterPreference === "students_only") {
        students_only++;
      } else if (user.filterPreference === "professionals_only") {
        professionals_only++;
      }
    }

    io.emit("presence_update", {
      anyone,
      students_only,
      professionals_only,
      totalOnline: activeUsers.size,
    });
  } catch (error) {
    console.error("[ERROR] Presence broadcast crashed:", error);
  }
}, 3000);

// Start Server
httpServer.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`GradRoulette Signaling Server running on port ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`==================================================`);
});

// Force restart trigger comment: loaded Google Client ID env key
