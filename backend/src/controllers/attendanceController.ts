import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "../lib/auth.js";
import {
  bulkUpdateSessionRecords,
  createSession,
  getAttendanceSummary,
  getPendingSessions,
  getSessionById,
  getStudentAttendanceHistory,
  listSessions,
  parseHasIncomplete,
} from "../services/attendanceService.js";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export async function createAttendanceSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { centerId, programId, sessionDate, activityId } = req.body as {
      centerId: string;
      programId: string;
      sessionDate: string;
      activityId?: string;
    };

    const result = await createSession((req as AuthenticatedRequest).user!, {
      centerId,
      programId,
      sessionDate,
      activityId,
    });

    if (!result.created) {
      return res.status(409).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getAttendanceSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const { centerId, programId, from, to, hasIncomplete } = req.query;

    const result = await listSessions((req as AuthenticatedRequest).user!, {
      centerId: centerId as string | undefined,
      programId: programId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      hasIncomplete: parseHasIncomplete(hasIncomplete),
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getAttendanceSessionById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getSessionById(
      (req as AuthenticatedRequest).user!,
      req.params.sessionId as string,
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function updateAttendanceSessionRecords(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { records } = req.body as {
      records: Array<{ recordId: string; status: "present" | "absent" | "late"; remarks?: string }>;
    };
    const result = await bulkUpdateSessionRecords(
      (req as AuthenticatedRequest).user!,
      req.params.sessionId as string,
      records,
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getStudentAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to, programId } = req.query;
    const result = await getStudentAttendanceHistory(
      (req as AuthenticatedRequest).user!,
      req.params.studentId as string,
      {
        from: from as string | undefined,
        to: to as string | undefined,
        programId: programId as string | undefined,
      },
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getAttendanceSummaryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { centerId, programId, from, to } = req.query;
    const result = await getAttendanceSummary((req as AuthenticatedRequest).user!, {
      centerId: centerId as string | undefined,
      programId: programId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getPendingSessionsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await getPendingSessions((req as AuthenticatedRequest).user!.userId);
    return res.status(200).json({ sessions: result });
  } catch (error) {
    return next(error);
  }
}
