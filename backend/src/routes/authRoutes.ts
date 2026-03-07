// src/routes/authRoutes.ts
import express from "express";
import { register, login, getProfile, updateUsername, updateLocation, deleteAccount } from "../controllers/authController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

//[PROTECTED ROUTE]
// GET /api/auth/me
router.get("/me", authenticate, getProfile);

// PATCH /api/auth/username
router.patch("/username", authenticate, updateUsername);

// PATCH /api/auth/location
router.patch("/location", authenticate, updateLocation);

// DELETE /api/auth/account
router.delete("/account", authenticate, deleteAccount);

export default router;
