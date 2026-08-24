import { Request, Response, NextFunction } from "express";
import * as announcementService from "../services/announcement.service.js";

export async function listAnnouncements(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, role, roles, centerIds } = req.user!;
    const { cursor } = req.query;
    const announcements = await announcementService.listAnnouncements(
      { userId, role, roles, allowedCenterIds: centerIds },
      cursor as string
    );
    res.json(announcements);
  } catch (err) {
    next(err);
  }
}

export async function createAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, role, roles, centerIds } = req.user!;
    const announcement = await announcementService.createAnnouncement(req.body, {
      userId,
      role,
      roles,
      allowedCenterIds: centerIds,
    });
    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
}

export async function updateAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, role, roles, centerIds } = req.user!;
    const announcement = await announcementService.updateAnnouncement(req.params.id as string, req.body, {
      userId,
      role,
      roles,
      allowedCenterIds: centerIds,
    });
    res.json(announcement);
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, roles, centerIds } = req.user!;
    await announcementService.deleteAnnouncement(req.params.id as string, {
      role,
      roles,
      allowedCenterIds: centerIds,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
