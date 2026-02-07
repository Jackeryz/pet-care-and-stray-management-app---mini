// src/routes/authRoutes.ts
import express from "express";
import { register, login, getProfile } from "../controllers/authController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

//[PROTECTED ROUTE]
// GET /api/auth/me
router.get("/me", authenticate, getProfile);

export default router;
