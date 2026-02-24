import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";

// Schedule a new vaccination for a pet
export const scheduleVaccination = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { petId, vaccineName, scheduledDate, notes } = req.body;

    if (!userId || !petId || !vaccineName || !scheduledDate) {
      res
        .status(400)
        .json({
          error: "Missing required fields: petId, vaccineName, scheduledDate",
        });
      return;
    }

    // Verify user owns the pet
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!pet || pet.ownerId !== userId) {
      res.status(403).json({ error: "You do not own this pet" });
      return;
    }

    // Ensure scheduledDate is in the future
    const futureDate = new Date(scheduledDate);
    if (futureDate <= new Date()) {
      res
        .status(400)
        .json({ error: "Scheduled date must be in the future" });
      return;
    }

    const vaccination = await prisma.scheduledVaccination.create({
      data: {
        petId,
        vaccineName,
        scheduledDate: futureDate,
        notes: notes || null,
        status: "PENDING",
      },
    });

    res.status(201).json(vaccination);
  } catch (error) {
    console.error("Error scheduling vaccination:", error);
    res.status(500).json({ error: "Failed to schedule vaccination" });
  }
};

// Get all vaccinations for a pet
export const getPetVaccinations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { petId } = req.params;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Verify user owns the pet
    const pet = await prisma.pet.findUnique({
      where: { id: Number(petId) },
    });

    if (!pet || pet.ownerId !== userId) {
      res.status(403).json({ error: "You do not own this pet" });
      return;
    }

    const vaccinations = await prisma.scheduledVaccination.findMany({
      where: { petId: Number(petId) },
      orderBy: { scheduledDate: "asc" },
    });

    res.json(vaccinations);
  } catch (error) {
    console.error("Error fetching vaccinations:", error);
    res.status(500).json({ error: "Failed to fetch vaccinations" });
  }
};

// Get upcoming vaccinations for all user's pets
export const getUpcomingVaccinations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Get all pets for this user
    const userPets = await prisma.pet.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true },
    });

    const petIds = userPets.map((p) => p.id);

    // Get upcoming vaccinations (next 30 days PENDING or already scheduled)
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const vaccinations = await prisma.scheduledVaccination.findMany({
      where: {
        petId: { in: petIds },
        status: "PENDING",
        scheduledDate: {
          gte: today,
          lte: nextMonth,
        },
      },
      include: {
        pet: { select: { id: true, name: true, breed: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });

    res.json(vaccinations);
  } catch (error) {
    console.error("Error fetching upcoming vaccinations:", error);
    res.status(500).json({ error: "Failed to fetch upcoming vaccinations" });
  }
};

// Update vaccination status
export const updateVaccinationStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { vaccinationId } = req.params;
    const { status } = req.body;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    if (!["PENDING", "COMPLETED", "SKIPPED"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    // Get vaccination and verify ownership through pet
    const vaccination = await prisma.scheduledVaccination.findUnique({
      where: { id: Number(vaccinationId) },
      include: { pet: true },
    });

    if (!vaccination) {
      res.status(404).json({ error: "Vaccination not found" });
      return;
    }

    if (vaccination.pet.ownerId !== userId) {
      res.status(403).json({ error: "You do not own this pet" });
      return;
    }

    const updated = await prisma.scheduledVaccination.update({
      where: { id: Number(vaccinationId) },
      data: { status },
    });

    // If marking as completed, add to medical records
    if (status === "COMPLETED") {
      const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { petId: vaccination.petId },
      });

      if (medicalRecord) {
        const existingVaccines = JSON.parse(medicalRecord.vaccinations || "[]");
        if (!existingVaccines.includes(vaccination.vaccineName)) {
          existingVaccines.push(vaccination.vaccineName);
          await prisma.medicalRecord.update({
            where: { petId: vaccination.petId },
            data: { vaccinations: JSON.stringify(existingVaccines) },
          });
        }
      }
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating vaccination status:", error);
    res.status(500).json({ error: "Failed to update vaccination status" });
  }
};

// Delete vaccination
export const deleteVaccination = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { vaccinationId } = req.params;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Get vaccination and verify ownership
    const vaccination = await prisma.scheduledVaccination.findUnique({
      where: { id: Number(vaccinationId) },
      include: { pet: true },
    });

    if (!vaccination) {
      res.status(404).json({ error: "Vaccination not found" });
      return;
    }

    if (vaccination.pet.ownerId !== userId) {
      res.status(403).json({ error: "You do not own this pet" });
      return;
    }

    await prisma.scheduledVaccination.delete({
      where: { id: Number(vaccinationId) },
    });

    res.json({ message: "Vaccination deleted successfully" });
  } catch (error) {
    console.error("Error deleting vaccination:", error);
    res.status(500).json({ error: "Failed to delete vaccination" });
  }
};
