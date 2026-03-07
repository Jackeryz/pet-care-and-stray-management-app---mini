// src/controllers/strayController.ts
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";
import { queryNGOsWithLocation, insertNotification } from "../database/sqliteSetup";
import { getIO } from "../index";

// Haversine distance
function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Report a Stray
export const reportStray = async (req: AuthRequest, res: Response) => {
  try {
    const { location, description, latitude, longitude } = req.body;

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

    // If lat/lng provided, store via raw SQL (Prisma schema may not include these columns)
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      await prisma.$executeRawUnsafe('UPDATE StrayReport SET latitude = ?, longitude = ? WHERE id = ?', latitude, longitude, report.id);
    }

    // Find NGOs with location and pick nearest within 500 km
    let notified = false;
    let notifiedNgo: any = null;
    let notifiedDistanceKm: number | null = null;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      const ngos: any[] = queryNGOsWithLocation();
      if (ngos && ngos.length > 0) {
        let nearest: any = ngos[0];
        let minDist = haversineDistance(latitude, longitude, Number(nearest.latitude), Number(nearest.longitude));
        for (const g of ngos) {
          const d = haversineDistance(latitude, longitude, Number(g.latitude), Number(g.longitude));
          if (d < minDist) {
            minDist = d;
            nearest = g;
          }
        }

        // Only notify if nearest NGO is within 500 km
        const MAX_KM = 500;
        if (minDist <= MAX_KM) {
          const message = `New stray reported near ${location}: ${description}`;
          insertNotification(String(nearest.id), report.id, message);
          notified = true;
          notifiedNgo = { id: nearest.id, name: nearest.name, email: nearest.email };
          notifiedDistanceKm = Number(minDist.toFixed(3));

          // Send real-time notification via Socket.io
          const io = getIO();
          if (io) {
            io.to(`user-${nearest.id}`).emit("stray-report-notification", {
              reportId: report.id,
              location,
              description,
              photoUrl,
              reporterId: req.user!.id,
              distanceKm: notifiedDistanceKm,
              message,
            });
          }
        }
      }
    }

    // Build response: include notification info when applicable, otherwise indicate none found
    const responseBody: any = { report };
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      if (notified) {
        responseBody.notification = { notified: true, ngo: notifiedNgo, distanceKm: notifiedDistanceKm };
      } else {
        responseBody.notification = { notified: false, message: 'No NGO within 500 km' };
      }
    }

    res.status(201).json(responseBody);
  } catch (error) {
    console.error("Report Stray Error:", error);
    res.status(500).json({ error: "Failed to submit report" });
  }
};

// List Reports (Filtered by Role)
export const listStrayReports = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let reports: any[] = [];

    if (userRole === 'NGO') {
      // NGOs see only reports they received notifications for
      const Database = require('better-sqlite3');
      const db = new Database('./dev.db');
      
      try {
        const notificationReports = db.prepare(
          'SELECT DISTINCT reportId FROM notifications WHERE ngoId = ? ORDER BY createdAt DESC'
        ).all(userId) as any[];
        
        const reportIds = notificationReports.map(n => n.reportId);
        
        if (reportIds.length > 0) {
          reports = await prisma.strayReport.findMany({
            where: { id: { in: reportIds } },
            orderBy: { createdAt: "desc" },
            include: {
              reporter: {
                select: { name: true },
              },
            },
          });
        }
      } finally {
        db.close();
      }
    } else {
      // Regular users see only their own reports
      reports = await prisma.strayReport.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: { name: true },
          },
        },
      });
    }

    res.json(reports);
  } catch (error) {
    console.error("List Stray Reports Error:", error);
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

// Get User's Own Reports
export const getUserStrayReports = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const reports = await prisma.strayReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch your reports" });
  }
};
