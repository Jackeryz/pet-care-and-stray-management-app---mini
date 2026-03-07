// src/routes/petRoutes.ts
import express from "express";
import {
  createPet,
  listPets,
  assignVet,
  getMedicalRecord,
  addMedicalRecord,
  deletePet,
  updatePetPhoto,
} from "../controllers/petController";
import { authenticate } from "../middlewares/auth";
import { upload } from "../middlewares/upload";

const router = express.Router();

// Multer error handler middleware
const handleMulterError = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.message === "Only images are allowed!") {
    res.status(400).json({ error: "Only image files are allowed" });
  } else if (err.message) {
    res.status(400).json({ error: err.message });
  } else {
    next(err);
  }
};

// Pet CRUD
router.get("/", authenticate, listPets);
router.post("/", authenticate, upload.single("photo"), handleMulterError, createPet);
router.patch("/:petId/photo", authenticate, upload.single("photo"), handleMulterError, updatePetPhoto);
router.delete("/:petId", authenticate, deletePet);
router.post("/assign-vet", authenticate, assignVet);

// Medical Records
router.get("/:petId/medical", authenticate, getMedicalRecord);
router.post("/medical", authenticate, addMedicalRecord);

export default router;
