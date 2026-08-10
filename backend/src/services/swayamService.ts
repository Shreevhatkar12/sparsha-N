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
  // Soft delete — keeps history but removes from every list/report/count.
  await prisma.student.update({ where: { id: studentId }, data: { isActive: false } });
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

  const phone = String(body.phone ?? '').trim();
  if (phone && !/^\d{10}$/.test(phone)) {
    throw new ValidationError('Phone must be exactly 10 digits');
  }

  const aadharNumber = String(body.aadharNumber ?? '').trim();
  if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
    throw new ValidationError('Aadhar number must be exactly 12 digits');
  }

  const dropoutStd = String(body.dropoutStd ?? '').trim();
  if (!dropoutStd) throw new ValidationError('Dropout std is required');

  const dropoutYear = Number(body.dropoutYear);
  if (!Number.isInteger(dropoutYear) || dropoutYear < 2000 || dropoutYear > 2100) {
    throw new ValidationError('Valid dropout year is required (e.g. 2025)');
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

  return { fullName, age, gender, phone, aadharNumber, dropoutStd, dropoutYear, animatorName, reason, locationType, centerId, area };
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
  };
}

function parseReenrollInput(body: SwayamBody) {
  const school = String(body.school ?? '').trim();
  if (school.length < 2) throw new ValidationError('Re-enrolled school / college name is required');
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ValidationError('Valid re-enrolled year is required (e.g. 2026)');
  }
  const std = String(body.std ?? '').trim();
  if (!std) throw new ValidationError('Re-enrolled std is required');
  return { school, year, std };
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
