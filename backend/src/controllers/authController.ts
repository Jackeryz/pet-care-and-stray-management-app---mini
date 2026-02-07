// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";

function getSecretKey(): string {
  const key = process.env.JWT_SECRET;
  if (!key) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return key;
}

// Register User
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, latitude, longitude } = req.body;

    // Validate input
    if (!email || !password || !name) {
      res.status(400).json({ error: "Missing required fields: email, password, name" });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in DB
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "PUBLIC_USER", // Default role if none provided
      },
    });

      // If latitude/longitude provided (for NGOs), store them directly in SQLite
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        try {
          await prisma.$executeRawUnsafe('UPDATE "User" SET latitude = ?, longitude = ? WHERE id = ?', latitude, longitude, user.id);
        } catch (e) {
          // non-fatal: ignore if columns not present
        }
      }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      getSecretKey(),
    );

    // Return success (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      message: "User created successfully",
      token,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error";
    res.status(500).json({ error: "Internal server error during registration" });
  }
};

// Login User
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      getSecretKey(),
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    // The user ID comes from the 'authenticate' middleware
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        // Exclude password!
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};
