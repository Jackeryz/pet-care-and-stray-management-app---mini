import express from "express";
import { authenticate } from "../middlewares/auth";
import { createPost, getAllPosts, getMyPosts } from "../controllers/blogController";

const router = express.Router();

// Create a new blog post
router.post("/", authenticate, createPost);

// Get all blog posts (public)
router.get("/", getAllPosts);

// Get user's own blog posts
router.get("/my-posts", authenticate, getMyPosts);

export default router;
