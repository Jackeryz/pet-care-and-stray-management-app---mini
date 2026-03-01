import express from "express";
import cors from "cors";
import path from "path";
import os from "os";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
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
import { insertChatMessage } from './database/sqliteSetup';
import { prisma } from './database/db';

dotenv.config();

// Ensure SQLite schema additions (columns, notifications table)
ensureSqliteSchema();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

function resolveHttpsMaterial() {
  const keyCandidates = [
    process.env.SSL_KEY_PATH,
    path.resolve(process.cwd(), 'certs/localhost-key.pem'),
<<<<<<< ours
    path.resolve(process.cwd(), 'localhost-key.pem'),
    path.resolve(process.cwd(), '.cert/localhost-key.pem'),
=======
    path.resolve(process.cwd(), 'certs/localhost+1-key.pem'),
    path.resolve(process.cwd(), 'cert/localhost-key.pem'),
    path.resolve(process.cwd(), 'cert/localhost+1-key.pem'),
    path.resolve(process.cwd(), 'localhost-key.pem'),
    path.resolve(process.cwd(), 'localhost+1-key.pem'),
    path.resolve(process.cwd(), '.cert/localhost-key.pem'),
    path.resolve(process.cwd(), '.cert/localhost+1-key.pem'),
>>>>>>> theirs
  ].filter(Boolean) as string[];

  const certCandidates = [
    process.env.SSL_CERT_PATH,
    path.resolve(process.cwd(), 'certs/localhost.pem'),
<<<<<<< ours
    path.resolve(process.cwd(), 'localhost.pem'),
    path.resolve(process.cwd(), '.cert/localhost.pem'),
=======
    path.resolve(process.cwd(), 'certs/localhost+1.pem'),
    path.resolve(process.cwd(), 'cert/localhost.pem'),
    path.resolve(process.cwd(), 'cert/localhost+1.pem'),
    path.resolve(process.cwd(), 'localhost.pem'),
    path.resolve(process.cwd(), 'localhost+1.pem'),
    path.resolve(process.cwd(), '.cert/localhost.pem'),
    path.resolve(process.cwd(), '.cert/localhost+1.pem'),
>>>>>>> theirs
  ].filter(Boolean) as string[];

  const keyPath = keyCandidates.find((candidate) => fs.existsSync(candidate));
  const certPath = certCandidates.find((candidate) => fs.existsSync(candidate));

  if (!keyPath || !certPath) return null;

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    keyPath,
    certPath,
  };
}

const httpsMaterial = resolveHttpsMaterial();
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours

// Determine whether to run HTTPS. Environment variable `USE_HTTPS` can be set
// to "false" to disable it even if certs are present; otherwise HTTPS is used
// automatically when certificate material is found. If the variable is
// explicitly true but no certs exist, throw so the developer knows.
const httpsForcedOff = process.env.USE_HTTPS === 'false';
const httpsForcedOn = process.env.USE_HTTPS === 'true';
const USE_HTTPS = httpsForcedOff ? false : httpsForcedOn || !!httpsMaterial;
if (httpsForcedOn && !httpsMaterial) {
  throw new Error(
    "USE_HTTPS=true but no certificate files were found. set SSL_KEY_PATH/SSL_CERT_PATH or place certs in certs/",
  );
}


=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
const httpsForcedOff = process.env.USE_HTTPS === 'false';
const httpsForcedOn = process.env.USE_HTTPS === 'true';
const USE_HTTPS = httpsForcedOff ? false : httpsForcedOn || !!httpsMaterial;

if (httpsForcedOn && !httpsMaterial) {
  throw new Error(
    "USE_HTTPS=true but no certificate files were found. Set SSL_KEY_PATH/SSL_CERT_PATH or place certs in certs/",
  );
}

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
app.use(cors({
  origin: true,
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

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
// Create HTTP or HTTPS server depending on configuration
const server = (() => {
  if (!USE_HTTPS) {
    return createServer(app);
  }
  // if we've got cert material from resolveHttpsMaterial, use it; otherwise
  // fall back to reading from SSL_KEY_PATH / SSL_CERT_PATH env vars.
  if (httpsMaterial) {
    return createHttpsServer({ key: httpsMaterial.key, cert: httpsMaterial.cert }, app);
  }
  if (!process.env.SSL_KEY_PATH || !process.env.SSL_CERT_PATH) {
    throw new Error("USE_HTTPS is true but SSL_KEY_PATH/SSL_CERT_PATH are not set");
  }
  return createHttpsServer(
    {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    },
    app,
  );
})();
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
// Create HTTP/HTTPS server with Socket.io
const server = USE_HTTPS && httpsMaterial
  ? createHttpsServer(
      {
        key: httpsMaterial.key,
        cert: httpsMaterial.cert,
      },
      app,
    )
  : createServer(app);

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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
  console.log("User connected:", socket.id);

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

        if (adoption.status !== "APPROVED") {
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
    },
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
  for (const addrs of Object.values(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      // Skip internal and non-IPv4 addresses
      if (addr.family === "IPv4" && !addr.internal) {
        ipAddress = addr.address;
        break;
      }
    }
    if (ipAddress !== "localhost") break;
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
  }

  const protocol = USE_HTTPS ? "https" : "http";
  console.log(`Server running at ${protocol}://localhost:${PORT}`);
  console.log(`Accessible from other devices at ${protocol}://${ipAddress}:${PORT}`);

  if (USE_HTTPS && httpsMaterial) {
    console.log(`HTTPS certificate key: ${httpsMaterial.keyPath}`);
    console.log(`HTTPS certificate cert: ${httpsMaterial.certPath}`);
  }

=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
  }

  const protocol = USE_HTTPS ? "https" : "http";
  console.log(`Server running at ${protocol}://localhost:${PORT}`);
  console.log(`Accessible from other devices at ${protocol}://${ipAddress}:${PORT}`);

  if (USE_HTTPS && httpsMaterial) {
    console.log(`HTTPS certificate key: ${httpsMaterial.keyPath}`);
    console.log(`HTTPS certificate cert: ${httpsMaterial.certPath}`);
  }
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
});
