import prisma from '../lib/prisma.js';
import { z } from "zod";
import type { AuthUser } from '../types/index.js';
import { centerScope } from '../lib/centerScope.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';

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

const scopedWhere = (user: AuthUser, otherConditions: Record<string, unknown> = {}) => ({
  ...centerScope(user),
  ...otherConditions,
});

/* ─────────────────────────────────────────
   STUDENTS
───────────────────────────────────────── */

export const createStudent = async (user: AuthUser, data: any) => {
  const parsed = studentCreateSchema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError("Invalid student payload", parsed.error.flatten());
  }

  const payload = parsed.data;

  if (user.role !== 'super_admin') {
    if (!user.centerIds || user.centerIds.length === 0) {
      throw new ForbiddenError("You must be assigned to a center to create students");
    }
    // Override payload centerId from token explicitly
    payload.centerId = user.centerIds[0];
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

export const getAllStudents = async (user: AuthUser, { page = 1, limit = 50, centerId, programId, isActive, search, sortOrder }: Record<string, any> = {}) => {
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
      orderBy: sortOrder === 'name_asc' ? { fullName: 'asc' } :
               sortOrder === 'name_desc' ? { fullName: 'desc' } :
               sortOrder === 'roll_asc' ? { rollNumber: 'asc' } :
               sortOrder === 'roll_desc' ? { rollNumber: 'desc' } :
               { createdAt: "desc" },
      include: {
        center: true,
        program: true,
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { students, total, page, totalPages: Math.ceil(total / safeLimit) };
};

export const getStudentById = async (user: AuthUser, id: string) => {
  const student = await prisma.student.findUnique({
    where: { id },
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

  if (user.role !== 'super_admin' && !user.centerIds.includes(student.centerId)) {
    throw new ForbiddenError("Cannot access student from another center");
  }

  return student;
};

export const updateStudent = async (user: AuthUser, id: string, data: any) => {
  if (typeof data === "object" && data !== null && ("centerId" in data || "programId" in data)) {
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

export const deleteStudent = async (user: AuthUser, id: string) => {
  const result = await prisma.student.updateMany({
    where: scopedWhere(user, { id }),
    data: { isActive: false },
  });
  if (result.count === 0) {
    throw new NotFoundError("Student");
  }
  return { message: "Student deactivated successfully" };
};

export const filterStudents = async (user: AuthUser, query: Record<string, any> = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  const skip = (page - 1) * safeLimit;

  const dobFilter: { lte?: Date; gte?: Date } = {};
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
    ...(user?.role === "admin" && query.centerId ? { centerId: query.centerId } : {}),
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

export const getStudentSummary = async (user: AuthUser, id: string) => {
  const student = await prisma.student.findFirst({
    where: scopedWhere(user, { id }),
    include: {
      center: true,
      program: true,
      attendanceRecords: {
        include: { session: true },
        orderBy: { session: { sessionDate: "desc" } },
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

  const examScoresByType = student.examScores.reduce((acc: Record<string, any[]>, score) => {
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
export const getStudentProfile = async (user: AuthUser, id: string) => {
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
        include: { exam: true, subject: true },
      },
      formSubmissions: {
        include: {
          template: { select: { id: true, name: true, formType: true } },
        },
        orderBy: { submittedAt: "desc" },
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
    if (es.marks == null || !es.subject?.maxMarks) continue;
    sumPct += (Number(es.marks) / Number(es.subject.maxMarks)) * 100;
    n++;
  }
  const avgExamPct = n > 0 ? Number((sumPct / n).toFixed(1)) : null;

  const groupedTrend = [...records].reverse().reduce((acc, r) => {
    const d = r.session.sessionDate.toISOString().slice(0, 10);
    if (!acc[d]) {
      acc[d] = { date: d, present: r.status === "present" ? 1 : 0 };
    } else {
      acc[d].present = Math.max(acc[d].present, r.status === "present" ? 1 : 0);
    }
    return acc;
  }, {} as Record<string, { date: string; present: number }>);

  const attendanceTrend = Object.values(groupedTrend);

  const bySubject: Record<string, any> = {};
  for (const es of examScoresList) {
    if (!es.subject) continue;
    const subj = es.subject.name;
    if (!bySubject[subj]) {
      bySubject[subj] = {};
    }
    const pct =
      (es.marks == null || !es.subject.maxMarks) ? null : (Number(es.marks) / Number(es.subject.maxMarks)) * 100;
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

export const addAttendance = async (user: AuthUser, studentId: string, data: any) => {
  await getStudentById(user, studentId);
  return prisma.attendanceRecord.create({ data: { ...data, studentId } });
};

export const getAttendanceByStudent = async (user: AuthUser, studentId: string) => {
  await getStudentById(user, studentId);
  return prisma.attendanceRecord.findMany({
    where: { studentId },
    orderBy: { session: { sessionDate: "desc" } },
  });
};

export const updateAttendance = async (id: string, data: any) => {
  const record = await prisma.attendanceRecord.findUnique({ where: { id } });
  if (!record) {
    throw new NotFoundError("Attendance record");
  }
  return prisma.attendanceRecord.update({ where: { id }, data });
};

/* ─────────────────────────────────────────
   SKILLS (STUBBED - Model missing from schema)
───────────────────────────────────────── */

export const addSkill = async (user: AuthUser, studentId: string, data: any) => {
  const student = await getStudentById(user, studentId);
  return prisma.studentSkillLog.create({
    data: {
      studentId: student.id,
      centerId: student.centerId,
      skillId: data.skillId,
      level: data.level,
      remarks: data.remarks,
      assessedBy: user.id,
    },
    include: { skill: true, assessedByUser: { select: { fullName: true } } },
  });
};

export const getSkillsByStudent = async (user: AuthUser, studentId: string) => {
  const student = await getStudentById(user, studentId);
  return prisma.studentSkillLog.findMany({
    where: { studentId: student.id },
    include: { skill: true, assessedByUser: { select: { fullName: true } } },
    orderBy: { assessedOn: "desc" },
  });
};

export const updateSkill = async (id: string, data: any) => {
  const log = await prisma.studentSkillLog.findUnique({ where: { id } });
  if (!log) throw new NotFoundError("Skill log");
  return prisma.studentSkillLog.update({
    where: { id },
    data: { level: data.level, remarks: data.remarks },
    include: { skill: true, assessedByUser: { select: { fullName: true } } },
  });
};

/* ─────────────────────────────────────────
   CAREERS (STUBBED - Model missing from schema)
───────────────────────────────────────── */

export const addCareer = async (user: AuthUser, studentId: string, data: any) => {
  const student = await getStudentById(user, studentId);
  
  let template = await prisma.formTemplate.findFirst({ where: { name: "Career Tracking", targetEntity: "student" } });
  if (!template) {
    template = await prisma.formTemplate.create({
      data: {
        name: "Career Tracking",
        formType: "system",
        targetEntity: "student",
        createdBy: user.id,
        schema: { fields: [] }
      }
    });
  }

  const submission = await prisma.formSubmission.create({
    data: {
      templateId: template.id,
      studentId: student.id,
      centerId: student.centerId,
      submittedBy: user.id,
      data: data
    }
  });

  return {
    id: submission.id,
    studentId: submission.studentId,
    createdAt: submission.submittedAt,
    ...(submission.data as Record<string, unknown>)
  };
};

export const getCareersByStudent = async (user: AuthUser, studentId: string) => {
  const student = await getStudentById(user, studentId);
  const template = await prisma.formTemplate.findFirst({ where: { name: "Career Tracking" } });
  if (!template) return [];

  const submissions = await prisma.formSubmission.findMany({
    where: { studentId: student.id, templateId: template.id },
    orderBy: { submittedAt: 'desc' }
  });
  
  return submissions.map(sub => ({
    id: sub.id,
    studentId: sub.studentId,
    createdAt: sub.submittedAt,
    ...(sub.data as Record<string, unknown>)
  }));
};

export const updateCareer = async (id: string, data: any) => {
  const submission = await prisma.formSubmission.findUnique({ where: { id } });
  if (!submission) throw new NotFoundError("Career record");
  
  const updated = await prisma.formSubmission.update({
    where: { id },
    data: { data }
  });

  return {
    id: updated.id,
    studentId: updated.studentId,
    createdAt: updated.submittedAt,
    ...(updated.data as Record<string, unknown>)
  };
};

/* ─────────────────────────────────────────
   DASHBOARD SUMMARY
───────────────────────────────────────── */

export const getDashboardStats = async () => {
  const [totalStudents, totalAttendance, presentCount] = await Promise.all([
    prisma.student.count(),
    prisma.attendanceRecord.count(),
    prisma.attendanceRecord.count({ where: { status: "present" } }),
  ]);

  const attendanceRate =
    totalAttendance > 0 ? Number(((presentCount / totalAttendance) * 100).toFixed(1)) : 0;

  return {
    totalStudents,
    totalSessions: totalAttendance,
    attendanceRate: `${attendanceRate}%`,
    avgSkills: {
      communication: 0,
      confidence: 0,
      computerSkill: 0,
      problemSolving: 0,
      languageSkill: 0,
    },
  };
};