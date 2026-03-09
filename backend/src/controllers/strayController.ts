// src/controllers/strayController.ts
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../database/db";
import { queryUsersWithLocationByRole, insertNotification } from "../database/sqliteSetup";
import { getIO } from "../index";

const NGO_STATUS_OPTIONS = ["PENDING", "RESCUED", "HOUSED", "RESOLVED"] as const;
const VET_STATUS_OPTIONS = ["PENDING", "FIRST_AID_PROVIDED", "HOUSED_AT_VET", "RESOLVED"] as const;
const LEGACY_STATUS_OPTIONS = ["REPORTED", "VERIFIED", "RESCUED", "RESOLVED"] as const;

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

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getNearestUserWithDistance(users: any[], latitude: number, longitude: number) {
  if (!users || users.length === 0) return null;

  let nearest = users[0];
  let minDist = haversineDistance(
    latitude,
    longitude,
    Number(nearest.latitude),
    Number(nearest.longitude),
  );

  for (const user of users) {
    const d = haversineDistance(latitude, longitude, Number(user.latitude), Number(user.longitude));
    if (d < minDist) {
      minDist = d;
      nearest = user;
    }
  }

  return { nearest, distanceKm: minDist };
}

function deriveOverallStatus(ngoStatus: string, vetStatus: string, currentStatus: string) {
  if (ngoStatus === "RESOLVED" || vetStatus === "RESOLVED") return "RESOLVED";
  if (ngoStatus === "HOUSED" || ngoStatus === "RESCUED") return "RESCUED";
  if (vetStatus === "HOUSED_AT_VET" || vetStatus === "FIRST_AID_PROVIDED") return "VERIFIED";
  return currentStatus;
}

async function fetchResponderMetaByReportIds(reportIds: number[]) {
  if (reportIds.length === 0) return new Map<number, any>();

  const placeholders = reportIds.map(() => "?").join(",");
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT
      sr.id,
      COALESCE(sr.ngoStatus, 'PENDING') as ngoStatus,
      COALESCE(sr.vetStatus, 'PENDING') as vetStatus,
      sr.ngoResponderId,
      sr.vetResponderId,
      ngo.name as ngoName,
      ngo.latitude as ngoLatitude,
      ngo.longitude as ngoLongitude,
      vet.name as vetName,
      vet.latitude as vetLatitude,
      vet.longitude as vetLongitude
    FROM "StrayReport" sr
    LEFT JOIN "User" ngo ON ngo.id = sr.ngoResponderId
    LEFT JOIN "User" vet ON vet.id = sr.vetResponderId
    WHERE sr.id IN (${placeholders})`,
    ...reportIds,
  );

  return new Map<number, any>(rows.map((row: any) => [row.id, row]));
}

function enrichReportsWithResponderData(reports: any[], viewerRole: string, metaMap: Map<number, any>) {
  return reports.map((report) => {
    const meta = metaMap.get(report.id);
    const ngoStatus = meta?.ngoStatus || "PENDING";
    const vetStatus = meta?.vetStatus || "PENDING";

    const canSeeVetBase = (viewerRole === "NGO" || viewerRole === "ADMIN") && vetStatus === "HOUSED_AT_VET";
    const canSeeNgoBase = (viewerRole === "VET" || viewerRole === "ADMIN") && ngoStatus === "HOUSED";

    return {
      ...report,
      ngoStatus,
      vetStatus,
      sharedVetBaseLocation: canSeeVetBase && meta?.vetLatitude != null && meta?.vetLongitude != null
        ? {
            responderId: meta.vetResponderId,
            responderName: meta.vetName,
            latitude: Number(meta.vetLatitude),
            longitude: Number(meta.vetLongitude),
          }
        : null,
      sharedNgoBaseLocation: canSeeNgoBase && meta?.ngoLatitude != null && meta?.ngoLongitude != null
        ? {
            responderId: meta.ngoResponderId,
            responderName: meta.ngoName,
            latitude: Number(meta.ngoLatitude),
            longitude: Number(meta.ngoLongitude),
          }
        : null,
    };
  });
}

// Report a Stray
export const reportStray = async (req: AuthRequest, res: Response) => {
  try {
    const { location, description, latitude, longitude } = req.body;
    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);
    const hasValidCoordinates = parsedLatitude !== null && parsedLongitude !== null;

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const report = await prisma.strayReport.create({
      data: {
        location,
        description,
        photoUrl,
        reporterId: req.user!.id,
        status: "REPORTED",
      },
    });

    await prisma.$executeRawUnsafe(
      'UPDATE "StrayReport" SET ngoStatus = COALESCE(ngoStatus, ?), vetStatus = COALESCE(vetStatus, ?) WHERE id = ?',
      "PENDING",
      "PENDING",
      report.id,
    );

    if (hasValidCoordinates) {
      await prisma.$executeRawUnsafe(
        'UPDATE "StrayReport" SET latitude = ?, longitude = ? WHERE id = ?',
        parsedLatitude,
        parsedLongitude,
        report.id,
      );
    }

    const notificationSummary: any = {
      ngo: { notified: false, message: "Location not provided" },
      vet: { notified: false, message: "Location not provided" },
    };

    let notifiedNgoId: string | null = null;
    let notifiedVetId: string | null = null;

    if (hasValidCoordinates) {
      const MAX_KM = 500;
      const io = getIO();
      const responders: Array<{ role: "NGO" | "VET"; key: "ngo" | "vet" }> = [
        { role: "NGO", key: "ngo" },
        { role: "VET", key: "vet" },
      ];

      for (const responder of responders) {
        const usersWithLocation: any[] = queryUsersWithLocationByRole(responder.role);
        const nearestWithDistance = getNearestUserWithDistance(
          usersWithLocation,
          parsedLatitude,
          parsedLongitude,
        );

        if (!nearestWithDistance) {
          notificationSummary[responder.key] = {
            notified: false,
            message: `No ${responder.role} with location available`,
          };
          continue;
        }

        if (nearestWithDistance.distanceKm > MAX_KM) {
          notificationSummary[responder.key] = {
            notified: false,
            message: `No ${responder.role} within ${MAX_KM} km`,
          };
          continue;
        }

        const nearest = nearestWithDistance.nearest;
        const distanceKm = Number(nearestWithDistance.distanceKm.toFixed(3));
        const message =
          responder.role === "VET"
            ? `Urgent first-aid stray alert near ${location}: ${description}`
            : `New stray reported near ${location}: ${description}`;

        insertNotification(String(nearest.id), report.id, message);

        if (responder.role === "NGO") notifiedNgoId = String(nearest.id);
        if (responder.role === "VET") notifiedVetId = String(nearest.id);

        notificationSummary[responder.key] = {
          notified: true,
          responder: { id: nearest.id, name: nearest.name, email: nearest.email },
          distanceKm,
        };

        if (io) {
          io.to(`user-${nearest.id}`).emit("stray-report-notification", {
            reportId: report.id,
            location,
            description,
            photoUrl,
            reporterId: req.user!.id,
            responderRole: responder.role,
            distanceKm,
            message,
          });
        }
      }

      if (notifiedNgoId) {
        await prisma.$executeRawUnsafe(
          'UPDATE "StrayReport" SET ngoResponderId = COALESCE(ngoResponderId, ?) WHERE id = ?',
          notifiedNgoId,
          report.id,
        );
      }

      if (notifiedVetId) {
        await prisma.$executeRawUnsafe(
          'UPDATE "StrayReport" SET vetResponderId = COALESCE(vetResponderId, ?) WHERE id = ?',
          notifiedVetId,
          report.id,
        );
      }
    }

    const responseBody: any = { report };
    if (hasValidCoordinates) {
      responseBody.notification = {
        notified: notificationSummary.ngo.notified || notificationSummary.vet.notified,
        ngo: notificationSummary.ngo,
        vet: notificationSummary.vet,
      };
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

    if (userRole === "NGO" || userRole === "VET") {
      const notificationReports = await prisma.$queryRawUnsafe<any[]>(
        'SELECT DISTINCT reportId FROM notifications WHERE ngoId = ? ORDER BY createdAt DESC',
        userId,
      );

      const reportIds = notificationReports.map((n) => Number(n.reportId)).filter((id) => Number.isFinite(id));

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
    } else {
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

    const metaMap = await fetchResponderMetaByReportIds(reports.map((r) => r.id));
    const enriched = enrichReportsWithResponderData(reports, userRole, metaMap);

    res.json(enriched);
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
    const reportId = Number(id);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const normalizedStatus = typeof status === "string" ? status.trim().toUpperCase() : "";

    const report = await prisma.strayReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    const isReporter = report.reporterId === userId;
    const isAdmin = userRole === "ADMIN";
    const isNGO = userRole === "NGO";
    const isVet = userRole === "VET";

    if (!isReporter && !isAdmin && !isNGO && !isVet) {
      res.status(403).json({
        error: "Unauthorized: Only the reporter, NGOs, or vets can update this status",
      });
      return;
    }

    if (!normalizedStatus) {
      res.status(400).json({ error: "Status is required" });
      return;
    }

    if (isNGO || isVet) {
      const allowed = isNGO ? NGO_STATUS_OPTIONS : VET_STATUS_OPTIONS;
      if (!allowed.includes(normalizedStatus as any)) {
        res.status(400).json({
          error: `Invalid status for ${userRole}. Allowed: ${allowed.join(", ")}`,
        });
        return;
      }

      const nowIso = new Date().toISOString();
      if (isNGO) {
        await prisma.$executeRawUnsafe(
          'UPDATE "StrayReport" SET ngoStatus = ?, ngoResponderId = COALESCE(ngoResponderId, ?), ngoUpdatedAt = ? WHERE id = ?',
          normalizedStatus,
          userId,
          nowIso,
          reportId,
        );
      } else {
        await prisma.$executeRawUnsafe(
          'UPDATE "StrayReport" SET vetStatus = ?, vetResponderId = COALESCE(vetResponderId, ?), vetUpdatedAt = ? WHERE id = ?',
          normalizedStatus,
          userId,
          nowIso,
          reportId,
        );
      }

      const metaMapAfter = await fetchResponderMetaByReportIds([reportId]);
      const metaAfter = metaMapAfter.get(reportId);
      const nextOverall = deriveOverallStatus(
        metaAfter?.ngoStatus || "PENDING",
        metaAfter?.vetStatus || "PENDING",
        report.status,
      );

      if (nextOverall !== report.status && LEGACY_STATUS_OPTIONS.includes(nextOverall as any)) {
        await prisma.strayReport.update({
          where: { id: reportId },
          data: { status: nextOverall as any },
        });
      }

      const updatedReport = await prisma.strayReport.findUnique({
        where: { id: reportId },
        include: { reporter: { select: { name: true } } },
      });

      if (!updatedReport) {
        res.status(404).json({ error: "Report not found after update" });
        return;
      }

      const enriched = enrichReportsWithResponderData([updatedReport], userRole, metaMapAfter)[0];

      const io = getIO();
      if (io) {
        if (isVet && normalizedStatus === "HOUSED_AT_VET" && metaAfter?.ngoResponderId) {
          io.to(`user-${metaAfter.ngoResponderId}`).emit("stray-report-notification", {
            reportId,
            location: updatedReport.location,
            description: updatedReport.description,
            responderRole: "VET",
            message: "Vet has housed the stray at clinic/base. Vet location is now shared.",
            sharedVetBaseLocation: enriched.sharedVetBaseLocation,
          });
        }

        if (isNGO && normalizedStatus === "HOUSED" && metaAfter?.vetResponderId) {
          io.to(`user-${metaAfter.vetResponderId}`).emit("stray-report-notification", {
            reportId,
            location: updatedReport.location,
            description: updatedReport.description,
            responderRole: "NGO",
            message: "NGO has housed the stray. NGO base location is now shared.",
            sharedNgoBaseLocation: enriched.sharedNgoBaseLocation,
          });
        }
      }

      res.json(enriched);
      return;
    }

    if (!LEGACY_STATUS_OPTIONS.includes(normalizedStatus as any)) {
      res.status(400).json({
        error: `Invalid status. Allowed: ${LEGACY_STATUS_OPTIONS.join(", ")}`,
      });
      return;
    }

    const updatedReport = await prisma.strayReport.update({
      where: { id: reportId },
      data: { status: normalizedStatus as any },
      include: { reporter: { select: { name: true } } },
    });

    const metaMap = await fetchResponderMetaByReportIds([reportId]);
    const enriched = enrichReportsWithResponderData([updatedReport], userRole, metaMap)[0];

    res.json(enriched);
  } catch (error) {
    console.error("Update Stray Status Error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};

// Get User's Own Reports
export const getUserStrayReports = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const reports = await prisma.strayReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: "desc" },
      include: { reporter: { select: { name: true } } },
    });

    const metaMap = await fetchResponderMetaByReportIds(reports.map((r) => r.id));
    const enriched = enrichReportsWithResponderData(reports, userRole, metaMap);

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch your reports" });
  }
};
