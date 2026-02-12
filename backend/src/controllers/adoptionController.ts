import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";

// Create a new adoption request for a pet
export const createAdoptionRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { petId } = req.body;
    const userId = req.user!.id;

    const numericPetId = Number(petId);
    if (!numericPetId || Number.isNaN(numericPetId)) {
      res.status(400).json({ error: "Invalid petId" });
      return;
    }

    const pet = await prisma.pet.findUnique({
      where: { id: numericPetId },
    });

    if (!pet) {
      res.status(404).json({ error: "Pet not found" });
      return;
    }

    const existing = await prisma.adoptionRecord.findUnique({
      where: { petId: numericPetId },
    });

    if (existing) {
      res.status(400).json({ error: "This pet already has an adoption request" });
      return;
    }

    const record = await prisma.adoptionRecord.create({
      data: {
        petId: numericPetId,
        applicantId: userId,
        status: "PENDING",
      },
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: "Failed to create adoption request" });
  }
};

// List adoption requests for the current user
export const listMyAdoptions = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const records = await prisma.adoptionRecord.findMany({
      where: {
        OR: [
          { applicantId: userId }, // Adoptions I've applied for
          { pet: { ownerId: userId } }, // Adoptions for my pets
        ],
      },
      include: {
        pet: { include: { owner: true } },
        applicant: true,
      },
      orderBy: { id: "desc" },
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch adoption records" });
  }
};

// List all adoption requests (Admin only)
export const listAllAdoptions = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const records = await prisma.adoptionRecord.findMany({
      orderBy: { id: "desc" },
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch adoption records" });
  }
};

// Update adoption status (Admin or NGO)
export const updateAdoptionStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const role = req.user!.role;

    if (!["ADMIN", "NGO"].includes(role)) {
      res.status(403).json({ error: "Only admins or NGOs can update adoption status" });
      return;
    }

    const validStatuses = ["PENDING", "APPROVED", "REJECTED"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }

    const record = await prisma.adoptionRecord.update({
      where: { id: Number(id) },
      data: { status },
    });

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: "Failed to update adoption status" });
  }
};

