import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import {
  scheduleVaccination,
  getPetVaccinations,
  getUpcomingVaccinations,
  updateVaccinationStatus,
  deleteVaccination,
} from "../controllers/vaccinationController";

const router = Router();

// Schedule a new vaccination
router.post("/schedule", authenticate, scheduleVaccination);

// Get upcoming vaccinations for all user's pets (next 30 days)
router.get("/upcoming", authenticate, getUpcomingVaccinations);

// Get all vaccinations for a specific pet
router.get("/pet/:petId", authenticate, getPetVaccinations);

// Update vaccination status (PENDING -> COMPLETED/SKIPPED)
router.patch("/:vaccinationId/status", authenticate, updateVaccinationStatus);

// Delete vaccination
router.delete("/:vaccinationId", authenticate, deleteVaccination);

export default router;
