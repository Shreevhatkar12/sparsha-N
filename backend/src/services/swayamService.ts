import prisma from '../lib/prisma.js';
import type { JwtPayload } from '../lib/auth.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

// ----------------------------------------------------------------------
// SWAYAM 2 COORDINATOR MODULE
// Students are stored as regular Student rows (programId = Swayam 2), so
// all admin dashboards / program distribution / totals count them
// automatically. Extra coordinator-only fields (age, previous marks,
// in/out center, area) live in a system FormSubmission profile — no DB
// schema change needed. Out-of-center students are attached to an
// auto-created "Out of Center" center.
// ----------------------------------------------------------------------

const PROFILE_TEMPLATE_NAME = 'Swayam2 Profile';
const OUT_CENTER_NAME = 'Out of Center';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveSwayamProgram() {
  let program = await prisma.program.findFirst({
    where: { name: { equals: 'Swayam 2', mode: 'insensitive' } },
  });
  if (!program) {
    program = await prisma.program.findFirst({
      where: { name: { contains: 'swayam 2', mode: 'insensitive' } },
    });
  }
  if (!program) throw new NotFoundError('Swayam 2 program');
  return program;
}

async function getOutCenter() {
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

async function getProfileTemplate(userId: string) {
  let tpl = await prisma.formTemplate.findFirst({ where: { name: PROFILE_TEMPLATE_NAME } });
  if (!tpl) {
    tpl = await prisma.formTemplate.create({
      data: {
        name: PROFILE_TEMPLATE_NAME,
        formType: 'system',
        targetEntity: 'student',
        createdBy: userId,
        schema: { fields: [] },
      },
    });
  }
  return tpl;
}

type SwayamBody = Record<string, unknown>;

function parseSwayamInput(body: SwayamBody) {
  const fullName = String(body.fullName ?? '').trim();
  if (fullName.length < 2) throw new ValidationError('Full name is required');

  const age = Number(body.age);
  if (!Number.isFinite(age) || age < 3 || age > 60) {
    throw new ValidationError('Valid age is required (3 to 60)');
  }

  const currentStd = String(body.currentStd ?? '').trim();
  if (!currentStd) throw new ValidationError('Current std / course is required');

  // Academic year the student is in this std, e.g. "2026-27".
  const academicYear = String(body.academicYear ?? '').trim();
  if (academicYear && !/^\d{4}-\d{2}$/.test(academicYear)) {
    throw new ValidationError('Academic year must look like 2026-27');
  }

  const stream = String(body.stream ?? '').trim();
  const prevMarks = String(body.prevMarks ?? '').trim();
  const prevSchool = String(body.prevSchool ?? '').trim();
  const guardianName = String(body.guardianName ?? '').trim();

  const genderRaw = String(body.gender ?? '').trim().toLowerCase();
  const gender =
    genderRaw === 'male' || genderRaw === 'female' || genderRaw === 'other' ? genderRaw : '';
  if (!gender) throw new ValidationError('Gender is required (Male / Female / Other)');

  const aadharNumber = String(body.aadharNumber ?? '').trim();
  if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
    throw new ValidationError('Aadhar number must be exactly 12 digits');
  }

  const phone = String(body.phone ?? '').trim();
  if (phone && !/^\d{10}$/.test(phone)) {
    throw new ValidationError('Phone must be exactly 10 digits');
  }

  const locationType = body.locationType === 'out' ? 'out' : 'in';
  const centerId = String(body.centerId ?? '').trim();
  const area = String(body.area ?? '').trim();
  if (locationType === 'in' && !UUID_RE.test(centerId)) {
    throw new ValidationError('Please select a center');
  }
  if (locationType === 'out' && !area) {
    throw new ValidationError('Area name is required for out-of-center students');
  }

  return { fullName, age, currentStd, academicYear, stream, prevMarks, prevSchool, phone, guardianName, gender, aadharNumber, locationType, centerId, area };
}

async function resolveCenterFor(input: ReturnType<typeof parseSwayamInput>) {
  if (input.locationType === 'out') return getOutCenter();
  const center = await prisma.center.findUnique({ where: { id: input.centerId } });
  if (!center) throw new NotFoundError('Center');
  return center;
}

function profileData(input: ReturnType<typeof parseSwayamInput>) {
  return {
    swayam2: true,
    age: input.age,
    academicYear: input.academicYear,
    prevMarks: input.prevMarks,
    locationType: input.locationType,
    area: input.locationType === 'out' ? input.area : '',
  };
}

export async function createSwayamStudent(user: JwtPayload, body: SwayamBody) {
  const input = parseSwayamInput(body);
  const program = await resolveSwayamProgram();
  const center = await resolveCenterFor(input);

  // enrollmentDate is auto-set (DB default now()) on create — spec point 10.
  const student = await prisma.student.create({
    data: {
      fullName: input.fullName,
      standard: input.currentStd,
      stream: input.stream || null,
      collegeName: input.prevSchool || null,
      guardianName: input.guardianName || null,
      guardianPhone: input.phone || null,
      gender: input.gender ? (input.gender as 'male' | 'female' | 'other') : null,
      aadharNumber: input.aadharNumber || null,
      address: input.locationType === 'out' ? input.area : null,
      centerId: center.id,
      programId: program.id,
      createdById: user.userId,
    },
  });

  const tpl = await getProfileTemplate(user.userId);
  await prisma.formSubmission.create({
    data: {
      templateId: tpl.id,
      studentId: student.id,
      centerId: center.id,
      submittedBy: user.userId,
      data: profileData(input),
    },
  });

  return { id: student.id };
}

export async function updateSwayamStudent(user: JwtPayload, studentId: string, body: SwayamBody) {
  const input = parseSwayamInput(body);
  const program = await resolveSwayamProgram();
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing || existing.programId !== program.id) throw new NotFoundError('Swayam student');
  const center = await resolveCenterFor(input);

  await prisma.student.update({
    where: { id: studentId },
    data: {
      fullName: input.fullName,
      standard: input.currentStd,
      stream: input.stream || null,
      collegeName: input.prevSchool || null,
      guardianName: input.guardianName || null,
      guardianPhone: input.phone || null,
      gender: input.gender ? (input.gender as 'male' | 'female' | 'other') : null,
      aadharNumber: input.aadharNumber || null,
      address: input.locationType === 'out' ? input.area : null,
      centerId: center.id,
    },
  });

  const tpl = await getProfileTemplate(user.userId);
  const sub = await prisma.formSubmission.findFirst({
    where: { templateId: tpl.id, studentId },
    orderBy: { submittedAt: 'desc' },
  });
  if (sub) {
    await prisma.formSubmission.update({
      where: { id: sub.id },
      data: { data: profileData(input), centerId: center.id },
    });
  } else {
    await prisma.formSubmission.create({
      data: {
        templateId: tpl.id,
        studentId,
        centerId: center.id,
        submittedBy: user.userId,
        data: profileData(input),
      },
    });
  }

  return { id: studentId };
}

export async function deleteSwayamStudent(studentId: string) {
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing) throw new NotFoundError('Student');
  // PERMANENT delete — student + every record referencing them, one transaction.
  await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({ where: { studentId } }),
    prisma.examScore.deleteMany({ where: { studentId } }),
    prisma.studentMeetingAttendance.deleteMany({ where: { studentId } }),
    prisma.formSubmission.deleteMany({ where: { studentId } }),
    prisma.formAssignment.deleteMany({ where: { studentId } }),
    prisma.studentSkillLog.deleteMany({ where: { studentId } }),
    prisma.feePayment.deleteMany({ where: { studentId } }),
    prisma.studentTransfer.deleteMany({ where: { studentId } }),
    prisma.activityEnrollment.deleteMany({ where: { studentId } }),
    prisma.batchEnrollment.deleteMany({ where: { studentId } }),
    prisma.parentStudent.deleteMany({ where: { studentId } }),
    prisma.alert.deleteMany({ where: { studentId } }),
    prisma.student.delete({ where: { id: studentId } }),
  ]);
  return { success: true };
}

// ----------------------------------------------------------------------
// DROPOUT TRACKING (Swayam coordinator)
// Dropout & re-enrolled children are stored as Student rows under two
// auto-created programs — "Dropout Students" and "Re-enrolled Students" —
// so the admin dashboard's Total Students and Program Distribution pick
// them up automatically. Extra fields live in a "Dropout Profile"
// FormSubmission. Re-enrolling migrates the same student row between the
// two programs (one identity, never counted twice).
// ----------------------------------------------------------------------

const DROPOUT_TEMPLATE_NAME = 'Dropout Profile';

async function resolveNamedProgram(name: string, code: string, description: string) {
  let program = await prisma.program.findFirst({
    where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { code }] },
  });
  if (!program) {
    program = await prisma.program.create({ data: { code, name, description } });
  }
  return program;
}

const resolveDropoutProgram = () =>
  resolveNamedProgram('Dropout Students', 'DROPOUT', 'Children who dropped out of school (Swayam tracking)');
const resolveReenrolledProgram = () =>
  resolveNamedProgram('Re-enrolled Students', 'REENROLLED', 'Dropout children re-enrolled into school/college');

async function getDropoutTemplate(userId: string) {
  let tpl = await prisma.formTemplate.findFirst({ where: { name: DROPOUT_TEMPLATE_NAME } });
  if (!tpl) {
    tpl = await prisma.formTemplate.create({
      data: {
        name: DROPOUT_TEMPLATE_NAME,
        formType: 'system',
        targetEntity: 'student',
        createdBy: userId,
        schema: { fields: [] },
      },
    });
  }
  return tpl;
}

// JSON-safe profile values — matches Prisma's InputJsonValue, so `data:`
// writes typecheck (Record<string, unknown> does not).
type ProfilePatch = Record<string, string | number | boolean | null>;

async function upsertDropoutProfile(
  userId: string,
  studentId: string,
  centerId: string,
  patch: ProfilePatch,
) {
  const tpl = await getDropoutTemplate(userId);
  const sub = await prisma.formSubmission.findFirst({
    where: { templateId: tpl.id, studentId },
    orderBy: { submittedAt: 'desc' },
  });
  if (sub) {
    const existing =
      sub.data && typeof sub.data === 'object' && !Array.isArray(sub.data)
        ? (sub.data as unknown as ProfilePatch)
        : {};
    const merged: ProfilePatch = { ...existing, ...patch };
    await prisma.formSubmission.update({ where: { id: sub.id }, data: { data: merged, centerId } });
  } else {
    await prisma.formSubmission.create({
      data: { templateId: tpl.id, studentId, centerId, submittedBy: userId, data: patch },
    });
  }
}

function parseDropoutInput(body: SwayamBody) {
  const fullName = String(body.fullName ?? '').trim();
  if (fullName.length < 2) throw new ValidationError('Child full name is required');

  const age = Number(body.age);
  if (!Number.isFinite(age) || age < 3 || age > 60) {
    throw new ValidationError('Valid age is required (3 to 60)');
  }

  const genderRaw = String(body.gender ?? '').trim().toLowerCase();
  const gender =
    genderRaw === 'male' || genderRaw === 'female' || genderRaw === 'other' ? genderRaw : '';
  if (!gender) throw new ValidationError('Gender is required (Male / Female / Other)');

  const phone = String(body.phone ?? '').trim();
  if (phone && !/^\d{10}$/.test(phone)) {
    throw new ValidationError('Phone must be exactly 10 digits');
  }

  const aadharNumber = String(body.aadharNumber ?? '').trim();
  if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
    throw new ValidationError('Aadhar number must be exactly 12 digits');
  }

  const dropoutStd = String(body.dropoutStd ?? '').trim();
  if (!dropoutStd) throw new ValidationError('Dropout std is required (or select Illiterate)');

  // "Illiterate" = kadhi shalech nahi gelela — dropout year lagat nahi.
  const isIlliterate = dropoutStd.toLowerCase() === 'illiterate';
  let dropoutYear: number | null = null;
  if (!isIlliterate) {
    const y = Number(body.dropoutYear);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      throw new ValidationError('Valid dropout year is required (e.g. 2025)');
    }
    dropoutYear = y;
  } else if (body.dropoutYear != null && body.dropoutYear !== '') {
    const y = Number(body.dropoutYear);
    if (Number.isInteger(y) && y >= 2000 && y <= 2100) dropoutYear = y;
  }

  const animatorName = String(body.animatorName ?? '').trim();
  const reason = String(body.reason ?? '').trim();

  const locationType = body.locationType === 'out' ? 'out' : 'in';
  const centerId = String(body.centerId ?? '').trim();
  const area = String(body.area ?? '').trim();
  if (locationType === 'in' && !UUID_RE.test(centerId)) {
    throw new ValidationError('Please select a center');
  }
  if (locationType === 'out' && !area) {
    throw new ValidationError('Area name is required for out-of-center children');
  }

  // Dropout Type — "center" (dropped out of the SPARSHA center) vs "school"
  // (dropped out of school). Only "school" dropouts count on the main admin
  // dashboard — spec point (Dropout Type feature).
  const dropoutTypeRaw = String(body.dropoutType ?? '').trim().toLowerCase();
  const dropoutType: DropoutType = dropoutTypeRaw === 'center' || dropoutTypeRaw === 'school' ? dropoutTypeRaw : '';
  if (!dropoutType) {
    throw new ValidationError('Select Dropout Type — Center Dropout or School Dropout');
  }

  return { fullName, age, gender, phone, aadharNumber, dropoutStd, dropoutYear, animatorName, reason, locationType, centerId, area, dropoutType };
}

function dropoutProfileData(input: ReturnType<typeof parseDropoutInput>) {
  return {
    dropout: true,
    age: input.age,
    dropoutStd: input.dropoutStd,
    dropoutYear: input.dropoutYear,
    animatorName: input.animatorName,
    reason: input.reason,
    locationType: input.locationType,
    area: input.locationType === 'out' ? input.area : '',
    dropoutType: input.dropoutType,
  };
}

// "center" = dropped out of the SPARSHA center itself; "school" = dropped
// out of school/college. '' only appears transiently for legacy rows that
// were never edited after this feature shipped.
type DropoutType = 'center' | 'school' | '';

function parseReenrollInput(body: SwayamBody) {
  const school = String(body.school ?? '').trim();
  if (school.length < 2) throw new ValidationError('Re-enrolled school / college name is required');
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ValidationError('Valid re-enrolled year is required (e.g. 2026)');
  }
  const std = String(body.std ?? '').trim();
  if (!std) throw new ValidationError('Re-enrolled std is required');

  // Optional — lets the coordinator set/correct Dropout Type from the
  // Re-enrolled edit screen too (same two buttons: Center / School).
  const dropoutTypeRaw = String(body.dropoutType ?? '').trim().toLowerCase();
  const dropoutType: DropoutType | undefined =
    dropoutTypeRaw === 'center' || dropoutTypeRaw === 'school' ? dropoutTypeRaw : undefined;

  return { school, year, std, dropoutType };
}

export async function createDropoutStudent(user: JwtPayload, body: SwayamBody) {
  const input = parseDropoutInput(body);
  const program = await resolveDropoutProgram();
  const center =
    input.locationType === 'out'
      ? await getOutCenter()
      : await prisma.center.findUnique({ where: { id: input.centerId } });
  if (!center) throw new NotFoundError('Center');

  const student = await prisma.student.create({
    data: {
      fullName: input.fullName,
      standard: input.dropoutStd,
      gender: input.gender ? (input.gender as 'male' | 'female' | 'other') : null,
      guardianPhone: input.phone || null,
      aadharNumber: input.aadharNumber || null,
      address: input.locationType === 'out' ? input.area : null,
      centerId: center.id,
      programId: program.id,
      createdById: user.userId,
    },
  });

  await upsertDropoutProfile(user.userId, student.id, center.id, dropoutProfileData(input));
  return { id: student.id };
}

export async function updateDropoutStudent(user: JwtPayload, studentId: string, body: SwayamBody) {
  const input = parseDropoutInput(body);
  const program = await resolveDropoutProgram();
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing || existing.programId !== program.id) throw new NotFoundError('Dropout student');
  const center =
    input.locationType === 'out'
      ? await getOutCenter()
      : await prisma.center.findUnique({ where: { id: input.centerId } });
  if (!center) throw new NotFoundError('Center');

  await prisma.student.update({
    where: { id: studentId },
    data: {
      fullName: input.fullName,
      standard: input.dropoutStd,
      gender: input.gender ? (input.gender as 'male' | 'female' | 'other') : null,
      guardianPhone: input.phone || null,
      aadharNumber: input.aadharNumber || null,
      address: input.locationType === 'out' ? input.area : null,
      centerId: center.id,
    },
  });

  await upsertDropoutProfile(user.userId, studentId, center.id, dropoutProfileData(input));
  return { id: studentId };
}

export async function reenrollDropoutStudent(user: JwtPayload, studentId: string, body: SwayamBody) {
  const input = parseReenrollInput(body);
  const dropProgram = await resolveDropoutProgram();
  const reProgram = await resolveReenrolledProgram();
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing || existing.programId !== dropProgram.id) throw new NotFoundError('Dropout student');

  // Migrate the SAME student row: dropout list → re-enrolled list.
  await prisma.student.update({
    where: { id: studentId },
    data: {
      programId: reProgram.id,
      collegeName: input.school,
      standard: input.std,
    },
  });

  await upsertDropoutProfile(user.userId, studentId, existing.centerId, {
    reenrolled: true,
    reenrollSchool: input.school,
    reenrollYear: input.year,
    reenrollStd: input.std,
    ...(input.dropoutType ? { dropoutType: input.dropoutType } : {}),
  });

  return { id: studentId };
}

// Back to Dropout — migrates the SAME record from the Re-enrolled list back to
// the Dropout list (re-enrollment details cleared). One identity, never double counted.
export async function revertReenrolledStudent(user: JwtPayload, studentId: string) {
  const dropProgram = await resolveDropoutProgram();
  const reProgram = await resolveReenrolledProgram();
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing || existing.programId !== reProgram.id) throw new NotFoundError('Re-enrolled student');

  const tpl = await getDropoutTemplate(user.userId);
  const sub = await prisma.formSubmission.findFirst({
    where: { templateId: tpl.id, studentId },
    orderBy: { submittedAt: 'desc' },
  });
  const p =
    sub && sub.data && typeof sub.data === 'object' && !Array.isArray(sub.data)
      ? (sub.data as Record<string, unknown>)
      : {};
  const dropoutStd = typeof p.dropoutStd === 'string' && p.dropoutStd ? p.dropoutStd : existing.standard || '';

  await prisma.student.update({
    where: { id: studentId },
    data: { programId: dropProgram.id, collegeName: null, standard: dropoutStd || null },
  });

  await upsertDropoutProfile(user.userId, studentId, existing.centerId, {
    reenrolled: false,
    reenrollSchool: '',
    reenrollYear: null,
    reenrollStd: '',
  });

  return { id: studentId };
}

export async function updateReenrolledStudent(user: JwtPayload, studentId: string, body: SwayamBody) {
  const input = parseReenrollInput(body);
  const reProgram = await resolveReenrolledProgram();
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing || existing.programId !== reProgram.id) throw new NotFoundError('Re-enrolled student');

  await prisma.student.update({
    where: { id: studentId },
    data: { collegeName: input.school, standard: input.std },
  });

  await upsertDropoutProfile(user.userId, studentId, existing.centerId, {
    reenrollSchool: input.school,
    reenrollYear: input.year,
    reenrollStd: input.std,
    ...(input.dropoutType ? { dropoutType: input.dropoutType } : {}),
  });

  return { id: studentId };
}

export async function listDropoutData() {
  const [dropProgram, reProgram] = await Promise.all([
    resolveDropoutProgram(),
    resolveReenrolledProgram(),
  ]);

  const students = await prisma.student.findMany({
    where: { isActive: true, programId: { in: [dropProgram.id, reProgram.id] } },
    include: { center: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const tpl = await prisma.formTemplate.findFirst({ where: { name: DROPOUT_TEMPLATE_NAME } });
  const subs =
    tpl && students.length
      ? await prisma.formSubmission.findMany({
          where: { templateId: tpl.id, studentId: { in: students.map((s) => s.id) } },
          orderBy: { submittedAt: 'asc' },
          select: { studentId: true, data: true },
        })
      : [];
  const profiles = new Map<string, Record<string, unknown>>();
  for (const s of subs) {
    if (s.studentId) profiles.set(s.studentId, (s.data as Record<string, unknown>) || {});
  }

  const rows = students.map((s) => {
    const p = profiles.get(s.id) || {};
    const isOut =
      p.locationType === 'out' ||
      (s.center?.name || '').toLowerCase() === OUT_CENTER_NAME.toLowerCase();
    return {
      id: s.id,
      programId: s.programId,
      fullName: s.fullName,
      gender: s.gender || '',
      phone: s.guardianPhone || '',
      aadharNumber: s.aadharNumber || '',
      age: typeof p.age === 'number' ? p.age : null,
      dropoutStd: typeof p.dropoutStd === 'string' && p.dropoutStd ? p.dropoutStd : s.standard || '',
      dropoutYear: typeof p.dropoutYear === 'number' ? p.dropoutYear : null,
      dropoutType: p.dropoutType === 'center' || p.dropoutType === 'school' ? p.dropoutType : '',
      animatorName: typeof p.animatorName === 'string' ? p.animatorName : '',
      reason: typeof p.reason === 'string' ? p.reason : '',
      locationType: isOut ? 'out' : 'in',
      centerId: s.centerId,
      centerName: s.center?.name || '',
      area: typeof p.area === 'string' && p.area ? p.area : isOut ? s.address || '' : '',
      reenrollSchool:
        typeof p.reenrollSchool === 'string' && p.reenrollSchool ? p.reenrollSchool : s.collegeName || '',
      reenrollYear: typeof p.reenrollYear === 'number' ? p.reenrollYear : null,
      reenrollStd: typeof p.reenrollStd === 'string' ? p.reenrollStd : '',
    };
  });

  const dropouts = rows.filter((r) => r.programId === dropProgram.id);
  const reenrolled = rows.filter((r) => r.programId === reProgram.id);

  return {
    dropouts,
    reenrolled,
    counts: {
      dropouts: dropouts.length,
      reenrolled: reenrolled.length,
      dropoutIn: dropouts.filter((r) => r.locationType === 'in').length,
      dropoutOut: dropouts.filter((r) => r.locationType === 'out').length,
      // School-only counts — these are what the main admin dashboard shows.
      dropoutsSchool: dropouts.filter((r) => r.dropoutType === 'school').length,
      dropoutsCenter: dropouts.filter((r) => r.dropoutType === 'center').length,
      reenrolledSchool: reenrolled.filter((r) => r.dropoutType === 'school').length,
      reenrolledCenter: reenrolled.filter((r) => r.dropoutType === 'center').length,
    },
  };
}

export async function listSwayamStudents() {
  const program = await resolveSwayamProgram();
  const students = await prisma.student.findMany({
    where: { isActive: true, programId: program.id },
    include: { center: { select: { id: true, name: true } } },
    orderBy: { enrollmentDate: 'desc' },
  });

  const tpl = await prisma.formTemplate.findFirst({ where: { name: PROFILE_TEMPLATE_NAME } });
  const subs =
    tpl && students.length
      ? await prisma.formSubmission.findMany({
          where: { templateId: tpl.id, studentId: { in: students.map((s) => s.id) } },
          orderBy: { submittedAt: 'asc' },
          select: { studentId: true, data: true },
        })
      : [];
  const profiles = new Map<string, Record<string, unknown>>();
  for (const s of subs) {
    if (s.studentId) profiles.set(s.studentId, (s.data as Record<string, unknown>) || {});
  }

  return {
    programId: program.id,
    programName: program.name,
    students: students.map((s) => {
      const p = profiles.get(s.id) || {};
      const isOut =
        p.locationType === 'out' ||
        (s.center?.name || '').toLowerCase() === OUT_CENTER_NAME.toLowerCase();
      return {
        id: s.id,
        fullName: s.fullName,
        standard: s.standard || '',
        stream: s.stream || '',
        collegeName: s.collegeName || '',
        phone: s.guardianPhone || '',
        guardianName: s.guardianName || '',
        gender: s.gender || '',
        aadharNumber: s.aadharNumber || '',
        centerId: s.centerId,
        centerName: s.center?.name || '',
        enrollmentDate: s.enrollmentDate,
        age: typeof p.age === 'number' ? p.age : null,
        academicYear: typeof p.academicYear === 'string' ? p.academicYear : '',
        prevMarks: typeof p.prevMarks === 'string' ? p.prevMarks : '',
        locationType: isOut ? 'out' : 'in',
        area: typeof p.area === 'string' && p.area ? p.area : isOut ? s.address || '' : '',
      };
    }),
  };
}

// ----------------------------------------------------------------------
// SPONSORSHIP / SCHOLARSHIP TRACKING (Swayam coordinator)
// ONE auto-created program — "Sponsorship & Scholarship Students" — holds
// both pending and done students, so the admin dashboard's Total Students
// and Program Distribution show one clean count. The pending/done state
// (plus donor, support type, area, animator…) lives in a "Sponsorship
// Profile" FormSubmission. Done ⇄ Revert only flips the profile status —
// the SAME student row migrates between the two lists, never counted twice.
// ----------------------------------------------------------------------

const SPONSORSHIP_TEMPLATE_NAME = 'Sponsorship Profile';

const resolveSponsorshipProgram = () =>
  resolveNamedProgram(
    'Sponsorship & Scholarship Students',
    'SPONSORSHIP',
    'Students needing or receiving sponsorship / scholarship (Swayam tracking)',
  );

async function getSponsorshipTemplate(userId: string) {
  let tpl = await prisma.formTemplate.findFirst({ where: { name: SPONSORSHIP_TEMPLATE_NAME } });
  if (!tpl) {
    tpl = await prisma.formTemplate.create({
      data: {
        name: SPONSORSHIP_TEMPLATE_NAME,
        formType: 'system',
        targetEntity: 'student',
        createdBy: userId,
        schema: { fields: [] },
      },
    });
  }
  return tpl;
}

async function upsertSponsorshipProfile(
  userId: string,
  studentId: string,
  centerId: string,
  patch: ProfilePatch,
) {
  const tpl = await getSponsorshipTemplate(userId);
  const sub = await prisma.formSubmission.findFirst({
    where: { templateId: tpl.id, studentId },
    orderBy: { submittedAt: 'desc' },
  });
  if (sub) {
    const existing =
      sub.data && typeof sub.data === 'object' && !Array.isArray(sub.data)
        ? (sub.data as unknown as ProfilePatch)
        : {};
    const merged: ProfilePatch = { ...existing, ...patch };
    await prisma.formSubmission.update({ where: { id: sub.id }, data: { data: merged, centerId } });
  } else {
    await prisma.formSubmission.create({
      data: { templateId: tpl.id, studentId, centerId, submittedBy: userId, data: patch },
    });
  }
}

function parseSponsorshipInput(body: SwayamBody) {
  const fullName = String(body.fullName ?? '').trim();
  if (fullName.length < 2) throw new ValidationError('Student full name is required');

  const age = Number(body.age);
  if (!Number.isFinite(age) || age < 3 || age > 60) {
    throw new ValidationError('Valid age is required (3 to 60)');
  }

  const genderRaw = String(body.gender ?? '').trim().toLowerCase();
  const gender =
    genderRaw === 'male' || genderRaw === 'female' || genderRaw === 'other' ? genderRaw : '';
  if (!gender) throw new ValidationError('Gender is required (Male / Female / Other)');

  const phone = String(body.phone ?? '').trim();
  if (phone && !/^\d{10}$/.test(phone)) {
    throw new ValidationError('Phone must be exactly 10 digits');
  }

  const email = String(body.email ?? '').trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    throw new ValidationError('Enter a valid email id');
  }

  const area = String(body.area ?? '').trim();
  const schoolName = String(body.schoolName ?? '').trim();
  const stream = String(body.stream ?? '').trim();

  const stdCourse = String(body.stdCourse ?? '').trim();
  if (!stdCourse) throw new ValidationError('Std / course is required');

  const animatorName = String(body.animatorName ?? '').trim();
  const donorName = String(body.donorName ?? '').trim();

  const supportTypeRaw = String(body.supportType ?? '').trim().toLowerCase();
  if (supportTypeRaw !== 'sponsorship' && supportTypeRaw !== 'scholarship') {
    throw new ValidationError('Select Sponsorship or Scholarship');
  }

  return {
    fullName,
    age,
    gender,
    phone,
    email,
    area,
    schoolName,
    stream,
    stdCourse,
    animatorName,
    donorName,
    supportType: supportTypeRaw,
  };
}

function sponsorshipProfileData(input: ReturnType<typeof parseSponsorshipInput>) {
  // NOTE: status is intentionally NOT here — updates must never overwrite
  // the pending/done state; only Done / Revert change it.
  return {
    sponsorship: true,
    age: input.age,
    email: input.email,
    area: input.area,
    animatorName: input.animatorName,
    donorName: input.donorName,
    supportType: input.supportType,
  };
}

export async function createSponsorshipStudent(user: JwtPayload, body: SwayamBody) {
  const input = parseSponsorshipInput(body);
  const program = await resolveSponsorshipProgram();
  // Tracked by area name (no SPARSHA center attached) — same as out-center children.
  const center = await getOutCenter();

  const student = await prisma.student.create({
    data: {
      fullName: input.fullName,
      standard: input.stdCourse,
      stream: input.stream || null,
      collegeName: input.schoolName || null,
      gender: input.gender ? (input.gender as 'male' | 'female' | 'other') : null,
      guardianPhone: input.phone || null,
      address: input.area || null,
      centerId: center.id,
      programId: program.id,
      createdById: user.userId,
    },
  });

  await upsertSponsorshipProfile(user.userId, student.id, center.id, {
    ...sponsorshipProfileData(input),
    status: 'pending',
  });
  return { id: student.id };
}

export async function updateSponsorshipStudent(user: JwtPayload, studentId: string, body: SwayamBody) {
  const input = parseSponsorshipInput(body);
  const program = await resolveSponsorshipProgram();
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing || existing.programId !== program.id) throw new NotFoundError('Sponsorship student');

  await prisma.student.update({
    where: { id: studentId },
    data: {
      fullName: input.fullName,
      standard: input.stdCourse,
      stream: input.stream || null,
      collegeName: input.schoolName || null,
      gender: input.gender ? (input.gender as 'male' | 'female' | 'other') : null,
      guardianPhone: input.phone || null,
      address: input.area || null,
    },
  });

  await upsertSponsorshipProfile(user.userId, studentId, existing.centerId, sponsorshipProfileData(input));
  return { id: studentId };
}

async function setSponsorshipStatus(user: JwtPayload, studentId: string, status: 'pending' | 'done') {
  const program = await resolveSponsorshipProgram();
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing || existing.programId !== program.id) throw new NotFoundError('Sponsorship student');
  await upsertSponsorshipProfile(user.userId, studentId, existing.centerId, { status });
  return { id: studentId };
}

// Done → student got the sponsorship/scholarship (migrates to Done list).
export const markSponsorshipDone = (user: JwtPayload, studentId: string) =>
  setSponsorshipStatus(user, studentId, 'done');

// Revert → back to the Pending list (same record, same id).
export const revertSponsorshipStudent = (user: JwtPayload, studentId: string) =>
  setSponsorshipStatus(user, studentId, 'pending');

// Include / exclude a student from the main admin dashboard's Sponsorship
// count — used to avoid double-counting a child who is already counted
// under Swayam 2. This only affects the DASHBOARD COUNT; the record and
// its data are never removed, and Pending ⇄ Done never resets this flag
// (checked by default, carries over automatically).
export async function setSponsorshipInclude(user: JwtPayload, studentId: string, include: boolean) {
  const program = await resolveSponsorshipProgram();
  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing || existing.programId !== program.id) throw new NotFoundError('Sponsorship student');
  await upsertSponsorshipProfile(user.userId, studentId, existing.centerId, { includeInCount: include });
  return { id: studentId, includeInCount: include };
}

export async function listSponsorshipData() {
  const program = await resolveSponsorshipProgram();
  const students = await prisma.student.findMany({
    where: { isActive: true, programId: program.id },
    orderBy: { createdAt: 'desc' },
  });

  const tpl = await prisma.formTemplate.findFirst({ where: { name: SPONSORSHIP_TEMPLATE_NAME } });
  const subs =
    tpl && students.length
      ? await prisma.formSubmission.findMany({
          where: { templateId: tpl.id, studentId: { in: students.map((s) => s.id) } },
          orderBy: { submittedAt: 'asc' },
          select: { studentId: true, data: true },
        })
      : [];
  const profiles = new Map<string, Record<string, unknown>>();
  for (const s of subs) {
    if (s.studentId) profiles.set(s.studentId, (s.data as Record<string, unknown>) || {});
  }

  const rows = students.map((s) => {
    const p = profiles.get(s.id) || {};
    return {
      id: s.id,
      fullName: s.fullName,
      gender: s.gender || '',
      phone: s.guardianPhone || '',
      age: typeof p.age === 'number' ? p.age : null,
      email: typeof p.email === 'string' ? p.email : '',
      area: typeof p.area === 'string' && p.area ? p.area : s.address || '',
      schoolName: s.collegeName || '',
      stream: s.stream || '',
      stdCourse: s.standard || '',
      animatorName: typeof p.animatorName === 'string' ? p.animatorName : '',
      donorName: typeof p.donorName === 'string' ? p.donorName : '',
      supportType: p.supportType === 'scholarship' ? 'scholarship' : 'sponsorship',
      status: p.status === 'done' ? 'done' : 'pending',
      // Default = included (checked). Only an explicit `false` excludes a
      // student from the main dashboard's Sponsorship count.
      includeInCount: p.includeInCount !== false,
    };
  });

  const pending = rows.filter((r) => r.status === 'pending');
  const done = rows.filter((r) => r.status === 'done');

  return {
    pending,
    done,
    counts: {
      total: rows.length,
      pending: pending.length,
      done: done.length,
      sponsorship: rows.filter((r) => r.supportType === 'sponsorship').length,
      scholarship: rows.filter((r) => r.supportType === 'scholarship').length,
      male: rows.filter((r) => r.gender === 'male').length,
      female: rows.filter((r) => r.gender === 'female').length,
      // How many of these are actually counted on the main admin dashboard
      // (checkbox unchecked = data kept, but excluded from that count).
      includedInDashboard: rows.filter((r) => r.includeInCount).length,
    },
  };
}

// ----------------------------------------------------------------------
// MAIN ADMIN DASHBOARD — corrected counts for Dropout / Re-enrolled /
// Sponsorship & Scholarship, used by reportService.getDashboardSummary()
// to override the raw per-program headcount:
//   - Dropout Students / Re-enrolled Students → only "school" dropoutType
//     counts (Center Dropout is tracked but excluded from this number).
//   - Sponsorship & Scholarship Students → only rows with includeInCount
//     !== false (coordinator unchecks a student here when they're already
//     counted under Swayam 2, to avoid double-counting the same child).
// Swayam 2's own count is left as the plain per-program headcount — no
// filtering — since nothing marks a Swayam 2 row as "already counted
// elsewhere".
// ----------------------------------------------------------------------
export async function getSwayamDashboardCounts(centerScope?: { in: string[] }) {
  const [dropProgram, reProgram, sponsorProgram] = await Promise.all([
    resolveDropoutProgram(),
    resolveReenrolledProgram(),
    resolveSponsorshipProgram(),
  ]);

  const [dropoutRows, sponsorshipRows] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true, centerId: centerScope, programId: { in: [dropProgram.id, reProgram.id] } },
      select: { id: true, programId: true },
    }),
    prisma.student.findMany({
      where: { isActive: true, centerId: centerScope, programId: sponsorProgram.id },
      select: { id: true },
    }),
  ]);

  const dropoutTpl = await prisma.formTemplate.findFirst({ where: { name: DROPOUT_TEMPLATE_NAME } });
  const dropoutSubs =
    dropoutTpl && dropoutRows.length
      ? await prisma.formSubmission.findMany({
          where: { templateId: dropoutTpl.id, studentId: { in: dropoutRows.map((s) => s.id) } },
          orderBy: { submittedAt: 'asc' },
          select: { studentId: true, data: true },
        })
      : [];
  const dropoutProfiles = new Map<string, Record<string, unknown>>();
  for (const s of dropoutSubs) {
    if (s.studentId) dropoutProfiles.set(s.studentId, (s.data as Record<string, unknown>) || {});
  }

  // Students whose dropout/re-enrolled record isn't flagged "school" yet
  // (Center Dropout, or not set at all), and sponsorship students the
  // coordinator has explicitly unchecked. These are excluded from
  // Program Distribution's dropout/re-enrolled/sponsorship counts, so we
  // also exclude them from Total Students / Center Breakdown — otherwise
  // those headline numbers wouldn't add up to what Program Distribution
  // shows.
  const hiddenStudentIds: string[] = [];

  let dropoutSchoolCount = 0;
  let reenrolledSchoolCount = 0;
  for (const s of dropoutRows) {
    const p = dropoutProfiles.get(s.id) || {};
    if (p.dropoutType !== 'school') {
      hiddenStudentIds.push(s.id);
      continue;
    }
    if (s.programId === dropProgram.id) dropoutSchoolCount++;
    else if (s.programId === reProgram.id) reenrolledSchoolCount++;
  }

  const sponsorTpl = await prisma.formTemplate.findFirst({ where: { name: SPONSORSHIP_TEMPLATE_NAME } });
  const sponsorSubs =
    sponsorTpl && sponsorshipRows.length
      ? await prisma.formSubmission.findMany({
          where: { templateId: sponsorTpl.id, studentId: { in: sponsorshipRows.map((s) => s.id) } },
          orderBy: { submittedAt: 'asc' },
          select: { studentId: true, data: true },
        })
      : [];
  const sponsorProfiles = new Map<string, Record<string, unknown>>();
  for (const s of sponsorSubs) {
    if (s.studentId) sponsorProfiles.set(s.studentId, (s.data as Record<string, unknown>) || {});
  }

  let sponsorshipIncludedCount = 0;
  for (const s of sponsorshipRows) {
    const p = sponsorProfiles.get(s.id) || {};
    if (p.includeInCount === false) {
      hiddenStudentIds.push(s.id); // explicit opt-out only — default is included
      continue;
    }
    sponsorshipIncludedCount++;
  }

  return {
    programIds: { dropout: dropProgram.id, reenrolled: reProgram.id, sponsorship: sponsorProgram.id },
    dropoutSchoolCount,
    reenrolledSchoolCount,
    sponsorshipIncludedCount,
    hiddenStudentIds,
  };
}
