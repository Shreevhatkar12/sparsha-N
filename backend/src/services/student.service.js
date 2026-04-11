import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { centerScope } from "../lib/centerScope.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../lib/errors.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = globalThis.__prismaStudentService ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaStudentService = prisma;
}

const studentCreateSchema = z.object({
  fullName: z.string().min(1),
  dob: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
    .optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  centerId: z.string().uuid(),
  programId: z.string().uuid(),
});

const studentUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  dob: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
    .optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
});

const scopedWhere = (user, otherConditions = {}) => ({
  ...centerScope(user),
  ...otherConditions,
});

/* ─────────────────────────────────────────
   STUDENTS
───────────────────────────────────────── */

export const createStudent = async (user, data) => {
  const parsed = studentCreateSchema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError("Invalid student payload", parsed.error.flatten());
  }

  const payload = parsed.data;

  if (user.role === "teacher" && !user.centerIds.includes(payload.centerId)) {
    throw new ForbiddenError("Teachers can only create students in assigned centers");
  }

  return prisma.student.create({
    data: {
      ...payload,
      dob: payload.dob ? new Date(payload.dob) : null,
    },
    include: {
      center: true,
      program: true,
    },
  });
};

export const getAllStudents = async (
  user,
  { page = 1, limit = 50, centerId, programId, isActive, search } = {},
) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const skip = (page - 1) * safeLimit;
  const where = scopedWhere(user, {
    ...(centerId ? { centerId } : {}),
    ...(programId ? { programId } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
  });

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { createdAt: "desc" },
      include: {
        center: true,
        program: true,
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { students, total, page, totalPages: Math.ceil(total / safeLimit) };
};

export const getStudentById = async (user, id) => {
  const student = await prisma.student.findFirst({
    where: scopedWhere(user, { id }),
    include: {
      center: true,
      program: true,
      attendanceRecords: {
        orderBy: { session: { sessionDate: "desc" } },
        take: 10,
      },
      examScores: true,
    },
  });

  if (!student) {
    throw new NotFoundError("Student");
  }

  return student;
};

export const updateStudent = async (user, id, data) => {
  if ("centerId" in data || "programId" in data) {
    throw new ValidationError("centerId and programId cannot be changed after creation");
  }

  const parsed = studentUpdateSchema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError("Invalid student update payload", parsed.error.flatten());
  }

  const payload = parsed.data;
  const result = await prisma.student.updateMany({
    where: scopedWhere(user, { id }),
    data: {
      ...payload,
      ...(payload.dob ? { dob: new Date(payload.dob) } : {}),
    },
  });

  if (result.count === 0) {
    throw new NotFoundError("Student");
  }

  return prisma.student.findFirst({
    where: scopedWhere(user, { id }),
    include: {
      center: true,
      program: true,
    },
  });
};

export const deleteStudent = async (user, id) => {
  const result = await prisma.student.updateMany({
    where: scopedWhere(user, { id }),
    data: { isActive: false },
  });
  if (result.count === 0) {
    throw new NotFoundError("Student");
  }
  return { message: "Student deactivated successfully" };
};

export const filterStudents = async (user, query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * safeLimit;

  const dobFilter = {};
  const today = new Date();
  if (query.ageMin) {
    const maxDob = new Date(today);
    maxDob.setFullYear(today.getFullYear() - Number(query.ageMin));
    dobFilter.lte = maxDob;
  }
  if (query.ageMax) {
    const minDob = new Date(today);
    minDob.setFullYear(today.getFullYear() - Number(query.ageMax));
    dobFilter.gte = minDob;
  }

  const where = scopedWhere(user, {
    ...(query.gender ? { gender: query.gender } : {}),
    ...(query.programId ? { programId: query.programId } : {}),
    ...(user.role === "admin" && query.centerId ? { centerId: query.centerId } : {}),
    ...(Object.keys(dobFilter).length ? { dob: dobFilter } : {}),
    ...((query.enrolledAfter || query.enrolledBefore)
      ? {
          enrollmentDate: {
            ...(query.enrolledAfter ? { gte: new Date(query.enrolledAfter) } : {}),
            ...(query.enrolledBefore ? { lte: new Date(query.enrolledBefore) } : {}),
          },
        }
      : {}),
  });

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { center: true, program: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.student.count({ where }),
  ]);

  return { students, total, page, totalPages: Math.ceil(total / safeLimit) };
};

export const getStudentSummary = async (user, id) => {
  const student = await prisma.student.findFirst({
    where: scopedWhere(user, { id }),
    include: {
      center: true,
      program: true,
      attendanceRecords: {
        include: { session: true },
      },
      examScores: {
        include: { exam: { select: { examType: true } } },
      },
      formSubmissions: true,
    },
  });

  if (!student) {
    throw new NotFoundError("Student");
  }

  const totalSessions = student.attendanceRecords.length;
  const presentCount = student.attendanceRecords.filter(
    (record) => record.status === "present",
  ).length;
  const attendancePercentage =
    totalSessions > 0 ? Number(((presentCount / totalSessions) * 100).toFixed(2)) : 0;

  const examScoresByType = student.examScores.reduce(
    (acc, score) => {
      const examType = score.exam?.examType || "unknown";
      if (!acc[examType]) {
        acc[examType] = [];
      }
      acc[examType].push(score);
      return acc;
    },
    {},
  );

  return {
    student: {
      id: student.id,
      fullName: student.fullName,
      dob: student.dob,
      gender: student.gender,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      center: student.center,
      program: student.program,
      isActive: student.isActive,
      enrollmentDate: student.enrollmentDate,
    },
    attendance: {
      present: presentCount,
      total: totalSessions,
      percentage: attendancePercentage,
    },
    examScoresByType,
    formSubmissionsCount: student.formSubmissions.length,
  };
};

/** Aggregated student dashboard payload (charts + tables) for `/students/:id/profile`. */
export const getStudentProfile = async (user, id) => {
  const student = await prisma.student.findFirst({
    where: scopedWhere(user, { id }),
    include: {
      center: true,
      program: true,
      parents: {
        include: {
          parent: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
        },
      },
      attendanceRecords: {
        include: { session: true },
        orderBy: { session: { sessionDate: "desc" } },
        take: 10,
      },
      examScores: {
        include: { exam: true },
      },
      formSubmissions: {
        include: {
          template: { select: { id: true, name: true, formType: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      },
    },
  });

  if (!student) {
    throw new NotFoundError("Student");
  }

  const records = student.attendanceRecords;
  const totalSessions = records.length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const attendancePct =
    totalSessions > 0 ? Number(((presentCount / totalSessions) * 100).toFixed(1)) : 0;

  const examScoresList = student.examScores;
  let sumPct = 0;
  let n = 0;
  for (const es of examScoresList) {
    if (es.marks == null) continue;
    sumPct += (Number(es.marks) / Number(es.maxMarks)) * 100;
    n++;
  }
  const avgExamPct = n > 0 ? Number((sumPct / n).toFixed(1)) : null;

  const attendanceTrend = [...records]
    .reverse()
    .map((r) => ({
      date: r.session.sessionDate.toISOString().slice(0, 10),
      present: r.status === "present" ? 1 : 0,
    }));

  const bySubject = {};
  for (const es of examScoresList) {
    const subj = es.subject;
    if (!bySubject[subj]) {
      bySubject[subj] = {};
    }
    const pct =
      es.marks == null ? null : (Number(es.marks) / Number(es.maxMarks)) * 100;
    const type = es.exam?.examType;
    if (type === "baseline") {
      bySubject[subj].baseline = pct;
    }
    if (type === "endline") {
      bySubject[subj].endline = pct;
    }
  }
  const examComparison = Object.entries(bySubject).map(([subject, v]) => ({
    subject,
    baseline: v.baseline ?? null,
    endline: v.endline ?? null,
  }));

  const { attendanceRecords: _ar, examScores: _ex, formSubmissions: _fs, parents, ...studentRest } =
    student;

  return {
    student: studentRest,
    stats: {
      attendancePct,
      avgExamPct,
      skillScore: null,
    },
    attendanceTrend,
    examComparison,
    skillRadar: [],
    formSubmissions: student.formSubmissions,
    parents,
  };
};

/* ─────────────────────────────────────────
   ATTENDANCE
───────────────────────────────────────── */

export const addAttendance = async (user, studentId, data) => {
  await getStudentById(user, studentId);
  return prisma.attendance.create({ data: { ...data, studentId } });
};

export const getAttendanceByStudent = async (user, studentId) => {
  await getStudentById(user, studentId);
  return prisma.attendance.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
  });
};

export const updateAttendance = async (id, data) => {
  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) {
    const error = new Error("Attendance record not found");
    error.statusCode = 404;
    throw error;
  }
  return prisma.attendance.update({ where: { id }, data });
};

/* ─────────────────────────────────────────
   SKILLS
───────────────────────────────────────── */

export const addSkill = async (user, studentId, data) => {
  await getStudentById(user, studentId);
  return prisma.skill.create({ data: { ...data, studentId } });
};

export const getSkillsByStudent = async (user, studentId) => {
  await getStudentById(user, studentId);
  return prisma.skill.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
};

export const updateSkill = async (id, data) => {
  const record = await prisma.skill.findUnique({ where: { id } });
  if (!record) {
    const error = new Error("Skill record not found");
    error.statusCode = 404;
    throw error;
  }
  return prisma.skill.update({ where: { id }, data });
};

/* ─────────────────────────────────────────
   CAREERS
───────────────────────────────────────── */

export const addCareer = async (user, studentId, data) => {
  await getStudentById(user, studentId);
  return prisma.career.create({ data: { ...data, studentId } });
};

export const getCareersByStudent = async (user, studentId) => {
  await getStudentById(user, studentId);
  return prisma.career.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
};

export const updateCareer = async (id, data) => {
  const record = await prisma.career.findUnique({ where: { id } });
  if (!record) {
    const error = new Error("Career record not found");
    error.statusCode = 404;
    throw error;
  }
  return prisma.career.update({ where: { id }, data });
};

/* ─────────────────────────────────────────
   DASHBOARD SUMMARY
───────────────────────────────────────── */

export const getDashboardStats = async () => {
  const [totalStudents, totalAttendance, presentCount, skillAggregates] =
    await Promise.all([
      prisma.student.count(),
      prisma.attendance.count(),
      prisma.attendance.count({ where: { status: "present" } }),
      prisma.skill.aggregate({
        _avg: {
          communication: true,
          confidence: true,
          computerSkill: true,
          problemSolving: true,
          languageSkill: true,
        },
      }),
    ]);

  const attendanceRate =
    totalAttendance > 0
      ? ((presentCount / totalAttendance) * 100).toFixed(1)
      : 0;

  return {
    totalStudents,
    totalSessions: totalAttendance,
    attendanceRate: `${attendanceRate}%`,
    avgSkills: skillAggregates._avg,
  };
};