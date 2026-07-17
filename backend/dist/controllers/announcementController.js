import * as announcementService from "../services/announcement.service.js";
export async function listAnnouncements(req, res, next) {
    try {
        const { role, centerIds } = req.user;
        const { programId, cursor } = req.query;
        const announcements = await announcementService.listAnnouncements({ role, allowedCenterIds: centerIds, programId: programId }, cursor);
        res.json(announcements);
    }
    catch (err) {
        next(err);
    }
}
export async function createAnnouncement(req, res, next) {
    try {
        const { userId, role, centerIds } = req.user;
        const announcement = await announcementService.createAnnouncement(req.body, {
            userId,
            role,
            allowedCenterIds: centerIds,
        });
        res.status(201).json(announcement);
    }
    catch (err) {
        next(err);
    }
}
export async function updateAnnouncement(req, res, next) {
    try {
        const { userId, role, centerIds } = req.user;
        const announcement = await announcementService.updateAnnouncement(req.params.id, req.body, {
            userId,
            role,
            allowedCenterIds: centerIds,
        });
        res.json(announcement);
    }
    catch (err) {
        next(err);
    }
}
export async function deleteAnnouncement(req, res, next) {
    try {
        const { role, centerIds } = req.user;
        await announcementService.deleteAnnouncement(req.params.id, {
            role,
            allowedCenterIds: centerIds,
        });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
}
