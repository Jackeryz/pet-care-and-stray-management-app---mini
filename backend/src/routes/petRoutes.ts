// src/routes/petRoutes.ts
import express from "express";
import {
  createPet,
  listPets,
  assignVet,
  getMedicalRecord,
  addMedicalRecord,
  deletePet,
} from "../controllers/petController";
import { authenticate } from "../middlewares/auth";
import { upload } from "../middlewares/upload";

const router = express.Router();

// Pet CRUD
router.get("/", authenticate, listPets);
router.post("/", authenticate, upload.single("photo"), createPet);
router.delete("/:petId", authenticate, deletePet);
router.post("/assign-vet", authenticate, assignVet);

// Medical Records
router.get("/:petId/medical", authenticate, getMedicalRecord);
router.post("/medical", authenticate, addMedicalRecord);

export default router;
