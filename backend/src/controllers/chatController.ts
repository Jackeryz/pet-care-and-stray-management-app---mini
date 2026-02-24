import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";
import {
  insertChatMessage,
  getChatMessages,
  markChatMessagesAsRead,
  getUnreadChatCount,
} from "../database/sqliteSetup";

// Send a message in adoption chat
export const sendMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { adoptionRecordId } = req.params;
    const { message } = req.body;
    const userId = req.user!.id;

    if (!message || message.trim().length === 0) {
      res.status(400).json({ error: "Message cannot be empty" });
      return;
    }

    // Verify adoption record exists and user is part of it
    const adoption = await prisma.adoptionRecord.findUnique({
      where: { id: Number(adoptionRecordId) },
      include: { pet: { include: { owner: true } }, applicant: true },
    });

    if (!adoption) {
      res.status(404).json({ error: "Adoption record not found" });
      return;
    }

    // Check if user is either the pet owner or the applicant
    const isOwner = adoption.pet.ownerId === userId;
    const isApplicant = adoption.applicantId === userId;

    if (!isOwner && !isApplicant) {
      res.status(403).json({ error: "You are not authorized to chat in this adoption" });
      return;
    }

    // Only allow chat if adoption is approved
    if (adoption.status !== "APPROVED") {
      res.status(400).json({ error: "Chat is only available for approved adoptions" });
      return;
    }

    // Insert message into chat_messages table
    const messageId = insertChatMessage(Number(adoptionRecordId), userId, message);

    res.status(201).json({
      id: messageId,
      adoptionRecordId: Number(adoptionRecordId),
      senderId: userId,
      message,
      createdAt: new Date(),
      isRead: 0,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// Get all messages for an adoption
export const getMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { adoptionRecordId } = req.params;
    const userId = req.user!.id;

    // Verify adoption record exists and user is part of it
    const adoption = await prisma.adoptionRecord.findUnique({
      where: { id: Number(adoptionRecordId) },
      include: { pet: true, applicant: true },
    });

    if (!adoption) {
      res.status(404).json({ error: "Adoption record not found" });
      return;
    }

    const isOwner = adoption.pet.ownerId === userId;
    const isApplicant = adoption.applicantId === userId;

    if (!isOwner && !isApplicant) {
      res.status(403).json({ error: "You are not authorized to view this chat" });
      return;
    }

    // Mark messages as read for the current user
    markChatMessagesAsRead(Number(adoptionRecordId), userId);

    // Get messages
    const messages = getChatMessages(Number(adoptionRecordId));

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Get unread message count for user's adoptions
export const getUnreadCount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get all adoptions for this user (as applicant or pet owner)
    const adoptions = await prisma.adoptionRecord.findMany({
      where: {
        OR: [{ applicantId: userId }, { pet: { ownerId: userId } }],
      },
    });

    let totalUnread = 0;
    const adoptionUnreadCounts: Record<number, number> = {};

    for (const adoption of adoptions) {
      if (adoption.status === "APPROVED") {
        const count = getUnreadChatCount(adoption.id, userId);
        adoptionUnreadCounts[adoption.id] = count;
        totalUnread += count;
      }
    }

    res.json({
      totalUnread,
      adoptionUnreadCounts,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
};
