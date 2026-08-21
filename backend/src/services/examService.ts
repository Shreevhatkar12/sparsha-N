import { Prisma, UserRole } from "@prisma/client";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import prisma from "../lib/prisma.js";
import type { JwtPayload } from "../lib/auth.js";
import { resolveAcademicYearId } from "../utils/academicYear.js";

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
  examDate?: string;
};

// ================= HELPERS =================

function enforceCenterAccess(user: JwtPayload, centerId: string) {
  if (user.role === UserRole.super_admin || user.role === UserRole.tech_admin)
    return;
  if (!user.centerIds.includes(centerId)) {
    throw new ForbiddenError("Unauthorized access to this center");
  }
}

function applyCenterFilter(user: JwtPayload, where: any) {
  if (user.role === UserRole.super_admin || user.role === UserRole.tech_admin)
    return;
  where.centerId = { in: user.centerIds };
}

/**
 * Teachers only see the students they registered themselves — everywhere in
 * exams (sheet, scores, reports). Other roles see the full roster.
 */
function teacherOwnStudents(user: JwtPayload): Record<string, unknown> {
  return user.role === UserRole.teacher ? { createdById: user.userId } : {};
}

// Roll numbers are free text ("1", "10", "2A") — sort them numerically first,
// students without a roll number go last (alphabetically).
export function byRollNumber<T extends { rollNumber: string | null; fullName: string }>(a: T, b: T) {
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

// ================= CREATE EXAM =================

export const createExam = async (user: JwtPayload, data: CreateExamInput) => {
  if (!data.examDate) {
    throw new Error("examDate is required");
  }

  const examDate = new Date(data.examDate);

  const createdExams = [];

  let academicYearId = await resolveAcademicYearId(data.academicYearId);

  if (!academicYearId) {
    throw new Error("Invalid academic year");
  }

  for (const centerId of data.centerIds) {
    enforceCenterAccess(user, centerId);

    // ✅ Prevent duplicate exam for same date
    const existing = await prisma.exam.findFirst({
      where: {
        centerId,
        programId: data.programId,
        examType: data.examType,
        academicYearId,
        examDate,
      },
    });

    if (existing) {
      createdExams.push(existing);
      continue;
    }

    const exam = await prisma.exam.create({
      data: {
        name:
          data.name || `${data.examType} - ${examDate.toLocaleDateString()}`,
        examType: data.examType,
        centerId,
        programId: data.programId,
        academicYearId,
        examDate,
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

  // 1. Get all active students for this center+program (teacher → own students only)
  const students = await prisma.student.findMany({
    where: {
      centerId: exam.centerId,
      programId: exam.programId,
      isActive: true,
      ...teacherOwnStudents(user),
    },
    select: { id: true, fullName: true, rollNumber: true, standard: true },
  });
  // Roll-number order by default (numeric aware), then name.
  students.sort(byRollNumber);

  // 2. Get existing scores with subject info (only for visible, active students)
  const scores = await prisma.examScore.findMany({
    where: { examId: exam.id, student: { isActive: true, ...teacherOwnStudents(user) } },
    include: {
      student: {
        select: { id: true, fullName: true, rollNumber: true },
      },
      subject: true,
    },
  });
  scores.sort((a, b) => byRollNumber(a.student, b.student));

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

  if (query.centerId) where.centerId = query.centerId;
  if (query.programId) where.programId = query.programId;
  if (query.examType) where.examType = query.examType;

  const academicYearId = await resolveAcademicYearId(query.academicYearId);

  if (query.academicYearId && !academicYearId) {
    return []; // invalid label → no results
  }

  if (academicYearId) {
    where.academicYearId = academicYearId;
  }

  // ✅ CRITICAL FIX: filter by DATE RANGE
  if (query.examDate) {
    const d = new Date(query.examDate);

    const start = new Date(d);
    start.setHours(0, 0, 0, 0);

    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    where.examDate = {
      gte: start,
      lte: end,
    };
  }

  return prisma.exam.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      academicYear: true,
      program: true,
      center: true,
    },
  });
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
  const exam = await prisma.exam.findUnique({ where: { id: examId } });

  if (!exam) throw new NotFoundError("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  // ---- EXAM-SCOPED SUBJECTS ----
  // Subjects visible to THIS exam only:
  //   1. subjects created for this exam (examId = exam.id)
  //   2. legacy shared subjects (examId = null) this exam already scores on
  // Adding a column, renaming, changing "out of" or deleting NEVER touches
  // any other exam: shared subjects get copied for this exam first
  // (copy-on-write) and new columns are always created exam-scoped.
  const visible = await prisma.programSubject.findMany({
    where: {
      programId: exam.programId,
      OR: [
        { examId: exam.id },
        { examId: null, examScores: { some: { examId: exam.id } } },
      ],
    },
  });

  type SubjMeta = { id: string; name: string; maxMarks: number; shared: boolean };
  const subjectMap = new Map<string, string>(); // id / lowercased name → current id
  const subjectById = new Map<string, SubjMeta>();
  for (const s of visible) {
    subjectMap.set(s.id, s.id);
    subjectMap.set(s.name.toLowerCase(), s.id);
    subjectById.set(s.id, {
      id: s.id,
      name: s.name,
      maxMarks: s.maxMarks ? Number(s.maxMarks) : 100,
      shared: s.examId == null,
    });
  }

  // Copy-on-write: before changing a legacy shared subject for this exam,
  // hand this exam its own copy so every other exam keeps its old values.
  const ensureExamOwned = async (subjectId: string): Promise<string> => {
    const meta = subjectById.get(subjectId);
    if (!meta || !meta.shared) return subjectId;

    const usedElsewhere = await prisma.examScore.count({
      where: { subjectId, examId: { not: exam.id } },
    });

    let ownedId: string;
    if (usedElsewhere === 0) {
      // No other exam references it — adopt it as this exam's own subject.
      await prisma.programSubject.update({
        where: { id: subjectId },
        data: { examId: exam.id },
      });
      ownedId = subjectId;
    } else {
      // Clone for this exam and repoint this exam's scores to the clone.
      ownedId = await prisma.$transaction(async (tx) => {
        const clone = await tx.programSubject.create({
          data: {
            programId: exam.programId,
            examId: exam.id,
            name: meta.name,
            maxMarks: new Prisma.Decimal(meta.maxMarks),
          },
        });
        await tx.examScore.updateMany({
          where: { examId: exam.id, subjectId },
          data: { subjectId: clone.id },
        });
        return clone.id;
      });
    }

    subjectMap.set(subjectId, ownedId); // the old id keeps resolving
    subjectMap.set(meta.name.toLowerCase(), ownedId);
    subjectById.set(ownedId, { ...meta, id: ownedId, shared: false });
    return ownedId;
  };

  // Resolve each score's subjectId — auto-create (exam-scoped) if new
  const processedScores: any[] = [];
  const maxUpdates = new Map<string, number>(); // subjectId -> new max marks
  const nameUpdates = new Map<string, string>(); // subjectId -> renamed subject
  for (const s of input.scores) {
    let subjectId =
      (s.subjectId ? subjectMap.get(s.subjectId) : undefined) ??
      subjectMap.get((s.subject || "").toLowerCase());

    const wantName = typeof s.subject === "string" ? s.subject.trim() : "";

    // Rename support: the teacher edited an existing subject's name in the
    // grid header. Only applies when the row explicitly carries a subjectId
    // (so name-only lookups never rename anything by accident).
    if (subjectId && s.subjectId && subjectMap.get(s.subjectId) === subjectId) {
      const current = subjectById.get(subjectId);
      if (
        current &&
        wantName &&
        wantName !== current.name &&
        !nameUpdates.has(subjectId)
      ) {
        const lower = wantName.toLowerCase();
        const clashId = subjectMap.get(lower);
        if (clashId && clashId !== subjectId) {
          throw new Error(
            `Subject name "${wantName}" is already used by another subject in this exam.`,
          );
        }
        const ownedId = await ensureExamOwned(subjectId);
        nameUpdates.set(ownedId, wantName);
        // Keep the lookup maps in sync with the post-rename reality.
        subjectMap.delete(current.name.toLowerCase());
        subjectMap.set(lower, ownedId);
        const om = subjectById.get(ownedId);
        if (om) subjectById.set(ownedId, { ...om, name: wantName });
        subjectId = ownedId;
      }
    }

    // Auto-create: a brand-new column, created for THIS exam only.
    if (!subjectId && wantName && exam.programId) {
      const mmNew = Number(s.maxMarks);
      const created = await prisma.programSubject.create({
        data: {
          programId: exam.programId,
          examId: exam.id,
          name: wantName,
          maxMarks: new Prisma.Decimal(
            Number.isFinite(mmNew) && mmNew > 0 ? mmNew : 100,
          ),
        },
      });
      subjectId = created.id;
      subjectMap.set(created.id, created.id);
      subjectMap.set(wantName.toLowerCase(), created.id);
      subjectById.set(created.id, {
        id: created.id,
        name: wantName,
        maxMarks: Number.isFinite(mmNew) && mmNew > 0 ? mmNew : 100,
        shared: false,
      });
    }

    if (!subjectId) {
      throw new Error(
        `Subject '${s.subject || s.subjectId}' could not be resolved`,
      );
    }

    // "Out of" (max marks) sync — ONLY when it actually changed, and only
    // ever on this exam's own copy of the subject.
    const mm = Number(s.maxMarks);
    if (Number.isFinite(mm) && mm > 0 && !maxUpdates.has(subjectId)) {
      const cur = subjectById.get(subjectId);
      if (cur && cur.maxMarks !== mm) {
        const ownedId = await ensureExamOwned(subjectId);
        maxUpdates.set(ownedId, mm);
        const om = subjectById.get(ownedId);
        if (om) subjectById.set(ownedId, { ...om, maxMarks: mm });
        subjectId = ownedId;
      }
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

  // Run everything as one interactive transaction with a generous timeout.
  // Neon is a remote DB, so each write is a network round-trip; a large class
  // (many students × subjects) is dozens of upserts and easily blows past the
  // default 5s transaction limit. A bigger timeout keeps the save atomic without
  // expiring. Decimal columns are written via Prisma.Decimal (same as marks).
  await prisma.$transaction(
    async (tx) => {
      // Apply subject renames first (edited inline in the grid header).
      for (const [subjectId, name] of nameUpdates) {
        await tx.programSubject.update({
          where: { id: subjectId },
          data: { name },
        });
      }

      for (const [subjectId, maxMarks] of maxUpdates) {
        await tx.programSubject.update({
          where: { id: subjectId },
          data: { maxMarks: new Prisma.Decimal(maxMarks) },
        });
      }

      for (const score of processedScores) {
        await tx.examScore.upsert({
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
        });
      }
    },
    { timeout: 120000, maxWait: 20000 },
  );

  return { success: true };
}

// ================= PENDING SCORES =================

export async function getPendingExamScores(user: JwtPayload, examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) throw new NotFoundError("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  const students = await prisma.student.findMany({
    where: {
      centerId: exam.centerId,
      programId: exam.programId,
      isActive: true,
      ...teacherOwnStudents(user),
    },
  });

  // Only subjects that belong to THIS exam (its own + legacy shared ones it
  // already scores on) — never other exams' subjects.
  const subjects = await prisma.programSubject.findMany({
    where: {
      programId: exam.programId,
      OR: [
        { examId: exam.id },
        { examId: null, examScores: { some: { examId: exam.id } } },
      ],
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

  const academicYearId = await resolveAcademicYearId(query.academicYearId);

  if (query.academicYearId && !academicYearId) {
    return { perSubject: [] };
  }

  if (academicYearId) {
    where.academicYearId = academicYearId;
  }

  const exams = await prisma.exam.findMany({
    where,
    include: {
      scores: {
        where: { student: { isActive: true, ...teacherOwnStudents(user) } },
        include: {
          subject: true,
        },
      },
    },
  });

  const subjectMap: Record<
    string,
    {
      baselineTotal: number;
      baselineCount: number;
      endlineTotal: number;
      endlineCount: number;
    }
  > = {};

  for (const exam of exams) {
    for (const score of exam.scores) {
      const subjectName = score.subject.name.toLowerCase();
      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          baselineTotal: 0,
          baselineCount: 0,
          endlineTotal: 0,
          endlineCount: 0,
        };
      }

      const val = score.marks ? Number(score.marks) : 0;
      if (exam.examType.toLowerCase() === "baseline") {
        subjectMap[subjectName].baselineTotal += val;
        subjectMap[subjectName].baselineCount++;
      } else if (exam.examType.toLowerCase() === "endline") {
        subjectMap[subjectName].endlineTotal += val;
        subjectMap[subjectName].endlineCount++;
      }
    }
  }

  const perSubject = Object.entries(subjectMap).map(([subject, data]) => {
    const bAvg =
      data.baselineCount > 0 ? data.baselineTotal / data.baselineCount : 0;
    const eAvg =
      data.endlineCount > 0 ? data.endlineTotal / data.endlineCount : 0;
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

// ================= EXAM REPORT =================
// Returns a per-exam summary with student marks (total + per-subject), plus
// present/absent and gender counts. Teachers see ONLY the scores they entered;
// admins see everything within the applied filters.

type ExamReportQuery = {
  centerId?: string;
  programId?: string;
  examType?: string;
  academicYearId?: string;
  month?: string; // "YYYY-MM"
  standard?: string;
};

export async function getExamReport(user: JwtPayload, query: ExamReportQuery) {
  const where: any = {};

  // center scoping (teachers / center_admins restricted to their centers)
  applyCenterFilter(user, where);

  if (query.centerId) where.centerId = query.centerId;
  if (query.programId) where.programId = query.programId;
  if (query.examType) where.examType = query.examType;

  const academicYearId = await resolveAcademicYearId(query.academicYearId);
  if (query.academicYearId && !academicYearId) {
    return { exams: [] };
  }
  if (academicYearId) where.academicYearId = academicYearId;

  // month filter: "YYYY-MM" -> [firstOfMonth, firstOfNextMonth)
  if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
    const [y, m] = query.month.split("-").map(Number);
    where.examDate = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  const isTeacher = user.role === UserRole.teacher || user.role === UserRole.staff;

  const exams = await prisma.exam.findMany({
    where,
    orderBy: { examDate: "desc" },
    include: {
      center: true,
      program: true,
      academicYear: true,
      scores: {
        // Never count deleted students in any report; teachers → own students only.
        where: { student: { isActive: true, ...teacherOwnStudents(user) } },
        include: {
          subject: true,
          student: {
            select: { id: true, fullName: true, rollNumber: true, gender: true, standard: true },
          },
          enteredByUser: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  const report: any[] = [];

  for (const exam of exams) {
    // teachers: only the scores they themselves entered
    let scores = exam.scores;
    if (isTeacher) {
      scores = scores.filter((s) => s.enteredBy === user.userId);
    }
    // optional standard filter (student-level)
    if (query.standard) {
      scores = scores.filter((s) => (s.student?.standard || "") === query.standard);
    }

    if (scores.length === 0) continue; // nothing relevant for this viewer

    // subjects present in this exam's scores
    const subjMap = new Map<string, { id: string; name: string; maxMarks: number }>();
    for (const s of scores) {
      if (s.subject && !subjMap.has(s.subject.id)) {
        subjMap.set(s.subject.id, {
          id: s.subject.id,
          name: s.subject.name,
          maxMarks: s.subject.maxMarks ? Number(s.subject.maxMarks) : 100,
        });
      }
    }
    const subjects = Array.from(subjMap.values());

    // group scores per student
    const studMap = new Map<string, any>();
    for (const s of scores) {
      const st = s.student;
      if (!st) continue;
      if (!studMap.has(st.id)) {
        studMap.set(st.id, {
          studentId: st.id,
          name: st.fullName,
          rollNumber: st.rollNumber || "",
          gender: st.gender || null,
          standard: st.standard || "",
          perSubject: {} as Record<string, { marks: number | null; isAbsent: boolean; maxMarks: number }>,
          obtainedTotal: 0,
          maxTotal: 0,
          isAbsent: false,
          hasMarks: false,
        });
      }
      const rec = studMap.get(st.id);
      const maxM = s.subject?.maxMarks ? Number(s.subject.maxMarks) : 100;
      const absent = Boolean(s.isAbsent);
      const marks = !absent && s.marks != null ? Number(s.marks) : null;
      if (s.subject) {
        rec.perSubject[s.subject.id] = { marks, isAbsent: absent, maxMarks: maxM };
      }
      if (absent) rec.isAbsent = true;
      if (marks != null) {
        rec.obtainedTotal += marks;
        rec.hasMarks = true;
      }
      rec.maxTotal += maxM;
    }

    const students = Array.from(studMap.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );

    const totalStudents = students.length;
    const absentCount = students.filter((s) => s.isAbsent).length;
    const presentCount = totalStudents - absentCount;
    const maleCount = students.filter((s) => s.gender === "male").length;
    const femaleCount = students.filter((s) => s.gender === "female").length;
    const otherCount = totalStudents - maleCount - femaleCount;

    const enteredBy = Array.from(
      new Set(scores.map((s) => s.enteredByUser?.fullName).filter(Boolean)),
    );

    report.push({
      id: exam.id,
      name: exam.name,
      examType: exam.examType,
      examDate: exam.examDate,
      academicYearLabel: exam.academicYear?.label ?? "",
      center: { id: exam.centerId, name: exam.center?.name ?? "" },
      program: { id: exam.programId, name: exam.program?.name ?? "" },
      subjects,
      enteredBy,
      totals: {
        totalStudents,
        present: presentCount,
        absent: absentCount,
        male: maleCount,
        female: femaleCount,
        other: otherCount,
      },
      students,
    });
  }

  return { exams: report };
}

// ================= DELETE SUBJECT COLUMN =================
// The small ✕ on a subject column in the marks grid. Removes that subject's
// scores from THIS exam only. If no other exam still uses the subject, the
// subject itself is also removed from the program so it doesn't reappear.

export async function deleteExamSubject(
  user: JwtPayload,
  examId: string,
  subjectId: string,
) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new NotFoundError("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  const subject = await prisma.programSubject.findUnique({
    where: { id: subjectId },
  });
  if (!subject) throw new NotFoundError("Subject not found");
  if (subject.programId !== exam.programId) {
    throw new ForbiddenError("Subject does not belong to this exam's program");
  }
  // Exam-scoped subject of a DIFFERENT exam can never be touched from here.
  if (subject.examId && subject.examId !== examId) {
    throw new ForbiddenError("Subject belongs to a different exam");
  }

  // Remove this subject's scores from this exam ONLY.
  await prisma.examScore.deleteMany({ where: { examId, subjectId } });

  // Clean up the subject row itself only when nothing references it any more
  // (an exam-scoped subject of this exam, or a shared one no exam uses).
  const stillUsed = await prisma.examScore.count({ where: { subjectId } });
  let subjectRemoved = false;
  if (stillUsed === 0) {
    await prisma.programSubject.delete({ where: { id: subjectId } });
    subjectRemoved = true;
  }

  return { success: true, subjectRemoved };
}

// ================= DELETE EXAM (ADMIN ONLY) =================

export async function deleteExam(user: JwtPayload, examId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new NotFoundError("Exam not found");

  enforceCenterAccess(user, exam.centerId);

  // Only admins may delete an entire exam and its scores.
  const isAdmin =
    user.role === UserRole.super_admin ||
    user.role === UserRole.tech_admin ||
    user.role === UserRole.center_admin;
  if (!isAdmin) {
    throw new ForbiddenError("Only admins can delete exams");
  }

  await prisma.$transaction([
    prisma.examScore.deleteMany({ where: { examId } }),
    prisma.exam.delete({ where: { id: examId } }),
  ]);

  return { success: true };
}
