import express from "express";
import cors from "cors";
import path from "path";
import os from "os";
import { createServer } from "https";
import fs from "fs";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes";
import petRoutes from "./routes/petRoutes";
import strayRoutes from "./routes/strayRoutes";
import shopRoutes from "./routes/shopRoutes";
import adoptionRoutes from "./routes/adoptionRoutes";
import dotenv from "dotenv";
import { ensureSqliteSchema } from './database/sqliteSetup';
import notificationRoutes from './routes/notificationRoutes';
import chatRoutes from './routes/chatRoutes';
import blogRoutes from './routes/blogRoutes';
import vaccinationRoutes from './routes/vaccinationRoutes';
import { insertChatMessage, getChatMessages, markChatMessagesAsRead } from './database/sqliteSetup';
import { prisma } from './database/db';

dotenv.config();

// Ensure SQLite schema additions (columns, notifications table)
ensureSqliteSchema();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors({
  origin: (origin, callback) => {
    // Allow HTTPS frontend and localhost
    if (!origin || origin.startsWith('https://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Pet Care and Stray Management API" });
});
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/strays", strayRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/adoptions", adoptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/vaccinations', vaccinationRoutes);

// Create HTTPS server with Socket.io
const certPath = path.join(__dirname, '../cert/localhost+1.pem');
const keyPath = path.join(__dirname, '../cert/localhost+1-key.pem');
const server = createServer({
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
}, app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Export getIO function for use in controllers
export const getIO = () => io;

// Store active socket connections per adoption chat (adoptionId -> Set<socketIds>)
const adoptionChatConnections = new Map<number, Set<string>>();

// Socket.io event handlers
io.on("connection", (socket) => {
  console.log("User connected via Socket.io:", socket.id);

  // User joins their personal notification room
  socket.on("join-user-room", (userId: string) => {
    socket.join(`user-${userId}`);
    console.log(`✓ User ${userId} joined notification room: user-${userId}`);
    console.log(`  Total sockets in room:`, io.sockets.adapter.rooms.get(`user-${userId}`)?.size || 0);
  });

  // Join adoption chat room
  socket.on("join-adoption-chat", (adoptionRecordId: number, userId: string) => {
    const roomName = `adoption-${adoptionRecordId}`;
    socket.join(roomName);

    if (!adoptionChatConnections.has(adoptionRecordId)) {
      adoptionChatConnections.set(adoptionRecordId, new Set());
    }
    adoptionChatConnections.get(adoptionRecordId)!.add(socket.id);

    console.log(`User ${userId} joined adoption chat ${adoptionRecordId}`);
    
    // Notify others that user joined
    socket.to(roomName).emit("user-joined", { userId });
  });

  // Handle incoming chat message
  socket.on(
    "send-message",
    async (data: { adoptionRecordId: number; senderId: string; message: string }) => {
      try {
        const { adoptionRecordId, senderId, message } = data;

        // Verify adoption exists and user is authorized
        const adoption = await prisma.adoptionRecord.findUnique({
          where: { id: adoptionRecordId },
          include: { pet: true, applicant: true },
        });

        if (!adoption) {
          socket.emit("error", { message: "Adoption record not found" });
          return;
        }

        const isOwner = adoption.pet.ownerId === senderId;
        const isApplicant = adoption.applicantId === senderId;

        if (!isOwner && !isApplicant) {
          socket.emit("error", { message: "Not authorized" });
          return;
        }

        // Allow chat for PENDING (discussing) and APPROVED (ongoing) adoptions
        if (!["PENDING", "APPROVED"].includes(adoption.status)) {
          socket.emit("error", { message: "Chat not available for this adoption status" });
          return;
        }

        // Insert message into database
        const messageId = insertChatMessage(adoptionRecordId, senderId, message);

        // Emit message to all users in the room
        const roomName = `adoption-${adoptionRecordId}`;
        io.to(roomName).emit("new-message", {
          id: messageId,
          adoptionRecordId,
          senderId,
          message,
          createdAt: new Date(),
          isRead: 0,
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    }
  );

  // Leave adoption chat room
  socket.on("leave-adoption-chat", (adoptionRecordId: number) => {
    const roomName = `adoption-${adoptionRecordId}`;
    socket.leave(roomName);

    const connections = adoptionChatConnections.get(adoptionRecordId);
    if (connections) {
      connections.delete(socket.id);
      if (connections.size === 0) {
        adoptionChatConnections.delete(adoptionRecordId);
      }
    }

    console.log(`User left adoption chat ${adoptionRecordId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const interfaces = os.networkInterfaces();
  let ipAddress = "localhost";
  // Get the local IP address
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (addrs) {
      for (const addr of addrs) {
        // Skip internal and non-IPv4 addresses
        if (addr.family === "IPv4" && !addr.internal) {
          ipAddress = addr.address;
          break;
        }
      }
      if (ipAddress !== "localhost") break;
    }
  }
  console.log(`Server running at https://localhost:${PORT}`);
  console.log(`Accessible from other devices at https://${ipAddress}:${PORT}`);
});
