import { ExamType, Prisma } from "@prisma/client";
import type { JwtPayload } from '../lib/auth.js';
import prisma from '../lib/prisma.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';

const SWAYAM_SUBJECTS = ["english", "science", "maths"] as const;

type CreateExamInput = {
  centerId: string;
  programId: string;
  examType: "baseline" | "endline";
  academicYear: string;
  examDate?: string;
};

type ScoreInput = {
  studentId: string;
  subject: string;
  marks: number;
  maxMarks?: number;
  remarks?: string;
};

function ensureCenterAccess(user: JwtPayload, centerId: string): void {
  if (user.role !== "admin" && !user.centerIds.includes(centerId)) {
    throw new ForbiddenError("No access to the requested center");
  }
}

function centerScopedFilter(
  user: JwtPayload,
  centerId?: string,
): string | { in: string[] } | undefined {
  if (user.role === "admin") {
    return centerId;
  }
  if (centerId) {
    return user.centerIds.includes(centerId) ? centerId : { in: [] };
  }
  return { in: user.centerIds };
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("Invalid examDate");
  }
  return date;
}

function completion(totalStudents: number, studentsScored: number): number {
  if (totalStudents === 0) return 0;
  return Number(((studentsScored / totalStudents) * 100).toFixed(2));
}

export async function createExam(user: JwtPayload, input: CreateExamInput) {
  ensureCenterAccess(user, input.centerId);
  const examDate = parseDate(input.examDate);

  const existing = await prisma.exam.findFirst({
    where: {
      centerId: input.centerId,
      programId: input.programId,
      examType: input.examType as ExamType,
      academicYear: input.academicYear,
    },
    include: { center: true, program: true },
  });

  if (existing) {
    return { created: false, exam: existing };
  }

  const exam = await prisma.exam.create({
    data: {
      centerId: input.centerId,
      programId: input.programId,
      examType: input.examType as ExamType,
      academicYear: input.academicYear,
      examDate,
      createdBy: user.userId,
    },
    include: { center: true, program: true },
  });

  return { created: true, exam };
}

export async function listExams(
  user: JwtPayload,
  query: {
    centerId?: string;
    programId?: string;
    examType?: "baseline" | "endline";
    academicYear?: string;
  },
) {
  const exams = await prisma.exam.findMany({
    where: {
      centerId: centerScopedFilter(user, query.centerId),
      ...(query.programId ? { programId: query.programId } : {}),
      ...(query.examType ? { examType: query.examType as ExamType } : {}),
      ...(query.academicYear ? { academicYear: query.academicYear } : {}),
    },
    include: {
      center: true,
      program: true,
    },
    orderBy: { academicYear: "desc" },
  });

  const examRows = await Promise.all(
    exams.map(async (exam) => {
      const [totalStudents, scoreRows] = await Promise.all([
        prisma.student.count({
          where: {
            centerId: exam.centerId,
            programId: exam.programId,
            isActive: true,
          },
        }),
        prisma.examScore.findMany({
          where: { examId: exam.id },
          select: { studentId: true },
        }),
      ]);
      const studentsScored = new Set(scoreRows.map((score) => score.studentId)).size;
      return {
        ...exam,
        totalStudents,
        studentsScored,
        completionPercentage: completion(totalStudents, studentsScored),
      };
    }),
  );

  return { exams: examRows };
}

export async function getExamById(user: JwtPayload, examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      center: true,
      program: true,
      scores: true,
    },
  });

  if (!exam) throw new NotFoundError("Exam");
  ensureCenterAccess(user, exam.centerId);

  const students = await prisma.student.findMany({
    where: {
      centerId: exam.centerId,
      programId: exam.programId,
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      centerId: true,
      programId: true,
      isActive: true,
    },
    orderBy: { fullName: "asc" },
  });

  const scoresByStudent = new Map<string, Array<{
    subject: string;
    marks: Prisma.Decimal | null;
    maxMarks: Prisma.Decimal;
    remarks: string | null;
  }>>();

  for (const score of exam.scores) {
    const existing = scoresByStudent.get(score.studentId) ?? [];
    existing.push({
      subject: score.subject,
      marks: score.marks,
      maxMarks: score.maxMarks,
      remarks: score.remarks,
    });
    scoresByStudent.set(score.studentId, existing);
  }

  return {
    exam: {
      id: exam.id,
      center: exam.center,
      program: exam.program,
      examType: exam.examType,
      academicYear: exam.academicYear,
      examDate: exam.examDate,
    },
    students: students.map((student) => ({
      student,
      scores: scoresByStudent.get(student.id) ?? [],
    })),
  };
}

export async function upsertExamScores(
  user: JwtPayload,
  examId: string,
  payload: { scores: ScoreInput[] },
) {
  if (!Array.isArray(payload.scores) || payload.scores.length === 0) {
    throw new ValidationError("scores array is required");
  }

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new NotFoundError("Exam");
  ensureCenterAccess(user, exam.centerId);

  for (const score of payload.scores) {
    const maxMarks = score.maxMarks ?? 50;
    if (score.marks > maxMarks) {
      throw new ValidationError(`marks cannot exceed maxMarks for ${score.subject}`);
    }
    if (!score.subject || typeof score.subject !== "string") {
      throw new ValidationError("subject is required");
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const score of payload.scores) {
      const maxMarks = score.maxMarks ?? 50;
      const subjectKey = score.subject.toLowerCase();
      await tx.examScore.upsert({
        where: {
          examId_studentId_subject: {
            examId,
            studentId: score.studentId,
            subject: subjectKey,
          },
        },
        update: {
          marks: new Prisma.Decimal(score.marks),
          maxMarks: new Prisma.Decimal(maxMarks),
          remarks: score.remarks ?? null,
        },
        create: {
          examId,
          studentId: score.studentId,
          centerId: exam.centerId,
          subject: subjectKey,
          marks: new Prisma.Decimal(score.marks),
          maxMarks: new Prisma.Decimal(maxMarks),
          remarks: score.remarks ?? null,
        },
      });
    }
  });

  const [totalStudents, scoreRows] = await Promise.all([
    prisma.student.count({
      where: { centerId: exam.centerId, programId: exam.programId, isActive: true },
    }),
    prisma.examScore.findMany({
      where: { examId },
      select: { studentId: true },
    }),
  ]);

  const studentsScored = new Set(scoreRows.map((row) => row.studentId)).size;
  return {
    examId,
    totalStudents,
    studentsScored,
    completionPercentage: completion(totalStudents, studentsScored),
  };
}

export async function getPendingExamScores(user: JwtPayload, examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { program: true },
  });
  if (!exam) throw new NotFoundError("Exam");
  ensureCenterAccess(user, exam.centerId);

  const students = await prisma.student.findMany({
    where: { centerId: exam.centerId, programId: exam.programId, isActive: true },
    select: { id: true, fullName: true, centerId: true, programId: true },
    orderBy: { fullName: "asc" },
  });

  const existingScores = await prisma.examScore.findMany({
    where: { examId },
    select: { studentId: true, subject: true },
  });

  const subjects = [...SWAYAM_SUBJECTS];
  const subjectSetByStudent = new Map<string, Set<string>>();
  for (const row of existingScores) {
    const set = subjectSetByStudent.get(row.studentId) ?? new Set<string>();
    set.add(row.subject.toLowerCase());
    subjectSetByStudent.set(row.studentId, set);
  }

  return students.map((student) => {
    const studentSubjects = subjectSetByStudent.get(student.id) ?? new Set<string>();
    const missingSubs = subjects.filter((subject) => !studentSubjects.has(subject));
    return { student, missingSubs };
  });
}

export async function getExamComparison(
  user: JwtPayload,
  query: { centerId?: string; programId?: string; academicYear?: string },
) {
  if (!query.academicYear) {
    throw new ValidationError("academicYear is required");
  }

  const exams = await prisma.exam.findMany({
    where: {
      centerId: centerScopedFilter(user, query.centerId),
      ...(query.programId ? { programId: query.programId } : {}),
      academicYear: query.academicYear,
      examType: { in: ["baseline", "endline"] },
    },
    select: {
      id: true,
      examType: true,
    },
  });

  const baselineIds = exams.filter((e) => e.examType === "baseline").map((e) => e.id);
  const endlineIds = exams.filter((e) => e.examType === "endline").map((e) => e.id);

  if (baselineIds.length === 0 || endlineIds.length === 0) {
    return { perSubject: [], perStudent: [] };
  }

  const [baselineScores, endlineScores] = await Promise.all([
    prisma.examScore.findMany({
      where: { examId: { in: baselineIds } },
      include: { student: true },
    }),
    prisma.examScore.findMany({
      where: { examId: { in: endlineIds } },
      include: { student: true },
    }),
  ]);

  const baselineBySubject = new Map<string, number[]>();
  const endlineBySubject = new Map<string, number[]>();
  const baselineByStudent = new Map<string, number>();
  const endlineByStudent = new Map<string, number>();
  const studentInfo = new Map<string, { id: string; fullName: string }>();

  for (const row of baselineScores) {
    const marks = row.marks ? Number(row.marks) : 0;
    const key = row.subject.toLowerCase();
    baselineBySubject.set(key, [...(baselineBySubject.get(key) ?? []), marks]);
    baselineByStudent.set(row.studentId, (baselineByStudent.get(row.studentId) ?? 0) + marks);
    studentInfo.set(row.studentId, { id: row.student.id, fullName: row.student.fullName });
  }
  for (const row of endlineScores) {
    const marks = row.marks ? Number(row.marks) : 0;
    const key = row.subject.toLowerCase();
    endlineBySubject.set(key, [...(endlineBySubject.get(key) ?? []), marks]);
    endlineByStudent.set(row.studentId, (endlineByStudent.get(row.studentId) ?? 0) + marks);
    studentInfo.set(row.studentId, { id: row.student.id, fullName: row.student.fullName });
  }

  const commonSubjects = [...baselineBySubject.keys()].filter((s) => endlineBySubject.has(s));
  const perSubject = commonSubjects.map((subject) => {
    const b = baselineBySubject.get(subject) ?? [];
    const e = endlineBySubject.get(subject) ?? [];
    const baselineAvg = b.length ? b.reduce((a, n) => a + n, 0) / b.length : 0;
    const endlineAvg = e.length ? e.reduce((a, n) => a + n, 0) / e.length : 0;
    return {
      subject,
      baselineAvg: Number(baselineAvg.toFixed(2)),
      endlineAvg: Number(endlineAvg.toFixed(2)),
      improvement: Number((endlineAvg - baselineAvg).toFixed(2)),
    };
  });

  const perStudent = [...baselineByStudent.keys()]
    .filter((id) => endlineByStudent.has(id))
    .map((studentId) => {
      const baselineTotal = baselineByStudent.get(studentId) ?? 0;
      const endlineTotal = endlineByStudent.get(studentId) ?? 0;
      return {
        student: studentInfo.get(studentId),
        baselineTotal: Number(baselineTotal.toFixed(2)),
        endlineTotal: Number(endlineTotal.toFixed(2)),
        delta: Number((endlineTotal - baselineTotal).toFixed(2)),
      };
    });

  return { perSubject, perStudent };
}

export async function getStudentExamScores(
  user: JwtPayload,
  studentId: string,
) {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      centerId: centerScopedFilter(user),
    },
    select: { id: true, fullName: true },
  });
  if (!student) throw new NotFoundError("Student");

  const scores = await prisma.examScore.findMany({
    where: { studentId },
    include: {
      exam: true,
    },
    orderBy: [{ exam: { academicYear: "desc" } }, { exam: { examType: "asc" } }],
  });

  const grouped: Record<string, Record<string, Array<{
    subject: string;
    marks: number | null;
    maxMarks: number;
    remarks: string | null;
  }>>> = {};

  for (const score of scores) {
    const year = score.exam.academicYear;
    const type = score.exam.examType;
    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][type]) grouped[year][type] = [];
    grouped[year][type].push({
      subject: score.subject,
      marks: score.marks ? Number(score.marks) : null,
      maxMarks: Number(score.maxMarks),
      remarks: score.remarks,
    });
  }

  return { student, scores: grouped };
}
