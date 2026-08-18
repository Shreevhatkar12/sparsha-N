import prisma from '../lib/prisma.js';
import type { JwtPayload } from '../lib/auth.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

// ----------------------------------------------------------------------
// DIGITAL LITERACY MODULE ('volunteer' role = Digital Literacy teacher)
// Two kinds of students:
//  • IN-CENTER  — an EXISTING app student is linked via a "Digital
//    InCenter Enrollment" FormSubmission (same student id — no duplicate
//    row, so admin Total Students never double counts them).
//  • OUT-CENTER — a brand-new Student row under the auto-created
//    "Digital Literacy" program (Out of Center center), so the admin
//    dashboard's Total Students + Program Distribution count them
//    automatically. Extra fields (age, batch, area…) live in a
//    "Digital Literacy Profile" FormSubmission. No DB migration needed.
// ----------------------------------------------------------------------

const DL_PROGRAM_NAME = 'Digital Literacy';
const DL_PROGRAM_CODE = 'DIGITAL';
const DL_PROFILE_TEMPLATE = 'Digital Literacy Profile';
const DL_ENROLL_TEMPLATE = 'Digital InCenter Enrollment';
const OUT_CENTER_NAME = 'Out of Center';
const DL_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Auto-created tracking programs that must NOT appear in the in-center picker.
const TRACKING_PROGRAM_NAMES = [
  'digital literacy',
  'dropout students',
  're-enrolled students',
  'sponsorship & scholarship students',
];

type DLBody = Record<string, unknown>;
type DLPatch = Record<string, string | number | boolean | null>;

async function resolveDigitalProgram() {
  let program = await prisma.program.findFirst({
    where: {
      OR: [{ name: { equals: DL_PROGRAM_NAME, mode: 'insensitive' } }, { code: DL_PROGRAM_CODE }],
    },
  });
  if (!program) {
    program = await prisma.program.create({
      data: {
        code: DL_PROGRAM_CODE,
        name: DL_PROGRAM_NAME,
        description: 'Out-of-center students of the Digital Literacy (computer class) program',
      },
    });
  }
  return program;
}

async function getDLOutCenter() {
  let center = await prisma.center.findFirst({
    where: { name: { equals: OUT_CENTER_NAME, mode: 'insensitive' } },
  });
  if (!center) {
    center = await prisma.center.create({
      data: { name: OUT_CENTER_NAME, location: 'Outside SPARSHA centers' },
    });
  }
  return center;
}

async function getDLTemplate(name: string, userId: string) {
  let tpl = await prisma.formTemplate.findFirst({ where: { name } });
  if (!tpl) {
    tpl = await prisma.formTemplate.create({
      data: {
        name,
        formType: 'system',
        targetEntity: 'student',
        createdBy: userId,
        schema: { fields: [] },
      },
    });
  }
  return tpl;
}

function parseBatch(body: DLBody) {
  const batch = String(body.batch ?? '').trim();
  if (!batch) throw new ValidationError('Batch no is required (e.g. Batch 1)');
  return batch;
}

function parseOutInput(body: DLBody) {
  const fullName = String(body.fullName ?? '').trim();
  if (fullName.length < 2) throw new ValidationError('Student full name is required');

  const age = Number(body.age);
  if (!Number.isFinite(age) || age < 3 || age > 80) {
    throw new ValidationError('Valid age is required (3 to 80)');
  }

  const genderRaw = String(body.gender ?? '').trim().toLowerCase();
  const gender =
    genderRaw === 'male' || genderRaw === 'female' || genderRaw === 'other' ? genderRaw : '';

  const contact = String(body.contact ?? '').trim();
  if (contact && !/^\d{10}$/.test(contact)) {
    throw new ValidationError('Contact number must be exactly 10 digits');
  }

  const aadharNumber = String(body.aadharNumber ?? '').trim();
  if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
    throw new ValidationError('Aadhar number must be exactly 12 digits');
  }

  const stdCourse = String(body.stdCourse ?? '').trim();
  if (!stdCourse) throw new ValidationError('Std / course name is required');

  const area = String(body.area ?? '').trim();
  const batch = parseBatch(body);

  return { fullName, age, gender, contact, aadharNumber, stdCourse, area, batch };
}

async function upsertDLProfile(userId: string, studentId: string, centerId: string, patch: DLPatch) {
  const tpl = await getDLTemplate(DL_PROFILE_TEMPLATE, userId);
  const sub = await prisma.formSubmission.findFirst({
    where: { templateId: tpl.id, studentId },
    orderBy: { submittedAt: 'desc' },
  });
  if (sub) {
    const existing =
      sub.data && typeof sub.data === 'object' && !Array.isArray(sub.data)
        ? (sub.data as unknown as DLPatch)
        : {};
    const merged: DLPatch = { ...existing, ...patch };
    await prisma.formSubmission.update({ where: { id: sub.id }, data: { data: merged, centerId } });
  } else {
    await prisma.formSubmission.create({
      data: { templateId: tpl.id, studentId, centerId, submittedBy: userId, data: patch },
    });
  }
}

// ---- create -----------------------------------------------------------

export async function createDigitalStudent(user: JwtPayload, body: DLBody) {
  const mode = body.mode === 'out' ? 'out' : 'in';

  if (mode === 'in') {
    // Link an EXISTING student — same id, no duplicate row.
    const studentId = String(body.studentId ?? '').trim();
    if (!DL_UUID_RE.test(studentId)) throw new ValidationError('Please select a student');
    const batch = parseBatch(body);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || !student.isActive) throw new NotFoundError('Student');

    const tpl = await getDLTemplate(DL_ENROLL_TEMPLATE, user.userId);
    const existing = await prisma.formSubmission.findFirst({
      where: { templateId: tpl.id, studentId },
    });
    if (existing) {
      throw new ValidationError('Ha student already Digital Literacy madhe add ahe');
    }

    const sub = await prisma.formSubmission.create({
      data: {
        templateId: tpl.id,
        studentId,
        centerId: student.centerId,
        submittedBy: user.userId,
        data: { digital: true, mode: 'in', batch },
      },
    });
    return { id: sub.id };
  }

  // OUT-CENTER — brand-new student, counted in admin totals.
  const input = parseOutInput(body);
  const program = await resolveDigitalProgram();
  const center = await getDLOutCenter();

  const student = await prisma.student.create({
    data: {
      fullName: input.fullName,
      standard: input.stdCourse,
      gender: input.gender ? (input.gender as 'male' | 'female' | 'other') : null,
      guardianPhone: input.contact || null,
      aadharNumber: input.aadharNumber || null,
      address: input.area || null,
      centerId: center.id,
      programId: program.id,
      createdById: user.userId,
    },
  });

  await upsertDLProfile(user.userId, student.id, center.id, {
    digital: true,
    mode: 'out',
    age: input.age,
    batch: input.batch,
    area: input.area,
  });
  return { id: student.id };
}

// ---- update -----------------------------------------------------------

export async function updateDigitalStudent(user: JwtPayload, id: string, body: DLBody) {
  const mode = body.mode === 'out' ? 'out' : 'in';

  if (mode === 'in') {
    // Only the DL-specific field (batch) is editable — the student's core
    // record belongs to the original program/center.
    const batch = parseBatch(body);
    const tpl = await getDLTemplate(DL_ENROLL_TEMPLATE, user.userId);
    const sub = await prisma.formSubmission.findFirst({ where: { id, templateId: tpl.id } });
    if (!sub) throw new NotFoundError('Digital Literacy enrollment');
    const existing =
      sub.data && typeof sub.data === 'object' && !Array.isArray(sub.data)
        ? (sub.data as unknown as DLPatch)
        : {};
    await prisma.formSubmission.update({
      where: { id: sub.id },
      data: { data: { ...existing, batch } },
    });
    return { id };
  }

  const input = parseOutInput(body);
  const program = await resolveDigitalProgram();
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing || existing.programId !== program.id) throw new NotFoundError('Digital Literacy student');

  await prisma.student.update({
    where: { id },
    data: {
      fullName: input.fullName,
      standard: input.stdCourse,
      gender: input.gender ? (input.gender as 'male' | 'female' | 'other') : null,
      guardianPhone: input.contact || null,
      aadharNumber: input.aadharNumber || null,
      address: input.area || null,
    },
  });

  await upsertDLProfile(user.userId, id, existing.centerId, {
    age: input.age,
    batch: input.batch,
    area: input.area,
  });
  return { id };
}

// ---- delete -----------------------------------------------------------

export async function deleteDigitalStudent(user: JwtPayload, id: string, mode: string) {
  if (mode === 'in') {
    // Remove ONLY the DL enrollment link — the original student stays untouched.
    const tpl = await getDLTemplate(DL_ENROLL_TEMPLATE, user.userId);
    const sub = await prisma.formSubmission.findFirst({ where: { id, templateId: tpl.id } });
    if (!sub) throw new NotFoundError('Digital Literacy enrollment');
    await prisma.formSubmission.delete({ where: { id: sub.id } });
    return { success: true };
  }
  const program = await resolveDigitalProgram();
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing || existing.programId !== program.id) throw new NotFoundError('Digital Literacy student');
  // PERMANENT delete of the out-center student + all referencing records.
  await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({ where: { studentId: id } }),
    prisma.examScore.deleteMany({ where: { studentId: id } }),
    prisma.studentMeetingAttendance.deleteMany({ where: { studentId: id } }),
    prisma.formSubmission.deleteMany({ where: { studentId: id } }),
    prisma.formAssignment.deleteMany({ where: { studentId: id } }),
    prisma.studentSkillLog.deleteMany({ where: { studentId: id } }),
    prisma.feePayment.deleteMany({ where: { studentId: id } }),
    prisma.studentTransfer.deleteMany({ where: { studentId: id } }),
    prisma.activityEnrollment.deleteMany({ where: { studentId: id } }),
    prisma.batchEnrollment.deleteMany({ where: { studentId: id } }),
    prisma.parentStudent.deleteMany({ where: { studentId: id } }),
    prisma.alert.deleteMany({ where: { studentId: id } }),
    prisma.student.delete({ where: { id } }),
  ]);
  return { success: true };
}

// ---- list -------------------------------------------------------------

export async function listDigitalStudents(user: JwtPayload) {
  const program = await resolveDigitalProgram();

  // OUT-CENTER rows (own Student rows under the DL program).
  const outStudents = await prisma.student.findMany({
    where: { isActive: true, programId: program.id },
    orderBy: { createdAt: 'desc' },
  });
  const profTpl = await prisma.formTemplate.findFirst({ where: { name: DL_PROFILE_TEMPLATE } });
  const profSubs =
    profTpl && outStudents.length
      ? await prisma.formSubmission.findMany({
          where: { templateId: profTpl.id, studentId: { in: outStudents.map((s) => s.id) } },
          orderBy: { submittedAt: 'asc' },
          select: { studentId: true, data: true },
        })
      : [];
  const profiles = new Map<string, Record<string, unknown>>();
  for (const p of profSubs) {
    if (p.studentId) profiles.set(p.studentId, (p.data as Record<string, unknown>) || {});
  }

  // IN-CENTER rows (enrollment submissions → joined to the original student).
  const enrollTpl = await getDLTemplate(DL_ENROLL_TEMPLATE, user.userId);
  const enrolls = await prisma.formSubmission.findMany({
    where: { templateId: enrollTpl.id },
    orderBy: { submittedAt: 'desc' },
    select: { id: true, studentId: true, data: true, submittedAt: true },
  });
  const enrollIds = enrolls.map((e) => e.studentId).filter((x): x is string => !!x);
  const linked = enrollIds.length
    ? await prisma.student.findMany({
        where: { id: { in: enrollIds }, isActive: true },
        include: {
          center: { select: { name: true } },
          program: { select: { name: true } },
        },
      })
    : [];
  const linkedMap = new Map(linked.map((s) => [s.id, s]));

  const rows: Array<Record<string, unknown>> = [];

  for (const e of enrolls) {
    const st = e.studentId ? linkedMap.get(e.studentId) : undefined;
    if (!st) continue; // deleted / inactive originals drop out everywhere
    const d = (e.data as Record<string, unknown>) || {};
    rows.push({
      id: e.id,
      kind: 'in',
      studentId: st.id,
      fullName: st.fullName,
      gender: st.gender || '',
      phone: st.guardianPhone || '',
      stdCourse: st.standard || '',
      age: null,
      aadharNumber: st.aadharNumber || '',
      batch: typeof d.batch === 'string' ? d.batch : '',
      area: '',
      centerName: st.center?.name || '',
      programName: st.program?.name || '',
      createdAt: e.submittedAt,
    });
  }

  for (const s of outStudents) {
    const p = profiles.get(s.id) || {};
    rows.push({
      id: s.id,
      kind: 'out',
      studentId: s.id,
      fullName: s.fullName,
      gender: s.gender || '',
      phone: s.guardianPhone || '',
      stdCourse: s.standard || '',
      age: typeof p.age === 'number' ? p.age : null,
      aadharNumber: s.aadharNumber || '',
      batch: typeof p.batch === 'string' ? p.batch : '',
      area: typeof p.area === 'string' && p.area ? p.area : s.address || '',
      centerName: OUT_CENTER_NAME,
      programName: DL_PROGRAM_NAME,
      createdAt: s.createdAt,
    });
  }

  const inC = rows.filter((r) => r.kind === 'in').length;
  const outC = rows.filter((r) => r.kind === 'out').length;
  const batches = Array.from(
    new Set(rows.map((r) => String(r.batch || '')).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return {
    students: rows,
    counts: {
      total: rows.length,
      inC,
      outC,
      male: rows.filter((r) => r.gender === 'male').length,
      female: rows.filter((r) => r.gender === 'female').length,
    },
    batches,
  };
}

// ---- pickers for the in-center cascade --------------------------------

export async function digitalMeta() {
  const [programs, centers] = await Promise.all([
    prisma.program.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.center.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  return {
    programs: programs.filter(
      (p) => !TRACKING_PROGRAM_NAMES.includes((p.name || '').toLowerCase()),
    ),
    centers: centers.filter(
      (c) => (c.name || '').toLowerCase() !== OUT_CENTER_NAME.toLowerCase(),
    ),
  };
}

export async function digitalPick(user: JwtPayload, programId: string, centerId: string, standard: string) {
  if (!DL_UUID_RE.test(programId)) throw new ValidationError('Select a program');
  if (!DL_UUID_RE.test(centerId)) throw new ValidationError('Select a center');

  if (!standard) {
    // Return the distinct standards available for this program + center.
    const students = await prisma.student.findMany({
      where: { isActive: true, programId, centerId },
      select: { standard: true },
    });
    const standards = Array.from(
      new Set(students.map((s) => s.standard || '').filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return { standards };
  }

  const students = await prisma.student.findMany({
    where: { isActive: true, programId, centerId, standard },
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      fullName: true,
      standard: true,
      gender: true,
      guardianPhone: true,
      guardianName: true,
    },
  });

  // Mark students already enrolled in Digital Literacy so the UI can block re-adding.
  const enrollTpl = await getDLTemplate(DL_ENROLL_TEMPLATE, user.userId);
  const existing = students.length
    ? await prisma.formSubmission.findMany({
        where: { templateId: enrollTpl.id, studentId: { in: students.map((s) => s.id) } },
        select: { studentId: true },
      })
    : [];
  const added = new Set(existing.map((e) => e.studentId));

  return {
    students: students.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      standard: s.standard || '',
      gender: s.gender || '',
      phone: s.guardianPhone || '',
      guardianName: s.guardianName || '',
      alreadyAdded: added.has(s.id),
    })),
  };
}

// ----------------------------------------------------------------------
// DIGITAL LITERACY EXAMS
// One "Digital Exams" FormSubmission per exam (studentId = null). The
// exam meta (name, date, topic, subject, batch, totalMarks) plus the
// marks map — keyed by the real studentId, { score, absent } — all live
// in the submission's JSON data. No DB migration needed.
// ----------------------------------------------------------------------

const DL_EXAM_TEMPLATE = 'Digital Exams';

type DLExamMark = { score: number | null; absent: boolean };

function parseDLExamInput(body: DLBody) {
  const name = String(body.name ?? '').trim();
  if (name.length < 2) throw new ValidationError('Exam name is required');

  const date = String(body.date ?? '').trim();
  if (!date || Number.isNaN(new Date(date).getTime())) {
    throw new ValidationError('Valid exam date is required');
  }

  const topic = String(body.topic ?? '').trim();

  const subject = String(body.subject ?? '').trim();
  if (!subject) throw new ValidationError('Subject is required');

  const batch = parseBatch(body);

  const totalMarks = Number(body.totalMarks);
  if (!Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 1000) {
    throw new ValidationError('Total marks must be between 1 and 1000');
  }

  return { name, date, topic, subject, batch, totalMarks };
}

function parseDLMarks(raw: unknown, totalMarks: number) {
  const out: Record<string, DLExamMark> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const absent = entry.absent === true;
    let score: number | null = null;
    if (!absent && entry.score != null && entry.score !== '') {
      const n = Number(entry.score);
      if (!Number.isFinite(n) || n < 0 || n > totalMarks) {
        throw new ValidationError(`Marks must be between 0 and ${totalMarks}`);
      }
      score = n;
    }
    if (absent || score != null) out[key] = { score, absent };
  }
  return out;
}

export async function createDigitalExam(user: JwtPayload, body: DLBody) {
  const input = parseDLExamInput(body);
  const marks = parseDLMarks(body.marks, input.totalMarks);
  const tpl = await getDLTemplate(DL_EXAM_TEMPLATE, user.userId);
  const center = await getDLOutCenter(); // anchor center (submission needs one)

  const sub = await prisma.formSubmission.create({
    data: {
      templateId: tpl.id,
      centerId: center.id,
      submittedBy: user.userId,
      data: { dlExam: true, ...input, marks },
    },
  });
  return { id: sub.id };
}

export async function updateDigitalExam(user: JwtPayload, id: string, body: DLBody) {
  const tpl = await getDLTemplate(DL_EXAM_TEMPLATE, user.userId);
  const sub = await prisma.formSubmission.findFirst({ where: { id, templateId: tpl.id } });
  if (!sub) throw new NotFoundError('Digital exam');

  const prev = (
    sub.data && typeof sub.data === 'object' && !Array.isArray(sub.data) ? sub.data : {}
  ) as Record<string, unknown>;

  const eff: DLBody = {
    name: body.name ?? prev.name,
    date: body.date ?? prev.date,
    topic: body.topic ?? prev.topic,
    subject: body.subject ?? prev.subject,
    batch: body.batch ?? prev.batch,
    totalMarks: body.totalMarks ?? prev.totalMarks,
  };
  const input = parseDLExamInput(eff);
  const marks =
    body.marks !== undefined
      ? parseDLMarks(body.marks, input.totalMarks)
      : parseDLMarks(prev.marks, input.totalMarks);

  await prisma.formSubmission.update({
    where: { id: sub.id },
    data: { data: { dlExam: true, ...input, marks } },
  });
  return { id };
}

export async function deleteDigitalExam(user: JwtPayload, id: string) {
  const tpl = await getDLTemplate(DL_EXAM_TEMPLATE, user.userId);
  const sub = await prisma.formSubmission.findFirst({ where: { id, templateId: tpl.id } });
  if (!sub) throw new NotFoundError('Digital exam');
  await prisma.formSubmission.delete({ where: { id: sub.id } });
  return { success: true };
}

export async function listDigitalExams(user: JwtPayload) {
  const tpl = await getDLTemplate(DL_EXAM_TEMPLATE, user.userId);
  const subs = await prisma.formSubmission.findMany({
    where: { templateId: tpl.id },
    orderBy: { submittedAt: 'desc' },
    select: { id: true, data: true, submittedAt: true },
  });

  const exams = subs
    .map((s) => {
      const d = (
        s.data && typeof s.data === 'object' && !Array.isArray(s.data) ? s.data : {}
      ) as Record<string, unknown>;
      const marks =
        d.marks && typeof d.marks === 'object' && !Array.isArray(d.marks)
          ? (d.marks as unknown as Record<string, DLExamMark>)
          : {};
      return {
        id: s.id,
        name: typeof d.name === 'string' ? d.name : '',
        date: typeof d.date === 'string' ? d.date : '',
        topic: typeof d.topic === 'string' ? d.topic : '',
        subject: typeof d.subject === 'string' ? d.subject : '',
        batch: typeof d.batch === 'string' ? d.batch : '',
        totalMarks: typeof d.totalMarks === 'number' ? d.totalMarks : 0,
        marks,
        createdAt: s.submittedAt,
      };
    })
    .filter((e) => e.name);

  return { exams };
}
