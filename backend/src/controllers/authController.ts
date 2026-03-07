import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";
import { generateUniqueUsername } from "../database/sqliteSetup";
import { getJwtSecret } from "../utils/jwtSecret";

// Register User
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, latitude, longitude, username: requestedUsername } = req.body;

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

    // Validate and use provided username, or generate one
    let username = requestedUsername;
    if (username) {
      // Validate username format (alphanumeric, underscore, dash, 3-20 chars)
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
        res.status(400).json({ error: "Username must be 3-20 characters (alphanumeric, dash, underscore only)" });
        return;
      }
      // Check if username is already taken
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        res.status(400).json({ error: "Username is already taken" });
        return;
      }
    } else {
      // Generate unique username if not provided
      username = generateUniqueUsername();
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
        username,
        lastUsernameChange: new Date(),
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
      getJwtSecret(),
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
      getJwtSecret(),
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
        username: true,
        lastUsernameChange: true,
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

// Update username with 7-day cooldown
export const updateUsername = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { username: newUsername } = req.body;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    if (!newUsername || typeof newUsername !== 'string') {
      res.status(400).json({ error: "Username is required" });
      return;
    }

    // Validate username format (alphanumeric, underscore, dash, 3-20 chars)
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(newUsername)) {
      res.status(400).json({ error: "Username must be 3-20 characters (alphanumeric, dash, underscore only)" });
      return;
    }

    // Get current user with lastUsernameChange
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        lastUsernameChange: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if username is the same as current
    if (user.username === newUsername) {
      res.status(400).json({ error: "New username must be different from current username" });
      return;
    }

    // Check cooldown (7 days = 604800000 milliseconds)
    const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
    if (user.lastUsernameChange) {
      const timeSinceChange = Date.now() - new Date(user.lastUsernameChange).getTime();
      if (timeSinceChange < COOLDOWN_MS) {
        const daysRemaining = Math.ceil((COOLDOWN_MS - timeSinceChange) / (24 * 60 * 60 * 1000));
        res.status(429).json({ 
          error: `Username can only be changed once every 7 days. You can change it again in ${daysRemaining} days.`,
          daysRemaining
        });
        return;
      }
    }

    // Check if new username is already taken
    const existingUsername = await prisma.user.findUnique({
      where: { username: newUsername },
    });

    if (existingUsername) {
      res.status(400).json({ error: "Username is already taken" });
      return;
    }

    // Update username
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: newUsername,
        lastUsernameChange: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        username: true,
      },
    });

    res.json({
      message: "Username updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json({ error: "Failed to update username" });
  }
};

// Update location (for VETs and NGOs) with 7-day cooldown
export const updateLocation = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { latitude, longitude } = req.body;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Only VETs and NGOs can update location
    if (userRole !== "VET" && userRole !== "NGO") {
      res.status(403).json({ error: "Only vets and NGOs can update their location" });
      return;
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ error: "Latitude and longitude must be valid numbers" });
      return;
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({ error: "Invalid coordinates" });
      return;
    }

    // Get current user with lastLocationChange
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
        lastLocationChange: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if location is the same
    if (user.latitude === latitude && user.longitude === longitude) {
      res.status(400).json({ error: "New location must be different from current location" });
      return;
    }

    // Check cooldown (7 days = 604800000 milliseconds)
    const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
    if (user.lastLocationChange) {
      const timeSinceChange = Date.now() - new Date(user.lastLocationChange).getTime();
      if (timeSinceChange < COOLDOWN_MS) {
        const daysRemaining = Math.ceil((COOLDOWN_MS - timeSinceChange) / (24 * 60 * 60 * 1000));
        res.status(429).json({ 
          error: `Location can only be changed once every 7 days. You can change it again in ${daysRemaining} days.`,
          daysRemaining
        });
        return;
      }
    }

    // Update location
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        latitude,
        longitude,
        lastLocationChange: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        latitude: true,
        longitude: true,
        lastLocationChange: true,
      },
    });

    res.json({
      message: "Location updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
};

// Delete Account (irreversible)
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Delete all user data in cascade order (respecting foreign keys)
    // 1. Delete adoption records (references pets)
    await prisma.adoptionRecord.deleteMany({
      where: {
        OR: [
          { applicantId: userId }, // User's adoption requests
          { pet: { ownerId: userId } }, // Requests for user's pets
        ],
      },
    });

    // 2. Delete medical records and scheduled vaccinations (references pets)
    await prisma.medicalRecord.deleteMany({
      where: { pet: { ownerId: userId } },
    });

    await prisma.scheduledVaccination.deleteMany({
      where: { pet: { ownerId: userId } },
    });

    // 3. Delete pets (owned by user)
    await prisma.pet.deleteMany({
      where: { ownerId: userId },
    });

    // 4. Delete stray reports
    await prisma.strayReport.deleteMany({
      where: { reporterId: userId },
    });

    // 5. Delete orders
    await prisma.order.deleteMany({
      where: { userId },
    });

    // 6. Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).json({
      message: "Account deleted successfully. All associated data has been removed.",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
};
