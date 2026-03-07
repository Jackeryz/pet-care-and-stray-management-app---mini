// src/routes/strayRoutes.ts
import express from "express";
import {
  reportStray,
  listStrayReports,
  updateStrayStatus,
  getUserStrayReports,
} from "../controllers/strayController";
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

// Get user's own reports
router.get("/my-reports", authenticate, getUserStrayReports);

// Get all reports
router.get("/", authenticate, listStrayReports);

// Create a new report (Photo required usually, but handled gracefully if missing)
router.post("/", authenticate, upload.single("photo"), handleMulterError, reportStray);

// Update status (e.g., /api/strays/5/status)
router.patch("/:id/status", authenticate, updateStrayStatus);

export default router;
