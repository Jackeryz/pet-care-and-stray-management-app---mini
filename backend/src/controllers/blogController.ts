import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";
import {
  generateUniqueUsername,
  createBlogPost,
  getBlogPosts,
  getUserBlogPosts,
} from "../database/sqliteSetup";

// Create a new blog post
export const createPost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { content } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: "Content cannot be empty" });
      return;
    }

    if (content.length > 5000) {
      res.status(400).json({ error: "Content must be under 5000 characters" });
      return;
    }

    // Get or generate username for user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if user already has a username
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    let username =
      (existingUser as any)?.username || generateUniqueUsername();

    // If no username exists, update user with generated one
    if (!(existingUser as any)?.username) {
      await prisma.$executeRaw`UPDATE "User" SET username = ${username} WHERE id = ${userId}`;
    }

    // Create blog post
    const postId = createBlogPost(userId, username, role, content);

    res.status(201).json({
      id: postId,
      userId,
      username,
      role,
      content,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error creating blog post:", error);
    res.status(500).json({ error: "Failed to create blog post" });
  }
};

// Get all blog posts (paginated)
export const getAllPosts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const posts = getBlogPosts(limit + 1, offset); // Get one extra to check if there are more

    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit);

    res.json({
      posts: data,
      hasMore,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
};

// Get user's own blog posts
export const getMyPosts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const posts = getUserBlogPosts(userId);
    res.json(posts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
};
