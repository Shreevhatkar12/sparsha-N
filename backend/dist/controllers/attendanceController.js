import { bulkUpdateSessionRecords, createSession, getAttendanceSummary, getPendingSessions, getSessionById, getSessionRecords, getStudentAttendanceHistory, listSessions, parseHasIncomplete, getTodayFreshSheet, markHoliday, getRecentAbsentees, } from "../services/attendanceService.js";
export async function createAttendanceSession(req, res, next) {
    try {
        const { centerId, programId, sessionDate, activityId } = req.body;
        const result = await createSession(req.user, {
            centerId,
            programId,
            sessionDate,
            activityId,
        });
        if (!result.created) {
            return res.status(409).json(result);
        }
        return res.status(201).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getAttendanceSessions(req, res, next) {
    try {
        const { centerId, programId, from, to, hasIncomplete } = req.query;
        const result = await listSessions(req.user, {
            centerId: centerId,
            programId: programId,
            from: from,
            to: to,
            hasIncomplete: parseHasIncomplete(hasIncomplete),
        });
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getAttendanceSessionRecords(req, res, next) {
    try {
        const result = await getSessionRecords(req.user, req.params.sessionId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getAttendanceSessionById(req, res, next) {
    try {
        const result = await getSessionById(req.user, req.params.sessionId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function updateAttendanceSessionRecords(req, res, next) {
    try {
        const { records } = req.body;
        await bulkUpdateSessionRecords(req.user, req.params.sessionId, records);
        // ✅ Always return consistent structure
        const full = await getSessionById(req.user, req.params.sessionId);
        return res.status(200).json(full);
    }
    catch (error) {
        return next(error);
    }
}
export async function getStudentAttendance(req, res, next) {
    try {
        const { from, to, programId } = req.query;
        const result = await getStudentAttendanceHistory(req.user, req.params.studentId, {
            from: from,
            to: to,
            programId: programId,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getAttendanceSummaryController(req, res, next) {
    try {
        const { centerId, programId, from, to } = req.query;
        const result = await getAttendanceSummary(req.user, {
            centerId: centerId,
            programId: programId,
            from: from,
            to: to,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getPendingSessionsController(req, res, next) {
    try {
        const result = await getPendingSessions(req.user.userId);
        return res.status(200).json({ sessions: result });
    }
    catch (error) {
        return next(error);
    }
}
export async function getTodayFreshSheetController(req, res, next) {
    try {
        const { centerId, programId } = req.query;
        if (!centerId || !programId) {
            return res.status(400).json({ error: "centerId and programId are required" });
        }
        const result = await getTodayFreshSheet(req.user, centerId, programId);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function markHolidayController(req, res, next) {
    try {
        const { isHoliday } = req.body;
        const result = await markHoliday(req.user, req.params.sessionId, Boolean(isHoliday));
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function getRecentAbsenteesController(req, res, next) {
    try {
        const days = req.query.days ? parseInt(req.query.days, 10) : 7;
        const result = await getRecentAbsentees(req.user, days);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
