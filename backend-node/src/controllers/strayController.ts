// src/controllers/strayController.ts
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";

// Report a Stray
export const reportStray = async (req: AuthRequest, res: Response) => {
  try {
    const { location, description } = req.body;

    // Handle photo upload
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const report = await prisma.strayReport.create({
      data: {
        location,
        description,
        photoUrl,
        reporterId: req.user!.id,
        status: "REPORTED", // Default status
      },
    });

    res.status(201).json(report);
  } catch (error) {
    console.error("Report Stray Error:", error);
    res.status(500).json({ error: "Failed to submit report" });
  }
};

// List All Reports (Publicly viewable by auth users)
export const listStrayReports = async (req: AuthRequest, res: Response) => {
  try {
    const reports = await prisma.strayReport.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: { name: true }, // Only show the reporter's name, not email
        },
      },
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

// Update Report Status (Restricted)
export const updateStrayStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // 1. Find the report
    const report = await prisma.strayReport.findUnique({
      where: { id: Number(id) },
    });

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    // 2. Check Permissions (Matches Motoko Logic)
    // Allowed: The original reporter, an Admin, or an NGO
    const isReporter = report.reporterId === userId;
    const isAdmin = userRole === "ADMIN";
    const isNGO = userRole === "NGO";

    if (!isReporter && !isAdmin && !isNGO) {
      res.status(403).json({
        error: "Unauthorized: Only the reporter or NGOs can update this status",
      });
      return;
    }

    // 3. Update Status
    const updatedReport = await prisma.strayReport.update({
      where: { id: Number(id) },
      data: { status },
    });

    res.json(updatedReport);
  } catch (error) {
    res.status(500).json({ error: "Failed to update status" });
  }
};
