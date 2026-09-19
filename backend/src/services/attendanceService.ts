import { AttendanceStatus } from "@prisma/client";
import ExcelJS from "exceljs";
import type { JwtPayload } from '../lib/auth.js';
import { hasRole } from '../lib/auth.js';
import { ForbiddenError, NotFoundError, ValidationError, AppError } from '../lib/errors.js';
import prisma from '../lib/prisma.js';

type SessionCreateInput = {
  centerId: string;
  programId: string;
  sessionDate: string;
  activityId?: string;
};

type RecordUpdateInput = {
  recordId: string;
  status: "pending" | "present" | "absent" | "late" | "excused";
  remarks?: string;
};

function ensureCenterAccess(user: JwtPayload, centerId: string): void {
  if (user.role !== "super_admin" && !user.centerIds.includes(centerId)) {
    throw new ForbiddenError("No access to the requested center");
  }
}

/**
 * Teachers only ever see / mark the students they registered themselves
 * (createdById). Everyone else sees the whole session roster.
 */
function teacherStudentScope(user: JwtPayload): Record<string, unknown> {
  return hasRole(user, "teacher")
    ? { student: { is: { createdById: user.userId, isActive: true } } }
    : { student: { is: { isActive: true } } };
}

// Roll-number order (numeric aware); students without roll no go last.
function byRollNumber<T extends { rollNumber: string | null; fullName: string }>(a: T, b: T) {
  const ra = (a.rollNumber || "").trim();
  const rb = (b.rollNumber || "").trim();
  if (ra && !rb) return -1;
  if (!ra && rb) return 1;
  if (ra && rb) {
    const cmp = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: "base" });
    if (cmp !== 0) return cmp;
  }
  return a.fullName.localeCompare(b.fullName);
}

function applyCenterScopeToWhere(user: JwtPayload, where: Record<string, unknown>, centerId?: string) {
  if (user.role === "super_admin") {
    if (centerId) {
      where.centerId = centerId;
    }
    return;
  }

  if (centerId) {
    where.centerId = user.centerIds.includes(centerId) ? centerId : { in: [] };
    return;
  }

  where.centerId = { in: user.centerIds };
}

function parseDate(value: string | undefined, fieldName: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }

  return date;
}

function getCompletionPercentage(records: Array<{ status: AttendanceStatus | null }>): number {
  if (records.length === 0) {
    return 0;
  }
  const completed = records.filter((record) => record.status !== null).length;
  return Number(((completed / records.length) * 100).toFixed(2));
}

export async function createSession(
  user: JwtPayload,
  input: SessionCreateInput,
): Promise<{
  created: boolean;
  session: unknown;
  studentsWithPendingRecords?: Array<{ student: unknown; recordId: string }>;
}> {
  const sessionDate = parseDate(input.sessionDate, "sessionDate");
  if (!sessionDate) {
    throw new ValidationError("sessionDate is required");
  }
  ensureCenterAccess(user, input.centerId);

  const existing = await prisma.attendanceSession.findFirst({
    where: {
      centerId: input.centerId,
      programId: input.programId,
      sessionDate,
    },
    include: {
      center: true,
      program: true,
      activity: true,
    },
  });

  if (existing) {
    return { created: false, session: existing };
  }

  const created = await prisma.$transaction(async (tx) => {
    const session = await tx.attendanceSession.create({
      data: {
        centerId: input.centerId,
        programId: input.programId,
        sessionDate,
        activityId: input.activityId ?? null,
        createdBy: user.userId,
      },
      include: {
        center: true,
        program: true,
        activity: true,
      },
    });

    const students = await tx.student.findMany({
      where: {
        centerId: input.centerId,
        programId: input.programId,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        centerId: true,
        programId: true,
      },
    });

    if (students.length > 0) {
      await tx.attendanceRecord.createMany({
        data: students.map((student) => ({
          sessionId: session.id,
          studentId: student.id,
          centerId: student.centerId,
          status: "pending" as AttendanceStatus,
        })),
      });

      console.log("Creating records for students:", students.length);
    }

    const pendingRecords = await tx.attendanceRecord.findMany({
      where: { sessionId: session.id },
      select: { id: true, studentId: true },
    });

    const recordIdByStudentId = new Map(
      pendingRecords.map((record) => [record.studentId, record.id]),
    );

    return {
      session,
      studentsWithPendingRecords: students.map((student) => ({
        student,
        recordId: recordIdByStudentId.get(student.id) ?? "",
      })),
    };
  });

  return { created: true, ...created };
}

export async function getTodayFreshSheet(user: JwtPayload, centerId: string, programId: string) {
  ensureCenterAccess(user, centerId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Find or Create the session
  let session = await prisma.attendanceSession.findFirst({
    where: { centerId, programId, sessionDate: today },
  });

  if (!session) {
    await createSession(user, {
      centerId,
      programId,
      sessionDate: today.toISOString(),
    });
  }

  // 2. Sync missing students (Crucial for students added later in the day)
  // Fetch all active students for this center/program
  const activeStudents = await prisma.student.findMany({
    where: { centerId, programId, isActive: true },
    select: { id: true }
  });

  // Fetch students already in today's session
  const existingRecords = await prisma.attendanceRecord.findMany({
    where: { sessionId: session?.id || (await prisma.attendanceSession.findFirst({ where: { centerId, programId, sessionDate: today } }))?.id },
    select: { studentId: true }
  });

  const existingStudentIds = new Set(existingRecords.map(r => r.studentId));
  const missingStudents = activeStudents.filter(s => !existingStudentIds.has(s.id));

  // 3. Create records for missing students
  if (missingStudents.length > 0 && session) {
    await prisma.attendanceRecord.createMany({
      data: missingStudents.map(s => ({
        sessionId: session!.id,
        studentId: s.id,
        centerId: centerId,
        status: "pending" as AttendanceStatus
      }))
    });
  }

  // 4. Return the fully updated session — teachers get ONLY their own students,
  //    rows in roll-number order.
  const fresh = await prisma.attendanceSession.findFirst({
    where: { centerId, programId, sessionDate: today },
    include: {
      records: {
        where: teacherStudentScope(user) as never,
        include: {
          student: { select: { id: true, fullName: true, rollNumber: true } }
        }
      }
    }
  });
  if (fresh) {
    fresh.records.sort((a, b) => byRollNumber(a.student, b.student));
  }
  return fresh;
}

export async function markHoliday(user: JwtPayload, sessionId: string, isHoliday: boolean) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError("Session not found");
  ensureCenterAccess(user, session.centerId);

  return prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { isHoliday }
  });
}

export async function listSessions(
  user: JwtPayload,
  query: {
    centerId?: string;
    programId?: string;
    from?: string;
    to?: string;
    hasIncomplete?: boolean;
  },
): Promise<{ sessions: Array<Record<string, unknown>> }> {
  const from = parseDate(query.from, "from");
  const to = parseDate(query.to, "to");
  const where: Record<string, unknown> = {};
  applyCenterScopeToWhere(user, where, query.centerId);
  if (query.programId) {
    where.programId = query.programId;
  }
  if (from || to) {
    where.sessionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (query.hasIncomplete) {
    where.records = {
      some: { status: null as unknown as AttendanceStatus },
    };
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: where as never,
    include: {
      center: true,
      program: true,
      activity: true,
      records: {
        where: teacherStudentScope(user) as never,
        select: { status: true },
      },
    },
    orderBy: {
      sessionDate: "desc",
    },
  });

  return {
    sessions: sessions.map((session) => ({
      ...session,
      incompleteCount: session.records.filter((record) => record.status === null).length,
    })),
  };
}

export async function getSessionRecords(
  user: JwtPayload,
  sessionId: string,
): Promise<{ records: Array<Record<string, unknown>> }> {
  const full = await getSessionById(user, sessionId);
  return { records: (full.records as Array<Record<string, unknown>>) ?? [] };
}

export async function getSessionById(
  user: JwtPayload,
  sessionId: string,
): Promise<Record<string, unknown>> {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      center: true,
      program: true,
      activity: true,
      records: {
        where: teacherStudentScope(user) as never,
        include: {
          student: true,
        },
      },
    },
  });

  if (!session) {
    throw new NotFoundError("Attendance session");
  }

  ensureCenterAccess(user, session.centerId);

  return {
    session: {
      id: session.id,
      centerId: session.centerId,
      programId: session.programId,
      sessionDate: session.sessionDate,
      activity: session.activity,
      center: session.center,
      program: session.program,
    },
    records: [...session.records]
      .sort((a, b) => byRollNumber(a.student, b.student))
      .map((record) => ({
        student: record.student,
        record: {
          id: record.id,
          status: record.status,
          remarks: record.remarks,
        },
      })),
  };
}

export async function bulkUpdateSessionRecords(
  user: JwtPayload,
  sessionId: string,
  records: RecordUpdateInput[],
): Promise<Record<string, unknown>> {
  if (!Array.isArray(records) || records.length === 0) {
    throw new ValidationError("records array is required");
  }

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      records: true,
    },
  });

  if (!session) {
    throw new NotFoundError("Attendance session");
  }
  ensureCenterAccess(user, session.centerId);

  const recordIdsForSession = new Set(session.records.map((record) => record.id));
  const invalidRecordId = records.find((record) => !recordIdsForSession.has(record.recordId));
  if (invalidRecordId) {
    throw new ValidationError("All recordIds must belong to the provided sessionId");
  }

  await prisma.$transaction(
    records.map((record) =>
      prisma.attendanceRecord.update({
        where: { id: record.recordId },
        data: {
          status: record.status as AttendanceStatus,
          remarks: record.remarks ?? null,
        },
      }),
    ),
  );

  const updatedSession = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      records: true,
      center: true,
      program: true,
      activity: true,
    },
  });

  if (!updatedSession) {
    throw new NotFoundError("Attendance session");
  }

  return {
    session: updatedSession,
    completionPercentage: getCompletionPercentage(updatedSession.records),
  };
}

export async function getStudentAttendanceHistory(
  user: JwtPayload,
  studentId: string,
  query: { from?: string; to?: string; programId?: string },
): Promise<Record<string, unknown>> {
  const student = await prisma.student.findFirst({
    where: ({
      id: studentId,
      isActive: true,
      ...(user.role === "super_admin" || user.role === "tech_admin" ? {} : { centerId: { in: user.centerIds } }),
      ...(hasRole(user, "teacher") ? { createdById: user.userId } : {}),
    } as never),
    select: {
      id: true,
      centerId: true,
    },
  });

  if (!student) {
    throw new NotFoundError("Student");
  }

  const from = parseDate(query.from, "from");
  const to = parseDate(query.to, "to");

  const records = await prisma.attendanceRecord.findMany({
    where: ({
      studentId,
      ...(user.role === "super_admin" ? {} : { centerId: { in: user.centerIds } }),
      session: {
        ...(query.programId ? { programId: query.programId } : {}),
        ...((from || to)
          ? {
            sessionDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
          : {}),
      },
    } as never),
    include: {
      session: true,
      student: true,
    },
    orderBy: {
      session: {
        sessionDate: "desc",
      },
    },
  });

  const presentCount = records.filter((record) => record.status === "present").length;
  const absentCount = records.filter((record) => record.status === "absent").length;
  const lateCount = records.filter((record) => record.status === "late").length;
  const markedCount = presentCount + absentCount + lateCount;
  const attendanceRate = markedCount === 0 ? 0 : Number(((presentCount / markedCount) * 100).toFixed(2));

  return { records, attendanceRate, presentCount, absentCount, lateCount };
}

export async function getAttendanceSummary(
  user: JwtPayload,
  query: { centerId?: string; programId?: string; from?: string; to?: string },
): Promise<Record<string, unknown>> {
  const from = parseDate(query.from, "from");
  const to = parseDate(query.to, "to");
  const where: Record<string, unknown> = {};
  applyCenterScopeToWhere(user, where, query.centerId);
  if (query.programId) {
    where.programId = query.programId;
  }
  if (from || to) {
    where.sessionDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: where as never,
    include: {
      records: true,
      center: true,
      program: true,
    },
    orderBy: {
      sessionDate: "desc",
    },
  });

  const sessionStats = sessions.map((session) => {
    const present = session.records.filter((record) => record.status === "present").length;
    const absent = session.records.filter((record) => record.status === "absent").length;
    const late = session.records.filter((record) => record.status === "late").length;
    const marked = present + absent + late;
    const rate = marked === 0 ? 0 : Number(((present / marked) * 100).toFixed(2));

    return {
      sessionId: session.id,
      sessionDate: session.sessionDate,
      center: session.center,
      program: session.program,
      present,
      absent,
      late,
      total: session.records.length,
      attendanceRate: rate,
    };
  });

  const totals = sessionStats.reduce(
    (acc, item) => {
      acc.present += item.present;
      acc.absent += item.absent;
      acc.late += item.late;
      acc.total += item.total;
      return acc;
    },
    { present: 0, absent: 0, late: 0, total: 0 },
  );

  const markedTotal = totals.present + totals.absent + totals.late;
  const overallAttendanceRate =
    markedTotal === 0 ? 0 : Number(((totals.present / markedTotal) * 100).toFixed(2));

  return {
    sessions: sessionStats,
    totals,
    overallAttendanceRate,
  };
}

export async function getPendingSessions(userId: string): Promise<Array<Record<string, unknown>>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      centerAssignments: {
        select: { centerId: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundError("User");
  }

  const centerIds = user.centerAssignments.map((assignment) => assignment.centerId);

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      ...(user.role === "super_admin" ? {} : { centerId: { in: centerIds } }),
      records: {
        some: {
          status: null as unknown as AttendanceStatus,
        },
      },
    },
    include: {
      center: true,
      program: true,
      records: {
        select: { status: true },
      },
    },
    orderBy: {
      sessionDate: "desc",
    },
  });

  return sessions
    .map((session) => ({
      ...session,
      incompleteCount: session.records.filter((record) => record.status === null).length,
    }))
    .filter((session) => session.incompleteCount > 0);
}

export function parseHasIncomplete(value: unknown): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  throw new AppError("hasIncomplete must be a boolean", 422);
}

export async function getRecentAbsentees(
  user: JwtPayload,
  days: number = 7
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const centerIds = user.role === "super_admin" || user.role === "tech_admin" ? undefined : user.centerIds;

  const records = await prisma.attendanceRecord.findMany({
    where: {
      status: "absent",
      ...(teacherStudentScope(user) as object),
      session: {
        sessionDate: { gte: cutoff },
        ...(centerIds ? { centerId: { in: centerIds } } : {})
      }
    },
    include: {
      student: { select: { id: true, fullName: true, rollNumber: true, guardianPhone: true } },
      session: { select: { sessionDate: true, center: { select: { name: true } }, program: { select: { name: true } } } }
    },
    orderBy: {
      session: { sessionDate: 'desc' }
    }
  });

  return records;
}

// ─────────────────────── Long-absentee Excel report ───────────────────────
// Finds every active student whose most recent unbroken run of "absent"
// records (within the selected period) is 7+ days long — the list a
// coordinator uses to plan home visits — plus separate call-out sheets for
// those away 1/2/3+ months, and a sheet for students who have never once
// been marked present.
type AbsenteeRow = {
  studentId: string;
  fullName: string;
  standard: string;
  center: string;
  program: string;
  guardianPhone: string;
  guardianName: string;
  fromDate: Date;
  toDate: Date;
  daysCount: number;
};

function bandFor(days: number): "7d" | "1m" | "2m" | "3m" {
  if (days >= 90) return "3m";
  if (days >= 60) return "2m";
  if (days >= 30) return "1m";
  return "7d";
}

export async function generateAbsenteeReportWorkbook(
  user: JwtPayload,
  params: { year: number; months?: number[] },
): Promise<ExcelJS.Workbook> {
  const centerIds = user.role === "super_admin" || user.role === "tech_admin" ? undefined : user.centerIds;
  const { year, months } = params;

  const rangeStart = new Date(Date.UTC(year, 0, 1));
  const rangeEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const monthSet = months && months.length ? new Set(months) : null;

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      ...(centerIds ? { centerId: { in: centerIds } } : {}),
    },
    select: {
      id: true,
      fullName: true,
      standard: true,
      guardianName: true,
      guardianPhone: true,
      center: { select: { name: true } },
      program: { select: { name: true } },
    },
  });

  const studentIds = students.map((s) => s.id);
  const studentById = new Map(students.map((s) => [s.id, s]));

  const allRecords = await prisma.attendanceRecord.findMany({
    where: {
      studentId: { in: studentIds },
      status: { in: ["present", "absent", "late"] },
      session: { sessionDate: { gte: rangeStart, lte: rangeEnd } },
    },
    select: { studentId: true, status: true, session: { select: { sessionDate: true } } },
    orderBy: { session: { sessionDate: "asc" } },
  });

  const byStudent = new Map<string, { date: Date; status: string }[]>();
  for (const r of allRecords) {
    if (!r.session?.sessionDate) continue;
    if (monthSet && !monthSet.has(r.session.sessionDate.getUTCMonth() + 1)) continue;
    const list = byStudent.get(r.studentId) ?? [];
    list.push({ date: r.session.sessionDate, status: r.status });
    byStudent.set(r.studentId, list);
  }

  const longAbsentees: AbsenteeRow[] = [];
  const everPresentIds = new Set<string>();
  for (const r of allRecords) {
    if (r.status === "present" || r.status === "late") everPresentIds.add(r.studentId);
  }

  for (const [studentId, records] of byStudent.entries()) {
    // Find the most recent unbroken run of "absent" entries, walking backward.
    let runEnd = -1;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].status === "absent") {
        runEnd = i;
        break;
      }
    }
    if (runEnd === -1) continue; // no absences in this window at all

    let runStart = runEnd;
    while (runStart > 0 && records[runStart - 1].status === "absent") {
      runStart--;
    }
    const daysCount = runEnd - runStart + 1;
    if (daysCount < 7) continue;

    const s = studentById.get(studentId);
    if (!s) continue;

    longAbsentees.push({
      studentId,
      fullName: s.fullName,
      standard: s.standard || "",
      center: s.center?.name || "",
      program: s.program?.name || "",
      guardianPhone: s.guardianPhone || "",
      guardianName: s.guardianName || "",
      fromDate: records[runStart].date,
      toDate: records[runEnd].date,
      daysCount,
    });
  }

  longAbsentees.sort((a, b) => b.daysCount - a.daysCount);

  // Never-attended: active students with zero "present"/"late" records ever
  // (checked all-time, not just the filtered window — this is an onboarding
  // follow-up list, not tied to a specific month).
  const allTimePresentIds = new Set(
    (
      await prisma.attendanceRecord.findMany({
        where: { studentId: { in: studentIds }, status: { in: ["present", "late"] } },
        select: { studentId: true },
        distinct: ["studentId"],
      })
    ).map((r) => r.studentId),
  );
  const anyRecordIds = new Set(
    (
      await prisma.attendanceRecord.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true },
        distinct: ["studentId"],
      })
    ).map((r) => r.studentId),
  );
  const neverAttended = students.filter((s) => anyRecordIds.has(s.id) && !allTimePresentIds.has(s.id));

  // ── Build the workbook ──
  const wb = new ExcelJS.Workbook();
  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2B2B4A" } };
  const bandColors: Record<string, string> = { "7d": "FFFFF3CD", "1m": "FFFFE0B2", "2m": "FFFFCCBC", "3m": "FFFFCDD2" };

  const columns = [
    { header: "Full Name", key: "fullName", width: 24 },
    { header: "Standard", key: "standard", width: 10 },
    { header: "Center", key: "center", width: 18 },
    { header: "Program", key: "program", width: 16 },
    { header: "Guardian Phone", key: "guardianPhone", width: 16 },
    { header: "Guardian Name", key: "guardianName", width: 22 },
    { header: "Absent From", key: "fromDate", width: 14 },
    { header: "Absent To", key: "toDate", width: 14 },
    { header: "Days Absent", key: "daysCount", width: 12 },
  ];

  function addSheet(name: string, rows: AbsenteeRow[]) {
    const sheet = wb.addWorksheet(name);
    sheet.columns = columns as any;
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = headerFill;
    });
    for (const row of rows) {
      const band = bandFor(row.daysCount);
      const excelRow = sheet.addRow({
        fullName: row.fullName,
        standard: row.standard,
        center: row.center,
        program: row.program,
        guardianPhone: row.guardianPhone,
        guardianName: row.guardianName,
        fromDate: row.fromDate.toISOString().slice(0, 10),
        toDate: row.toDate.toISOString().slice(0, 10),
        daysCount: row.daysCount,
      });
      if (band !== "7d") {
        excelRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bandColors[band] } };
        });
      } else {
        excelRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bandColors["7d"] } };
        });
      }
    }
    sheet.autoFilter = { from: "A1", to: `I1` };
  }

  addSheet("7+ Days Absent", longAbsentees);
  addSheet("1+ Month Absent", longAbsentees.filter((r) => r.daysCount >= 30));
  addSheet("2+ Month Absent", longAbsentees.filter((r) => r.daysCount >= 60));
  addSheet("3+ Month Absent", longAbsentees.filter((r) => r.daysCount >= 90));

  const neverSheet = wb.addWorksheet("Never Attended");
  neverSheet.columns = [
    { header: "Full Name", key: "fullName", width: 24 },
    { header: "Standard", key: "standard", width: 10 },
    { header: "Center", key: "center", width: 18 },
    { header: "Program", key: "program", width: 16 },
    { header: "Guardian Phone", key: "guardianPhone", width: 16 },
    { header: "Guardian Name", key: "guardianName", width: 22 },
  ] as any;
  neverSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = headerFill;
  });
  for (const s of neverAttended) {
    neverSheet.addRow({
      fullName: s.fullName,
      standard: s.standard || "",
      center: s.center?.name || "",
      program: s.program?.name || "",
      guardianPhone: s.guardianPhone || "",
      guardianName: s.guardianName || "",
    });
  }
  neverSheet.autoFilter = { from: "A1", to: "F1" };

  return wb;
}
