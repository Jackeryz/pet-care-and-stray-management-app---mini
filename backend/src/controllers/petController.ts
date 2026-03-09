// src/controllers/petController.ts
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";
import { deleteChatMessagesByAdoptionRecordIds } from "../database/sqliteSetup";

// --- Pet Management ---

const parseBirthdateInput = (input: unknown): Date | null => {
  if (typeof input !== "string" || !input.trim()) return null;
  const trimmed = input
    .trim()
    .replace(/\s+/g, "")
    .replace(/[/.]/g, "-")
    .replace(/[\u2013\u2014]/g, "-");

  // Accept DD-MM-YYYY.
  const ddmmyyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const ddmmyyyyMatch = trimmed.match(ddmmyyyy);
  if (ddmmyyyyMatch) {
    const dd = ddmmyyyyMatch[1];
    const mm = ddmmyyyyMatch[2];
    const yyyy = ddmmyyyyMatch[3];
    if (!dd || !mm || !yyyy) return null;
    const day = dd.padStart(2, "0");
    const month = mm.padStart(2, "0");
    const parsed = new Date(`${yyyy}-${month}-${day}T00:00:00.000Z`);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getUTCFullYear() === Number(yyyy) &&
      parsed.getUTCMonth() + 1 === Number(month) &&
      parsed.getUTCDate() === Number(day)
    ) {
      return parsed;
    }
    return null;
  }

  // Accept YYYY-MM-DD.
  const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const yyyymmddMatch = trimmed.match(yyyymmdd);
  if (yyyymmddMatch) {
    const yyyy = yyyymmddMatch[1];
    const mm = yyyymmddMatch[2];
    const dd = yyyymmddMatch[3];
    if (!dd || !mm || !yyyy) return null;
    const month = mm.padStart(2, "0");
    const day = dd.padStart(2, "0");
    const parsed = new Date(`${yyyy}-${month}-${day}T00:00:00.000Z`);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getUTCFullYear() === Number(yyyy) &&
      parsed.getUTCMonth() + 1 === Number(month) &&
      parsed.getUTCDate() === Number(day)
    ) {
      return parsed;
    }
    return null;
  }

  // Also accept ISO-style date values.
  const isoParsed = new Date(trimmed);
  if (!Number.isNaN(isoParsed.getTime())) return isoParsed;
  return null;
};

// Create a new Pet
export const createPet = async (req: AuthRequest, res: Response) => {
  try {
    const { name, breed, age, birthdate } = req.body;
    const parsedBirthdate = parseBirthdateInput(birthdate);
    if (typeof birthdate === "string" && birthdate.trim() && !parsedBirthdate) {
      res.status(400).json({ error: "Invalid birthdate. Use DD-MM-YYYY or YYYY-MM-DD format." });
      return;
    }
    const derivedAge = (() => {
      if (parsedBirthdate) {
        const now = new Date();
        let years = now.getUTCFullYear() - parsedBirthdate.getUTCFullYear();
        const monthDiff = now.getUTCMonth() - parsedBirthdate.getUTCMonth();
        const dayDiff = now.getUTCDate() - parsedBirthdate.getUTCDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--;
        return Math.max(0, years);
      }

      const numericAge = Number(age);
      if (Number.isFinite(numericAge) && numericAge >= 0) return Math.floor(numericAge);
      return 0;
    })();

    console.log("CreatePet Request:", { name, breed, age });
    console.log("File Info:", req.file ? { filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size } : "No file");
    console.log("User ID:", req.user!.id);

    // Multer puts the file info in req.file
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    console.log("Photo URL:", photoUrl);

    const pet = await prisma.pet.create({
      data: {
        name,
        breed,
        age: derivedAge,
        photoUrl,
        ownerId: req.user!.id, // Link to the logged-in user
        birthdate: parsedBirthdate,
      },
    });

    console.log("Pet created successfully:", pet);
    res.status(201).json(pet);
  } catch (error) {
    console.error("Create Pet Error:", error);
    res.status(500).json({ error: `Failed to create pet: ${error instanceof Error ? error.message : String(error)}` });
  }
};

// List Pets (Filtered by Role)
export const listPets = async (req: AuthRequest, res: Response) => {
  try {
    const { id, role } = req.user!;
    let whereClause = {};

    // Logic:
    // 1. Admins see ALL pets.
    // 2. Vets see pets assigned to them OR owned by them.
    // 3. Others see only their own pets.
    if (role === "ADMIN") {
      whereClause = {};
    } else if (role === "VET") {
      whereClause = {
        OR: [{ assignedVetId: id }, { ownerId: id }],
      };
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

    // Get all adoption records for this pet to clean up chat messages
    const adoptionRecords = await prisma.adoptionRecord.findMany({
      where: { petId: Number(petId) },
      select: { id: true }
    });
    const adoptionRecordIds = adoptionRecords.map(record => record.id);

    // Delete chat messages for all adoption records of this pet
    if (adoptionRecordIds.length > 0) {
      deleteChatMessagesByAdoptionRecordIds(adoptionRecordIds);
    }

    // Delete associated adoption records
    await prisma.adoptionRecord.deleteMany({
      where: { petId: Number(petId) },
    });

    // Delete associated medical records
    await prisma.medicalRecord.deleteMany({
      where: { petId: Number(petId) },
    });

    // Delete associated scheduled vaccinations
    await prisma.scheduledVaccination.deleteMany({
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

// Update Pet Birthdate (and derived age)
export const updatePetBirthdate = async (req: AuthRequest, res: Response) => {
  try {
    const { petId } = req.params;
    const { birthdate } = req.body;
    const userId = req.user!.id;

    if (typeof birthdate !== "string" || !birthdate.trim()) {
      res.status(400).json({ error: "Birthdate is required" });
      return;
    }

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

    const parsedBirthdate = parseBirthdateInput(birthdate);
    if (!parsedBirthdate) {
      res.status(400).json({ error: "Invalid birthdate. Use DD-MM-YYYY or YYYY-MM-DD format." });
      return;
    }

    const now = new Date();
    let years = now.getUTCFullYear() - parsedBirthdate.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - parsedBirthdate.getUTCMonth();
    const dayDiff = now.getUTCDate() - parsedBirthdate.getUTCDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--;
    const derivedAge = Math.max(0, years);

    const updatedPet = await prisma.pet.update({
      where: { id: Number(petId) },
      data: {
        birthdate: parsedBirthdate,
        age: derivedAge,
      },
    });

    res.json(updatedPet);
  } catch (error) {
    res.status(500).json({ error: "Failed to update pet birthdate" });
  }
};

// Update Pet Photo
export const updatePetPhoto = async (req: AuthRequest, res: Response) => {
  try {
    const { petId } = req.params;
    const userId = req.user!.id;

    if (!req.file) {
      res.status(400).json({ error: "No photo provided" });
      return;
    }

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

    // Update pet with new photo URL
    const photoUrl = `/uploads/${req.file.filename}`;
    const updatedPet = await prisma.pet.update({
      where: { id: Number(petId) },
      data: { photoUrl },
    });

    res.json(updatedPet);
  } catch (error) {
    console.error("Update Pet Photo Error:", error);
    res.status(500).json({ error: "Failed to update pet photo" });
  }
};

