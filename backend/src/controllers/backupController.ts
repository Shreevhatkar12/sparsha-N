import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "../lib/auth.js";
import { runFullSync, getBackupStatus } from "../services/backupService.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export async function getBackupStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json(getBackupStatus());
  } catch (error) {
    return next(error);
  }
}

export async function triggerBackupSyncController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as AuthenticatedRequest).user!;
    if (user.role !== "super_admin") {
      return res.status(403).json({ success: false, error: "Only Super Admin can trigger a manual sync." });
    }
    const result = await runFullSync();
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
