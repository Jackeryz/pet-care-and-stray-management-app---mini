import express from "express";
import { authenticate } from "../middlewares/auth";
import {
  sendMessage,
  getMessages,
  getUnreadCount,
} from "../controllers/chatController";

const router = express.Router();

// Send a message in adoption chat
router.post("/:adoptionRecordId/send", authenticate, sendMessage);

// Get all messages for an adoption
router.get("/:adoptionRecordId", authenticate, getMessages);

// Get unread message count
router.get("/count/unread", authenticate, getUnreadCount);

export default router;
