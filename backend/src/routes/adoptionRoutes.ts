import express from "express";
import {
  createAdoptionRequest,
  listMyAdoptions,
  listAllAdoptions,
  updateAdoptionStatus,
} from "../controllers/adoptionController";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

// Current user's adoption records
router.get("/", authenticate, listMyAdoptions);
router.post("/", authenticate, createAdoptionRequest);

// Admin-only view of all adoption records
router.get("/all", authenticate, listAllAdoptions);

// Update status (Admin / NGO)
router.patch("/:id/status", authenticate, updateAdoptionStatus);

export default router;

