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

  return { fullName, age, currentStd, stream, prevMarks, prevSchool, phone, guardianName, gender, aadharNumber, locationType, centerId, area };
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
        prevMarks: typeof p.prevMarks === 'string' ? p.prevMarks : '',
        locationType: isOut ? 'out' : 'in',
        area: typeof p.area === 'string' && p.area ? p.area : isOut ? s.address || '' : '',
      };
    }),
  };
}
