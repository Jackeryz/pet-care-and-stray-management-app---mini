import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/authRoutes";
import petRoutes from "./routes/petRoutes";
import strayRoutes from "./routes/strayRoutes";
import shopRoutes from "./routes/shopRoutes";
import adoptionRoutes from "./routes/adoptionRoutes";
import dotenv from "dotenv";
import { ensureSqliteSchema } from './database/sqliteSetup';
import notificationRoutes from './routes/notificationRoutes';

dotenv.config();

// Ensure SQLite schema additions (columns, notifications table)
ensureSqliteSchema();

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
