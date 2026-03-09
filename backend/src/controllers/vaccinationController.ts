import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";

// Helper function to calculate distance between two coordinates (in km)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get available vets within 50 km for a pet owner
export const getAvailableVets = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const queryLatitude = Number(req.query.latitude);
    const queryLongitude = Number(req.query.longitude);
    const hasLiveLocation =
      Number.isFinite(queryLatitude) &&
      Number.isFinite(queryLongitude);

    // Get user's saved location (fallback)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { latitude: true, longitude: true },
    });

    const referenceLatitude = hasLiveLocation ? queryLatitude : user?.latitude;
    const referenceLongitude = hasLiveLocation ? queryLongitude : user?.longitude;

    if (referenceLatitude == null || referenceLongitude == null) {
      res.status(400).json({ error: "Your location is not set" });
      return;
    }

    // Get all vets with location
    const vets = await prisma.user.findMany({
      where: { role: "VET" },
      select: { id: true, name: true, email: true, latitude: true, longitude: true },
    });

    // Filter vets within 50 km and calculate distance
    const availableVets = vets
      .filter((vet) => vet.latitude && vet.longitude)
      .map((vet) => {
        const distance = calculateDistance(
          referenceLatitude,
          referenceLongitude,
          vet.latitude!,
          vet.longitude!
        );
        return {
          ...vet,
          distance: parseFloat(distance.toFixed(2)),
        };
      })
      .filter((vet) => vet.distance <= 50)
      .sort((a, b) => a.distance - b.distance);

    res.json(availableVets);
  } catch (error) {
    console.error("Error fetching available vets:", error);
    res.status(500).json({ error: "Failed to fetch available vets" });
  }
};

// Schedule a new vaccination for a pet
export const scheduleVaccination = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { petId, vaccineName, scheduledDate, notes, assignedVetId, latitude, longitude } = req.body;

    if (!userId || !petId || !vaccineName || !scheduledDate || !assignedVetId) {
      res
        .status(400)
        .json({
          error: "Missing required fields: petId, vaccineName, scheduledDate, assignedVetId",
        });
      return;
    }

    // Verify user owns the pet
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });

    if (!pet || pet.ownerId !== userId) {
      res.status(403).json({ error: "You do not own this pet" });
      return;
    }

    // Verify vet exists
    const vet = await prisma.user.findUnique({
      where: { id: assignedVetId },
      select: { id: true, role: true, name: true, latitude: true, longitude: true },
    });

    if (!vet || vet.role !== "VET") {
      res.status(400).json({ error: "Invalid vet selected" });
      return;
    }

    const liveLatitude = Number(latitude);
    const liveLongitude = Number(longitude);
    const hasLiveLocation = Number.isFinite(liveLatitude) && Number.isFinite(liveLongitude);

    const referenceLatitude = hasLiveLocation ? liveLatitude : pet.owner.latitude;
    const referenceLongitude = hasLiveLocation ? liveLongitude : pet.owner.longitude;

    // Verify vet is within 50 km using live location when provided.
    if (referenceLatitude != null && referenceLongitude != null && vet.latitude != null && vet.longitude != null) {
      const distance = calculateDistance(
        referenceLatitude,
        referenceLongitude,
        vet.latitude,
        vet.longitude
      );
      if (distance > 50) {
        res.status(400).json({ error: "Selected vet is more than 50 km away" });
        return;
      }
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
        assignedVetId,
      },
      include: {
        pet: true,
        assignedVet: { select: { id: true, name: true, email: true } },
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

// Get all vaccinations assigned to a vet
export const getAssignedVaccinations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    if (userRole !== "VET") {
      res.status(403).json({ error: "Only vets can view assigned vaccinations" });
      return;
    }

    const vaccinations = await prisma.scheduledVaccination.findMany({
      where: { assignedVetId: userId },
      include: {
        pet: {
          include: {
            owner: { select: { id: true, name: true, email: true, latitude: true, longitude: true } },
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });

    res.json(vaccinations);
  } catch (error) {
    console.error("Error fetching assigned vaccinations:", error);
    res.status(500).json({ error: "Failed to fetch assigned vaccinations" });
  }
};

// Update vaccination status (for vets)
export const updateVaccinationStatusAsVet = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { vaccinationId } = req.params;
    const { status } = req.body;

    if (!userId || userRole !== "VET") {
      res.status(403).json({ error: "Only vets can update vaccination status" });
      return;
    }

    if (!["PENDING", "COMPLETED", "SKIPPED"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const vaccination = await prisma.scheduledVaccination.findUnique({
      where: { id: Number(vaccinationId) },
      include: { pet: true },
    });

    if (!vaccination) {
      res.status(404).json({ error: "Vaccination not found" });
      return;
    }

    if (vaccination.assignedVetId !== userId) {
      res.status(403).json({ error: "This vaccination is not assigned to you" });
      return;
    }

    const updated = await prisma.scheduledVaccination.update({
      where: { id: Number(vaccinationId) },
      data: { status },
      include: { pet: true },
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
