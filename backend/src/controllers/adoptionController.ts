import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";
import { getIO } from "../index";

// === LISTING MANAGEMENT ===

// Owner lists a pet for adoption
export const listPetForAdoption = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { petId } = req.params;
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

    if (pet.ownerId !== userId) {
      res.status(403).json({ error: "Only the pet owner can list for adoption" });
      return;
    }

    if (pet.isListed) {
      res.status(400).json({ error: "This pet is already listed for adoption" });
      return;
    }

    const updatedPet = await prisma.pet.update({
      where: { id: numericPetId },
      data: { isListed: true },
    });

    res.json({ success: true, pet: updatedPet });
  } catch (error) {
    res.status(500).json({ error: "Failed to list pet for adoption" });
  }
};

// Owner delists a pet from adoption
export const delistPetFromAdoption = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { petId } = req.params;
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

    if (pet.ownerId !== userId) {
      res.status(403).json({ error: "Only the pet owner can delist" });
      return;
    }

    const updatedPet = await prisma.pet.update({
      where: { id: numericPetId },
      data: { isListed: false },
    });

    res.json({ success: true, pet: updatedPet });
  } catch (error) {
    res.status(500).json({ error: "Failed to delist pet from adoption" });
  }
};

// === ADOPTION LISTINGS VIEW ===

// Get all pets listed for adoption (excluding user's own pets)
export const getAvailablePetsForAdoption = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const availablePets = await prisma.pet.findMany({
      where: {
        isListed: true,
        ownerId: {
          not: userId, // Exclude user's own pets
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        medicalRecord: true,
      },
      orderBy: { id: "desc" },
    });

    res.json(availablePets);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch available pets" });
  }
};

// === ADOPTION REQUESTS ===

// Interested user expresses interest/requests adoption
export const requestAdoption = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { petId } = req.params;
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

    if (!pet.isListed) {
      res.status(400).json({ error: "This pet is not listed for adoption" });
      return;
    }

    if (pet.ownerId === userId) {
      res.status(400).json({ error: "You cannot request your own pet" });
      return;
    }

    // Check if user already requested this pet
    const existingRequest = await prisma.adoptionRecord.findFirst({
      where: {
        petId: numericPetId,
        applicantId: userId,
      },
    });

    if (existingRequest) {
      res.status(400).json({ error: "You have already requested this pet" });
      return;
    }

    const adoptionRecord = await prisma.adoptionRecord.create({
      data: {
        petId: numericPetId,
        applicantId: userId,
        status: "PENDING",
      },
    });

    res.status(201).json(adoptionRecord);
  } catch (error) {
    res.status(500).json({ error: "Failed to request adoption" });
  }
};

// === ADOPTION REQUEST MANAGEMENT ===

// Get adoption requests for the current user
// - If pet owner: shows requests for their pets (inbound)
// - If applicant: shows their requests (outbound)
export const listMyAdoptionRequests = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const records = await prisma.adoptionRecord.findMany({
      where: {
        OR: [
          { applicantId: userId }, // My requests
          { pet: { ownerId: userId } }, // Requests for my pets
        ],
      },
      include: {
        pet: {
          include: { owner: true },
        },
        applicant: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch adoption requests" });
  }
};

// Legacy endpoint - kept for backward compatibility
export const listMyAdoptions = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  // Delegate to new endpoint
  return listMyAdoptionRequests(req, res);
};

// Get all adoption requests (Admin only)
export const listAllAdoptionRequests = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const records = await prisma.adoptionRecord.findMany({
      include: {
        pet: {
          include: { owner: true },
        },
        applicant: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch adoption records" });
  }
};

// Legacy endpoint - kept for backward compatibility
export const listAllAdoptions = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  return listAllAdoptionRequests(req, res);
};

// Pet owner accepts an adoption request - creates chat
export const acceptAdoptionRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { requestId } = req.params;
    const userId = req.user!.id;

    const adoptionRecord = await prisma.adoptionRecord.findUnique({
      where: { id: Number(requestId) },
      include: { pet: true, applicant: true },
    });

    if (!adoptionRecord) {
      res.status(404).json({ error: "Adoption request not found" });
      return;
    }

    // Verify user is the pet owner
    if (adoptionRecord.pet.ownerId !== userId) {
      res.status(403).json({ error: "Only the pet owner can accept requests" });
      return;
    }

    if (adoptionRecord.status !== "PENDING") {
      res.status(400).json({ error: "This request has already been handled" });
      return;
    }

    // Update adoption record
    const updated = await prisma.adoptionRecord.update({
      where: { id: Number(requestId) },
      data: {
        status: "APPROVED",
        chatCreated: true,
      },
    });

    // Emit event to create/show chat
    const io = getIO();
    if (io) {
      io.emit("adoption-request-accepted", {
        adoptionRecordId: updated.id,
        petId: updated.petId,
        ownerId: userId,
        applicantId: updated.applicantId,
      });
    }

    res.json({ success: true, adoptionRecord: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to accept adoption request" });
  }
};

// Pet owner rejects an adoption request
export const rejectAdoptionRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { requestId } = req.params;
    const userId = req.user!.id;

    const adoptionRecord = await prisma.adoptionRecord.findUnique({
      where: { id: Number(requestId) },
      include: { pet: true },
    });

    if (!adoptionRecord) {
      res.status(404).json({ error: "Adoption request not found" });
      return;
    }

    // Verify user is the pet owner
    if (adoptionRecord.pet.ownerId !== userId) {
      res.status(403).json({ error: "Only the pet owner can reject requests" });
      return;
    }

    if (adoptionRecord.status !== "PENDING") {
      res.status(400).json({ error: "This request has already been handled" });
      return;
    }

    const updated = await prisma.adoptionRecord.update({
      where: { id: Number(requestId) },
      data: { status: "REJECTED" },
    });

    res.json({ success: true, adoptionRecord: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject adoption request" });
  }
};

// === LEGACY / COMPATIBILITY ===

// Update adoption status (for backward compatibility or admin operations)
export const updateAdoptionStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const role = req.user!.role;

    if (!["ADMIN", "NGO"].includes(role)) {
      res.status(403).json({
        error: "Only admins or NGOs can manually update adoption status",
      });
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

