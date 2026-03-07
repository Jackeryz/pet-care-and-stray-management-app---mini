import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import {
  scheduleVaccination,
  getPetVaccinations,
  getUpcomingVaccinations,
  updateVaccinationStatus,
  deleteVaccination,
  getAssignedVaccinations,
  updateVaccinationStatusAsVet,
  getAvailableVets,
} from "../controllers/vaccinationController";

const router = Router();

// Get available vets within 50 km
router.get("/available-vets", authenticate, getAvailableVets);

// Schedule a new vaccination
router.post("/schedule", authenticate, scheduleVaccination);

// Get upcoming vaccinations for all user's pets (next 30 days)
router.get("/upcoming", authenticate, getUpcomingVaccinations);

// Get all vaccinations assigned to a vet
router.get("/vet/assigned", authenticate, getAssignedVaccinations);

// Get all vaccinations for a specific pet
router.get("/pet/:petId", authenticate, getPetVaccinations);

// Update vaccination status (PENDING -> COMPLETED/SKIPPED)
router.patch("/:vaccinationId/status", authenticate, updateVaccinationStatus);

// Update vaccination status as vet
router.patch("/vet/:vaccinationId/status", authenticate, updateVaccinationStatusAsVet);

// Delete vaccination
router.delete("/:vaccinationId", authenticate, deleteVaccination);

export default router;
