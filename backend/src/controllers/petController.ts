// src/controllers/petController.ts
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";

// --- Pet Management ---

// Create a new Pet
export const createPet = async (req: AuthRequest, res: Response) => {
  try {
    const { name, breed, age } = req.body;

    // Multer puts the file info in req.file
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const pet = await prisma.pet.create({
      data: {
        name,
        breed,
        age: Number(age), // Ensure it's a number
        photoUrl,
        ownerId: req.user!.id, // Link to the logged-in user
      },
    });

    res.status(201).json(pet);
  } catch (error) {
    console.error("Create Pet Error:", error);
    res.status(500).json({ error: "Failed to create pet" });
  }
};

// List Pets (Filtered by Role)
export const listPets = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;
    let whereClause = {};

    // Logic:
    // 1. Admins see ALL pets.
    // 2. Vets see pets assigned to them.
    // 3. Owners see only their own pets.
    if (role === "ADMIN") {
      whereClause = {};
    } else if (role === "VET") {
      whereClause = { assignedVetId: id };
    } else {
      whereClause = { ownerId: id };
    }

    const pets = await prisma.pet.findMany({ where: whereClause });
    res.json(pets);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pets" });
  }
};

// Assign a Vet to a Pet
export const assignVet = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { petId, vetId } = req.body;

    // Verify the vet exists first
    const vet = await prisma.user.findUnique({ where: { id: vetId } });
    if (!vet || vet.role !== "VET") {
      res.status(400).json({ error: "Invalid Veterinarian ID" });
      return;
    }

    const updatedPet = await prisma.pet.update({
      where: { id: Number(petId) },
      data: { assignedVetId: vetId },
    });

    res.json(updatedPet);
  } catch (error) {
    res.status(500).json({ error: "Failed to assign vet" });
  }
};

// --- Medical Records ---

export const getMedicalRecord = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { petId } = req.params;

    const record = await prisma.medicalRecord.findUnique({
      where: { petId: Number(petId) },
    });

    if (!record) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    // Convert stored JSON strings back to Arrays for the frontend
    res.json({
      ...record,
      vaccinations: JSON.parse(record.vaccinations),
      treatments: JSON.parse(record.treatments),
      healthLogs: JSON.parse(record.healthLogs),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch medical record" });
  }
};

export const addMedicalRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { petId, vaccinations, treatments } = req.body;
    const pId = Number(petId);

    // We use 'upsert': Create if it doesn't exist, Update if it does.
    // We store arrays as JSON strings because SQLite is simple.
    const record = await prisma.medicalRecord.upsert({
      where: { petId: pId },
      update: {
        vaccinations: JSON.stringify(vaccinations),
        treatments: JSON.stringify(treatments),
      },
      create: {
        petId: pId,
        vaccinations: JSON.stringify(vaccinations),
        treatments: JSON.stringify(treatments),
        healthLogs: JSON.stringify([]),
      },
    });

    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update medical record" });
  }
};

// Delete a Pet
export const deletePet = async (req: AuthRequest, res: Response) => {
  try {
    const { petId } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const pet = await prisma.pet.findUnique({
      where: { id: Number(petId) },
    });

    if (!pet) {
      res.status(404).json({ error: "Pet not found" });
      return;
    }

    if (pet.ownerId !== userId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    // Delete associated medical records first
    await prisma.medicalRecord.deleteMany({
      where: { petId: Number(petId) },
    });

    // Delete the pet
    await prisma.pet.delete({
      where: { id: Number(petId) },
    });

    res.json({ message: "Pet deleted successfully" });
  } catch (error) {
    console.error("Delete Pet Error:", error);
    res.status(500).json({ error: "Failed to delete pet" });
  }
};
