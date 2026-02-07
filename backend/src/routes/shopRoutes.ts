// src/routes/shopRoutes.ts
import express from "express";
import {
  listProducts,
  addProduct,
  createOrder,
  listOrders,
  updateOrderStatus,
  updateProduct,
} from "../controllers/shopController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// Public / User Routes
router.get("/products", authenticate, listProducts);
router.post("/orders", authenticate, createOrder);
router.get("/orders", authenticate, listOrders);

// Admin Routes
router.post("/products", authenticate, addProduct); // Controller checks for ADMIN role
router.put("/products/:id", authenticate, updateProduct);
router.patch("/orders/:id/status", authenticate, updateOrderStatus);

export default router;
