// ============================================================
// SEHAT (HEALTH) MODULE — health camps for students & parents
// ('sehat' role = Sehat / health-camp coordinator; admins too)
// Zero-migration modeling: each camp = one FormSubmission whose
// JSON data holds the camp setup + a per-student records map.
// ============================================================

import prisma from '../lib/prisma.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import type { JwtPayload } from '../lib/auth.js';

const SEHAT_CAMP_TEMPLATE = 'Sehat Health Camps';

// Fixed camp types — anything else arrives as a custom name via "Other".
export const CAMP_TYPES = [
  'General Checkup',
  'ENT Checkup',
  'Special Eye Checkup',
  'Dental Checkup',
  'Blood - Hemoglobin Checkup',
];

type SehatBody = Record<string, unknown>;
type SehatRecord = Record<string, string | number | boolean | null>;

// ---------------- helpers ----------------

async function getSehatTemplate(userId: string) {
  let tpl = await prisma.formTemplate.findFirst({ where: { name: SEHAT_CAMP_TEMPLATE } });
  if (!tpl) {
    tpl = await prisma.formTemplate.create({
      data: {
        name: SEHAT_CAMP_TEMPLATE,
        formType: 'system',
        targetEntity: 'student',
        createdBy: userId,
        schema: { fields: [] },
      },
    });
  }
  return tpl;
}

const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const YN = (v: unknown): 'yes' | 'no' =>
  String(v ?? '').trim().toLowerCase() === 'yes' ? 'yes' : 'no';

function parseCampInput(body: SehatBody) {
  const hospital = String(body.hospital ?? '').trim();
  if (!hospital) throw new ValidationError('Hospital name is required');

  const doctorsRaw = Array.isArray(body.doctors) ? body.doctors : [];
  const doctors = doctorsRaw.map((d) => String(d ?? '').trim()).filter(Boolean);
  if (doctors.length === 0) throw new ValidationError('At least one doctor name is required');

  const date = String(body.date ?? '').trim();
  if (!date || Number.isNaN(new Date(date).getTime())) {
    throw new ValidationError('A valid camp date is required');
  }

  const time = String(body.time ?? '').trim();
  const area = String(body.area ?? '').trim();

  const centerIds = (Array.isArray(body.centerIds) ? body.centerIds : [])
    .map((c) => String(c ?? '').trim())
    .filter(Boolean);
  if (centerIds.length === 0) throw new ValidationError('Select at least one center');

  const programIds = (Array.isArray(body.programIds) ? body.programIds : [])
    .map((p) => String(p ?? '').trim())
    .filter(Boolean);
  if (programIds.length === 0) throw new ValidationError('Select at least one program');

  const audience = String(body.audience ?? '').trim().toLowerCase();
  if (audience !== 'student' && audience !== 'parent') {
    throw new ValidationError('Select the camp audience (Student / Parent)');
  }

  const campType = String(body.campType ?? '').trim();
  if (!campType) throw new ValidationError('Camp type is required');

  return { hospital, doctors, date, time, area, centerIds, programIds, audience, campType };
}

// Per-student record fields, cleaned. Absent → nothing else is stored.
const TEXT_FIELDS = [
  'height',
  'weight',
  'age',
  'remark',
  'rightEye',
  'leftEye',
  'hb',
  'bp',
  'parentName',
];
const YN_FIELDS = ['eye', 'nose', 'mouth', 'ear', 'throat', 'teeth', 'specs', 'medicine', 'problem'];
const HANDGRIP = ['issue', 'normal', 'strong'];

function parseRecords(raw: unknown): Record<string, SehatRecord> {
  const out: Record<string, SehatRecord> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [sid, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const e = value as Record<string, unknown>;
    const absent = e.absent === true;
    const rec: SehatRecord = { absent };
    if (!absent) {
      for (const k of TEXT_FIELDS) {
        const v = e[k];
        if (v != null && String(v).trim() !== '') rec[k] = String(v).trim();
      }
      for (const k of YN_FIELDS) {
        if (e[k] != null && e[k] !== '') rec[k] = YN(e[k]);
      }
      const grip = String(e.handgrip ?? '').trim().toLowerCase();
      if (HANDGRIP.includes(grip)) rec.handgrip = grip;
    }
    // Keep the row only if it says something (absent, or any filled field).
    if (absent || Object.keys(rec).length > 1) out[sid] = rec;
  }
  return out;
}

const participatedCount = (records: Record<string, unknown>): number =>
  Object.values(records).filter((r) => asObj(r).absent !== true).length;

// Standards in natural KG → 12th order for the fill screen.
const STD_ORDER = [
  'nursery', 'jr kg', 'sr kg', 'kg',
  '1st', '2nd', '3rd', '4th', '5th', '6th',
  '7th', '8th', '9th', '10th', '11th', '12th',
];
const stdRank = (v: string) => {
  const i = STD_ORDER.indexOf((v || '').trim().toLowerCase());
  return i === -1 ? STD_ORDER.length + 1 : i;
};
const byRoll = (a: { rollNumber: string | null; fullName: string }, b: { rollNumber: string | null; fullName: string }) => {
  const ra = (a.rollNumber || '').trim();
  const rb = (b.rollNumber || '').trim();
  if (ra && !rb) return -1;
  if (!ra && rb) return 1;
  if (ra && rb) {
    const cmp = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
  }
  return a.fullName.localeCompare(b.fullName);
};

function campRow(id: string, d: Record<string, unknown>, submittedAt: Date) {
  const records = asObj(d.records);
  const total = Object.keys(records).length;
  const participated = participatedCount(records);
  return {
    id,
    hospital: String(d.hospital ?? ''),
    doctors: Array.isArray(d.doctors) ? (d.doctors as unknown[]).map(String) : [],
    date: String(d.date ?? ''),
    time: String(d.time ?? ''),
    area: String(d.area ?? ''),
    centerIds: Array.isArray(d.centerIds) ? (d.centerIds as unknown[]).map(String) : [],
    programIds: Array.isArray(d.programIds) ? (d.programIds as unknown[]).map(String) : [],
    audience: String(d.audience ?? 'student'),
    campType: String(d.campType ?? ''),
    participated,
    absent: total - participated,
    totalRecords: total,
    submittedAt,
  };
}

// ---------------- CRUD ----------------

export async function createCamp(user: JwtPayload, body: SehatBody) {
  const input = parseCampInput(body);
  const records = parseRecords(body.records);
  const tpl = await getSehatTemplate(user.userId);

  const sub = await prisma.formSubmission.create({
    data: {
      templateId: tpl.id,
      centerId: input.centerIds[0], // anchor center (submission needs one)
      submittedBy: user.userId,
      data: { sehatCamp: true, ...input, records },
    },
  });
  return { id: sub.id };
}

export async function updateCamp(user: JwtPayload, id: string, body: SehatBody) {
  const tpl = await getSehatTemplate(user.userId);
  const sub = await prisma.formSubmission.findFirst({ where: { id, templateId: tpl.id } });
  if (!sub) throw new NotFoundError('Health camp');

  const prev = asObj(sub.data);

  const eff: SehatBody = {
    hospital: body.hospital ?? prev.hospital,
    doctors: body.doctors ?? prev.doctors,
    date: body.date ?? prev.date,
    time: body.time ?? prev.time,
    area: body.area ?? prev.area,
    centerIds: body.centerIds ?? prev.centerIds,
    programIds: body.programIds ?? prev.programIds,
    audience: body.audience ?? prev.audience,
    campType: body.campType ?? prev.campType,
  };
  const input = parseCampInput(eff);
  const records =
    body.records !== undefined ? parseRecords(body.records) : parseRecords(prev.records);

  await prisma.formSubmission.update({
    where: { id: sub.id },
    data: {
      centerId: input.centerIds[0],
      data: { sehatCamp: true, ...input, records },
    },
  });
  return { id };
}

export async function deleteCamp(_user: JwtPayload, id: string) {
  const tpl = await prisma.formTemplate.findFirst({ where: { name: SEHAT_CAMP_TEMPLATE } });
  if (!tpl) throw new NotFoundError('Health camp');
  const sub = await prisma.formSubmission.findFirst({ where: { id, templateId: tpl.id } });
  if (!sub) throw new NotFoundError('Health camp');
  await prisma.formSubmission.delete({ where: { id: sub.id } });
  return { success: true };
}

// ---------------- LIST ----------------

export async function listCamps(_user: JwtPayload) {
  const tpl = await prisma.formTemplate.findFirst({ where: { name: SEHAT_CAMP_TEMPLATE } });
  const zero = {
    totalCamps: 0,
    studentCamps: 0,
    parentCamps: 0,
    studentsParticipated: 0,
    parentsParticipated: 0,
  };
  if (!tpl) return { camps: [], counts: zero, campTypes: CAMP_TYPES };

  const subs = await prisma.formSubmission.findMany({
    where: { templateId: tpl.id },
    orderBy: { submittedAt: 'desc' },
    select: { id: true, data: true, submittedAt: true },
  });

  const [centers, programs] = await Promise.all([
    prisma.center.findMany({ select: { id: true, name: true } }),
    prisma.program.findMany({ select: { id: true, name: true } }),
  ]);
  const centerName = new Map(centers.map((c) => [c.id, c.name]));
  const programName = new Map(programs.map((p) => [p.id, p.name]));

  const camps = subs
    .map((s) => {
      const d = asObj(s.data);
      if (d.sehatCamp !== true) return null;
      const row = campRow(s.id, d, s.submittedAt);
      return {
        ...row,
        centerNames: row.centerIds.map((c) => centerName.get(c) || 'Center'),
        programNames: row.programIds.map((p) => programName.get(p) || 'Program'),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const counts = { ...zero };
  for (const c of camps) {
    counts.totalCamps += 1;
    if (c.audience === 'parent') {
      counts.parentCamps += 1;
      counts.parentsParticipated += c.participated;
    } else {
      counts.studentCamps += 1;
      counts.studentsParticipated += c.participated;
    }
  }

  return { camps, counts, campTypes: CAMP_TYPES };
}

// ---------------- ROSTER (fill / view screen) ----------------

export async function getCampRoster(user: JwtPayload, id: string) {
  const tpl = await getSehatTemplate(user.userId);
  const sub = await prisma.formSubmission.findFirst({ where: { id, templateId: tpl.id } });
  if (!sub) throw new NotFoundError('Health camp');

  const d = asObj(sub.data);
  const row = campRow(sub.id, d, sub.submittedAt);

  const students = await prisma.student.findMany({
    where: {
      centerId: { in: row.centerIds },
      programId: { in: row.programIds },
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      rollNumber: true,
      standard: true,
      center: { select: { id: true, name: true } },
    },
  });
  students.sort((a, b) => {
    const sr = stdRank(a.standard || '') - stdRank(b.standard || '');
    if (sr !== 0) return sr;
    return byRoll(a, b);
  });

  const [centers, programs] = await Promise.all([
    prisma.center.findMany({ where: { id: { in: row.centerIds } }, select: { id: true, name: true } }),
    prisma.program.findMany({ where: { id: { in: row.programIds } }, select: { id: true, name: true } }),
  ]);

  return {
    camp: {
      ...row,
      centerNames: centers.map((c) => c.name),
      programNames: programs.map((p) => p.name),
    },
    students,
    records: asObj(d.records),
  };
}

// ---------------- DASHBOARD ----------------

export async function sehatDashboard(user: JwtPayload) {
  const { camps, counts } = await listCamps(user);

  // Camps + participation grouped by camp type (for the labeled bar chart).
  const byTypeMap = new Map<string, { type: string; camps: number; participated: number }>();
  for (const c of camps) {
    const key = c.campType || 'Other';
    const cur = byTypeMap.get(key) || { type: key, camps: 0, participated: 0 };
    cur.camps += 1;
    cur.participated += c.participated;
    byTypeMap.set(key, cur);
  }

  return {
    counts,
    byType: Array.from(byTypeMap.values()),
    recent: camps.slice(0, 5).map((c) => ({
      id: c.id,
      campType: c.campType,
      audience: c.audience,
      date: c.date,
      hospital: c.hospital,
      participated: c.participated,
    })),
  };
}
