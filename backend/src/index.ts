import express from "express";
import cors from "cors";
import path from "path";
import os from "os";
import authRoutes from "./routes/authRoutes";
import petRoutes from "./routes/petRoutes";
import strayRoutes from "./routes/strayRoutes";
import shopRoutes from "./routes/shopRoutes";
import adoptionRoutes from "./routes/adoptionRoutes";
import dotenv from "dotenv";
import { ensureSqliteSchema } from './database/sqliteSetup';
import notificationRoutes from './routes/notificationRoutes';
import chatRoutes from './routes/chatRoutes';

dotenv.config();

// Ensure SQLite schema additions (columns, notifications table)
ensureSqliteSchema();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors());
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

app.listen(PORT, "0.0.0.0", () => {
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
  
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Accessible from other devices at http://${ipAddress}:${PORT}`);
});
