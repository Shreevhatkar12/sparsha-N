import { Prisma, UserRole } from "@prisma/client";
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import prisma from "../lib/prisma.js";
import type { JwtPayload } from "../lib/auth.js";

// ================= TYPES =================

type CreateExamInput = {
  centerIds: string[];
  programId: string;
  examType: string;
  academicYearId: string;
  examDate?: string;
  name?: string;
  subjectId?: string;
};

type ListExamQuery = {
  centerId?: string;
  programId?: string;
  examType?: string;
  academicYearId?: string;
};

// ================= HELPERS =================

function enforceCenterAccess(user: JwtPayload, centerId: string) {
  // super_admin and tech_admin can access all centers
  if (user.role === UserRole.super_admin || user.role === UserRole.tech_admin) {
    return;
  }
  // All other roles must be assigned to the center
  if (!user.centerIds.includes(centerId)) {
    throw new ForbiddenError("Unauthorized access to this center");
  }
}

function applyCenterFilter(user: JwtPayload, where: any) {
  // super_admin and tech_admin see all centers
  if (user.role === UserRole.super_admin || user.role === UserRole.tech_admin) {
    return;
  }
  where.centerId = {
    in: user.centerIds,
  };
}

// ================= CREATE EXAM =================

export const createExam = async (user: JwtPayload, data: CreateExamInput) => {
  // 1. Resolve academicYearId (could be UUID or label like "2025-26")
  let academicYearId = data.academicYearId;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (academicYearId && !uuidRegex.test(academicYearId)) {
    const ay = await prisma.academicYear.findFirst({ where: { label: academicYearId } });
    if (!ay) {
      // Auto-create the academic year if it doesn't exist
      const parts = academicYearId.split('-');
      const startYear = parseInt(parts[0]);
      const created = await prisma.academicYear.create({
        data: {
          label: academicYearId,
          startDate: new Date(`${startYear}-04-01`),
          endDate: new Date(`${startYear + 1}-03-31`),
        },
      });
      academicYearId = created.id;
    } else {
      academicYearId = ay.id;
    }
  }

  // Admin creates the exam — no score rows pre-created.
  // Teachers will add subjects dynamically when entering marks.
  const createdExams = [];

  for (const centerId of data.centerIds) {
    enforceCenterAccess(user, centerId);

    const exam = await prisma.exam.create({
      data: {
        name: data.name || `${data.examType} - ${new Date().toLocaleDateString()}`,
        examType: data.examType,
        centerId: centerId,
        programId: data.programId,
        academicYearId: academicYearId,
        examDate: data.examDate ? new Date(data.examDate) : new Date(),
        createdBy: user.userId,
        status: "DRAFT",
      },
      include: { center: true, program: true, academicYear: true },
    });

    createdExams.push(exam);
  }

  return createdExams;
};

// ================= GET EXAM SHEET (WITH SYNC) =================

export async function getExamSheet(user: JwtPayload, examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { center: true, program: true, academicYear: true },
  });

  if (!exam) throw new NotFoundError("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  // 1. Get all active students for this center+program
  const students = await prisma.student.findMany({
    where: {
      centerId: exam.centerId,
      programId: exam.programId,
      isActive: true,
    },
    select: { id: true, fullName: true, rollNumber: true },
    orderBy: { fullName: "asc" },
  });

  // 2. Get existing scores with subject info
  const scores = await prisma.examScore.findMany({
    where: { examId: exam.id },
    include: {
      student: {
        select: { id: true, fullName: true, rollNumber: true },
      },
      subject: true,
    },
    orderBy: { student: { fullName: "asc" } },
  });

  // 3. Return exam + students + scores separately
  //    Frontend uses students[] for row rendering, scores[] for filling marks
  return {
    ...exam,
    students,
    scores,
  };
}

// ================= LIST EXAMS =================

export async function listExams(user: JwtPayload, query: ListExamQuery) {
  const where: any = {};

  applyCenterFilter(user, where);

  // If a specific centerId is requested, use it (but only if user has access)
  if (query.centerId) {
    // For scoped users, verify they have access to the requested center
    if (user.role !== UserRole.super_admin && user.role !== UserRole.tech_admin) {
      if (!user.centerIds.includes(query.centerId)) {
        return []; // No access to this center
      }
    }
    where.centerId = query.centerId;
  }
  if (query.programId) where.programId = query.programId;
  if (query.examType) where.examType = query.examType;

  // 🔥 Update: Handle UUID vs Label for Academic Year in List view
  if (query.academicYearId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(query.academicYearId)) {
      where.academicYearId = query.academicYearId;
    } else {
      const year = await prisma.academicYear.findFirst({
        where: { label: query.academicYearId }
      });
      if (year) {
        where.academicYearId = year.id;
      } else {
        // If label doesn't exist, return empty array to prevent 500 error
        return [];
      }
    }
  }

  const exams = await prisma.exam.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      academicYear: true,
      program: true,
      center: true
    },
  });

  return exams;
}

// ================= GET EXAM BY ID =================

export async function getExamById(user: JwtPayload, examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      scores: {
        include: {
          subject: true,
          student: true,
        },
      },
      academicYear: true,
      program: true,
    },
  });

  if (!exam) throw new NotFoundError("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  return exam;
}

// ================= UPSERT SCORES =================

export async function upsertExamScores(
  user: JwtPayload,
  examId: string,
  input: { scores: any[] },
) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { program: { include: { subjects: true } } },
  });

  if (!exam) throw new NotFoundError("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  // Build subject lookup: id → id, name → id
  const subjectMap = new Map<string, string>();
  exam.program?.subjects.forEach((s) => {
    subjectMap.set(s.id, s.id);
    subjectMap.set(s.name.toLowerCase(), s.id);
  });

  // Resolve each score's subjectId — auto-create if subject name is new
  const processedScores = [];
  for (const s of input.scores) {
    let subjectId = s.subjectId && subjectMap.has(s.subjectId)
      ? s.subjectId
      : subjectMap.get((s.subject || "").toLowerCase());

    // Auto-create subject if it doesn't exist yet
    if (!subjectId && s.subject && exam.programId) {
      const newSubject = await prisma.programSubject.upsert({
        where: {
          programId_name: {
            programId: exam.programId,
            name: s.subject,
          },
        },
        update: {},
        create: {
          programId: exam.programId,
          name: s.subject,
          maxMarks: s.maxMarks || 100,
        },
      });
      subjectId = newSubject.id;
      subjectMap.set(newSubject.id, newSubject.id);
      subjectMap.set(newSubject.name.toLowerCase(), newSubject.id);
    }

    if (!subjectId) {
      throw new Error(`Subject '${s.subject || s.subjectId}' could not be resolved`);
    }

    // Safely convert marks
    let marks: Prisma.Decimal | null = null;
    if (s.marks != null && s.marks !== "" && !s.isAbsent) {
      marks = new Prisma.Decimal(s.marks);
    }

    processedScores.push({
      studentId: s.studentId,
      subjectId,
      marks,
      isAbsent: s.isAbsent || false,
      remarks: s.remarks,
    });
  }

  await prisma.$transaction(
    processedScores.map((score) =>
      prisma.examScore.upsert({
        where: {
          examId_studentId_subjectId: {
            examId,
            studentId: score.studentId,
            subjectId: score.subjectId,
          },
        },
        update: {
          marks: score.marks,
          isAbsent: score.isAbsent,
          remarks: score.remarks ?? null,
        },
        create: {
          examId,
          studentId: score.studentId,
          subjectId: score.subjectId,
          centerId: exam.centerId,
          marks: score.marks,
          isAbsent: score.isAbsent,
          remarks: score.remarks ?? null,
          enteredBy: user.userId,
          status: "DRAFT",
        },
      }),
    ),
  );

  return { success: true };
}

// ================= PENDING SCORES =================

export async function getPendingExamScores(
  user: JwtPayload,
  examId: string,
) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) throw new NotFoundError("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  const students = await prisma.student.findMany({
    where: {
      centerId: exam.centerId,
      programId: exam.programId,
      isActive: true
    },
  });

  const subjects = await prisma.programSubject.findMany({
    where: {
      programId: exam.programId,
    },
  });

  const existingScores = await prisma.examScore.findMany({
    where: { examId },
  });

  const existingSet = new Set(
    existingScores.map((s) => `${s.studentId}-${s.subjectId}`),
  );

  const pending: any[] = [];

  for (const student of students) {
    for (const subject of subjects) {
      const key = `${student.id}-${subject.id}`;
      if (!existingSet.has(key)) {
        pending.push({
          studentId: student.id,
          subjectId: subject.id,
          subjectName: subject.name,
        });
      }
    }
  }

  return pending;
}

// ================= EXAM COMPARISON =================

export async function getExamComparison(
  user: JwtPayload,
  query: ListExamQuery,
) {
  const where: any = {};

  applyCenterFilter(user, where);

  if (query.centerId) where.centerId = query.centerId;
  if (query.programId) where.programId = query.programId;

  if (query.academicYearId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(query.academicYearId)) {
      where.academicYearId = query.academicYearId;
    } else {
      const year = await prisma.academicYear.findFirst({
        where: { label: query.academicYearId }
      });
      if (year) {
        where.academicYearId = year.id;
      } else {
        return { perSubject: [] };
      }
    }
  }

  const exams = await prisma.exam.findMany({
    where,
    include: {
      scores: {
        include: {
          subject: true,
        },
      },
    },
  });

  const subjectMap: Record<
    string,
    { baselineTotal: number; baselineCount: number; endlineTotal: number; endlineCount: number }
  > = {};

  for (const exam of exams) {
    for (const score of exam.scores) {
      const subjectName = score.subject.name.toLowerCase();
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { baselineTotal: 0, baselineCount: 0, endlineTotal: 0, endlineCount: 0 };
      }

      const val = score.marks ? Number(score.marks) : 0;
      if (exam.examType.toLowerCase() === 'baseline') {
        subjectMap[subjectName].baselineTotal += val;
        subjectMap[subjectName].baselineCount++;
      } else if (exam.examType.toLowerCase() === 'endline') {
        subjectMap[subjectName].endlineTotal += val;
        subjectMap[subjectName].endlineCount++;
      }
    }
  }

  const perSubject = Object.entries(subjectMap).map(([subject, data]) => {
    const bAvg = data.baselineCount > 0 ? data.baselineTotal / data.baselineCount : 0;
    const eAvg = data.endlineCount > 0 ? data.endlineTotal / data.endlineCount : 0;
    const growth = bAvg > 0 ? ((eAvg - bAvg) / bAvg) * 100 : 0;

    return {
      subject,
      baselineAvg: bAvg,
      endlineAvg: eAvg,
      growth,
    };
  });

  return { perSubject };
}

// ================= STUDENT SCORES =================

export async function getStudentExamScores(
  user: JwtPayload,
  studentId: string,
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) throw new NotFoundError("Student not found");

  enforceCenterAccess(user, student.centerId);

  const scores = await prisma.examScore.findMany({
    where: { studentId },
    include: {
      exam: true,
      subject: true,
    },
    orderBy: {
      exam: {
        createdAt: "desc",
      },
    },
  });

  return scores;
}