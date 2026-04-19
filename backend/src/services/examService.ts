import { Prisma, ExamType, UserRole } from "@prisma/client";
import prisma from "../lib/prisma.js";
import type { JwtPayload } from "../lib/auth.js";

// ================= TYPES =================

type CreateExamInput = {
  centerId: string;
  programId: string;
  examType: ExamType;
  academicYear: string; // academicYearId
  examDate?: string;
};

type ListExamQuery = {
  centerId?: string;
  programId?: string;
  examType?: ExamType;
  academicYearId?: string; // academicYearId
};

type ScoreInput = {
  studentId: string;
  subjectId: string;
  marks: number;
  remarks?: string;
};

// ================= HELPERS =================

function enforceCenterAccess(user: JwtPayload, centerId: string) {
  if (
    user.role !== UserRole.super_admin &&
    !user.centerIds.includes(centerId)
  ) {
    throw new Error("Unauthorized");
  }
}

function applyCenterFilter(user: JwtPayload, where: any) {
  if (user.role !== UserRole.super_admin) {
    where.centerId = {
      in: user.centerIds,
    };
  }
}

// ================= CREATE EXAM =================

export async function createExam(user: JwtPayload, input: CreateExamInput) {
  enforceCenterAccess(user, input.centerId);

  const existing = await prisma.exam.findFirst({
    where: {
      centerId: input.centerId,
      programId: input.programId,
      examType: input.examType,
      academicYearId: input.academicYear,
    },
  });

  if (existing) {
    return { created: false, exam: existing };
  }

  const exam = await prisma.exam.create({
    data: {
      centerId: input.centerId,
      programId: input.programId,
      examType: input.examType,
      academicYearId: input.academicYear,
      examDate: input.examDate ? new Date(input.examDate) : null,
      name: `${input.examType} exam`,
      createdBy: user.userId,
    },
  });

  return { created: true, exam };
}

// ================= LIST EXAMS =================

export async function listExams(user: JwtPayload, query: ListExamQuery) {
  const where: any = {};

  applyCenterFilter(user, where);

  if (query.centerId) where.centerId = query.centerId;
  if (query.programId) where.programId = query.programId;
  if (query.examType) where.examType = query.examType;
  if (query.academicYearId) where.academicYearId = query.academicYearId;

  const exams = await prisma.exam.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      academicYear: true,
      program: true,
    },
  });

  return exams;
}

// ================= GET EXAM =================

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

  if (!exam) throw new Error("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  return exam;
}

// ================= UPSERT SCORES =================

export async function upsertExamScores(
  user: JwtPayload,
  examId: string,
  scores: ScoreInput[],
) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) throw new Error("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  await prisma.$transaction(
    scores.map((score) =>
      prisma.examScore.upsert({
        where: {
          examId_studentId_subjectId: {
            examId,
            studentId: score.studentId,
            subjectId: score.subjectId,
          },
        },
        update: {
          marks: new Prisma.Decimal(score.marks),
          remarks: score.remarks ?? null,
        },
        create: {
          examId,
          studentId: score.studentId,
          subjectId: score.subjectId,
          centerId: exam.centerId,
          marks: new Prisma.Decimal(score.marks),
          remarks: score.remarks ?? null,
          enteredBy: user.userId,
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

  if (!exam) throw new Error("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  const students = await prisma.student.findMany({
    where: {
      centerId: exam.centerId,
      programId: exam.programId,
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

  const pending: {
    studentId: string;
    subjectId: string;
    subjectName: string;
  }[] = [];

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
  if (query.academicYearId) where.academicYearId = query.academicYearId;

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

  const result: Record<
    string,
    { examType: string; marks: number }[]
  > = {};

  for (const exam of exams) {
    for (const score of exam.scores) {
      const subjectKey = score.subject.name.toLowerCase();

      if (!result[subjectKey]) result[subjectKey] = [];

      result[subjectKey].push({
        examType: exam.examType,
        marks: score.marks ? score.marks.toNumber() : 0,
      });
    }
  }

  return result;
}

// ================= STUDENT SCORES =================

export async function getStudentExamScores(
  user: JwtPayload,
  studentId: string,
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) throw new Error("Student not found");

  enforceCenterAccess(user, student.centerId);

  const scores = await prisma.examScore.findMany({
    where: { studentId },
    include: {
      exam: true,
      subject: true,
    },
    orderBy: {
      exam: {
        academicYearId: "desc",
      },
    },
  });

  return scores;
}