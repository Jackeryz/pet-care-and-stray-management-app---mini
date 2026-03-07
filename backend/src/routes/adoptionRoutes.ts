import express from "express";
import {
  listPetForAdoption,
  delistPetFromAdoption,
  getAvailablePetsForAdoption,
  requestAdoption,
  listMyAdoptionRequests,
  listMyAdoptions,
  listAllAdoptionRequests,
  listAllAdoptions,
  acceptAdoptionRequest,
  rejectAdoptionRequest,
  updateAdoptionStatus,
} from "../controllers/adoptionController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// === ADOPTION LISTINGS VIEW ===
// GET /api/adoptions/available - Get all listed pets (excluding user's own)
// NOTE: This must come BEFORE the generic GET / route to be matched correctly
router.get("/available", authenticate, getAvailablePetsForAdoption);

// === LISTING MANAGEMENT ===
// POST /api/adoptions/:petId/list - Owner lists pet for adoption
router.post("/:petId/list", authenticate, listPetForAdoption);

// DELETE /api/adoptions/:petId/list - Owner delists pet
router.delete("/:petId/list", authenticate, delistPetFromAdoption);

// === ADOPTION REQUESTS ===
// POST /api/adoptions/:petId/request - User requests adoption
router.post("/:petId/request", authenticate, requestAdoption);

// === ADOPTION REQUEST MANAGEMENT ===
// GET /api/adoptions - Get user's adoption requests (inbound and outbound)
router.get("/", authenticate, listMyAdoptionRequests);

// PATCH /api/adoptions/:requestId/accept - Owner accepts request
router.patch("/:requestId/accept", authenticate, acceptAdoptionRequest);

// PATCH /api/adoptions/:requestId/reject - Owner rejects request
router.patch("/:requestId/reject", authenticate, rejectAdoptionRequest);

// === ADMIN ===
// GET /api/adoptions/all - Admin view all requests
router.get("/all", authenticate, listAllAdoptionRequests);

// PATCH /api/adoptions/:id/status - Admin update status
router.patch("/:id/status", authenticate, updateAdoptionStatus);

export default router;

