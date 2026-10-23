import prisma from "../lib/prisma.js";
import { writeSheet, appendToSheet, readColumnA, isBackupConfigured, getSheetUrl } from "../lib/googleSheets.js";

// In-memory sync status (reset on server restart — fine, since the cron job
// re-syncs every 15 minutes anyway and this is only used to show "last
// synced X ago" in the UI, not as a source of truth for the data itself).
let lastSyncAt: Date | null = null;
let lastSyncStatus: "idle" | "running" | "success" | "error" = "idle";
let lastSyncError: string | null = null;

export function getBackupStatus() {
  return {
    configured: isBackupConfigured(),
    sheetUrl: getSheetUrl(),
    lastSyncAt,
    lastSyncStatus,
    lastSyncError,
  };
}

const d = (v: Date | null | undefined) => (v ? v.toISOString().slice(0, 10) : "");

async function academicYearMap() {
  const years = await prisma.academicYear.findMany({ select: { id: true, label: true } });
  return new Map(years.map((y) => [y.id, y.label] as const));
}

// ─────────────────────────── 1. Students ───────────────────────────
// Per-student roster with who added them + their Baseline/Endline/AIP exam
// averages, so it reads as a full academic snapshot per child.
// Indian school-year convention: June (month index 5, 0-based) through May
// is one academic year. This is computed live from each student's
// enrollment date, so it never needs manual upkeep — next year's new
// admissions automatically get labelled "2027-28" and so on.
function academicYearLabel(date: Date | null | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth(); // 0 = Jan
  const startYear = m >= 5 ? y : y - 1; // June (5) onward starts the new academic year
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

// ─────────────────────────── 1. Students ───────────────────────────
// Active students only (matches the Dashboard's "Total Students" count),
// with a subject-wise breakdown for Baseline/Endline/AIP Baseline/AIP
// Endline exams — not just a single blended average.
async function syncStudents() {
  const students = await prisma.student.findMany({
    where: { isActive: true },
    include: {
      center: { select: { name: true } },
      program: { select: { name: true } },
      createdByUser: { select: { fullName: true } },
      examScores: {
        include: {
          exam: { select: { examType: true, examDate: true, createdAt: true } },
          subject: { select: { name: true, maxMarks: true } },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  type ScoreRow = typeof students[number]["examScores"][number];

  const examWhen = (s: ScoreRow): Date | null => s.exam?.examDate || s.exam?.createdAt || null;

  // Collapse the many spellings of a subject into the 3 core columns.
  const canonSubject = (name: string): "English" | "Maths" | "EVS/Science" | "Other" => {
    if (/eng/i.test(name)) return "English";
    if (/math/i.test(name)) return "Maths";
    if (/sci|evs/i.test(name)) return "EVS/Science";
    return "Other";
  };

  const fmt = (s: ScoreRow) =>
    `${Number(s.marks)}/${s.subject?.maxMarks !== undefined ? Number(s.subject.maxMarks) : "?"}`;

  const calcAvg = (list: ScoreRow[]) => {
    const pcts = list
      .filter((s) => s.subject?.maxMarks)
      .map((s) => (Number(s.marks) / Number(s.subject!.maxMarks)) * 100);
    return pcts.length ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : "";
  };

  const matchScores = (scores: ScoreRow[], matcher: (t: string) => boolean) =>
    scores.filter((s) => matcher(s.exam?.examType || "") && s.marks !== null);

  const latestDate = (list: ScoreRow[]): string => {
    let best: Date | null = null;
    for (const s of list) {
      const w = examWhen(s);
      if (w && (!best || w > best)) best = w;
    }
    return d(best);
  };

  // Sem Baseline / Endline: one column per core subject (latest entry wins if a subject repeats).
  const perSubject = (scores: ScoreRow[], matcher: (t: string) => boolean) => {
    const matched = matchScores(scores, matcher);
    const latest = new Map<string, ScoreRow>();
    const others: ScoreRow[] = [];
    for (const s of matched) {
      const key = canonSubject(s.subject?.name || "");
      if (key === "Other") { others.push(s); continue; }
      const prev = latest.get(key);
      const w = examWhen(s);
      const pw = prev ? examWhen(prev) : null;
      if (!prev || (w && (!pw || w >= pw))) latest.set(key, s);
    }
    const used = [...latest.values(), ...others];
    return {
      date: latestDate(matched),
      english: latest.has("English") ? fmt(latest.get("English")!) : "",
      maths: latest.has("Maths") ? fmt(latest.get("Maths")!) : "",
      evs: latest.has("EVS/Science") ? fmt(latest.get("EVS/Science")!) : "",
      other: others.map((s) => `${s.subject?.name || "Subject"}: ${fmt(s)}`).join(", "),
      avg: calcAvg(used),
    };
  };

  // AIP: single-subject monthly exams stay as one text cell.
  const aipBreakdown = (scores: ScoreRow[], matcher: (t: string) => boolean) => {
    const matched = matchScores(scores, matcher);
    return {
      date: latestDate(matched),
      detail: matched.map((s) => `${s.subject?.name || "Subject"}: ${fmt(s)}`).join(", "),
      avg: calcAvg(matched),
    };
  };

  const cap = (g: unknown) => (g ? String(g).charAt(0).toUpperCase() + String(g).slice(1) : "");

  await writeSheet(
    "1. Students",
    [
      "Student ID", "Full Name", "Gender", "Standard", "Center", "Program", "Academic Year",
      "Added By", "Guardian Name", "Guardian Phone", "Enrollment Date", "Active",
      "Baseline Date", "Baseline English", "Baseline Maths", "Baseline EVS/Science", "Baseline Other Subjects", "Baseline Avg",
      "Endline Date", "Endline English", "Endline Maths", "Endline EVS/Science", "Endline Other Subjects", "Endline Avg",
      "AIP Baseline Date", "AIP Baseline (subject-wise)", "AIP Baseline Avg",
      "AIP Endline Date", "AIP Endline (subject-wise)", "AIP Endline Avg",
    ],
    students.map((s) => {
      const baseline = perSubject(s.examScores, (t) => /baseline/i.test(t) && !/aip/i.test(t));
      const endline = perSubject(s.examScores, (t) => /endline/i.test(t) && !/aip/i.test(t));
      const aipBaseline = aipBreakdown(s.examScores, (t) => /aip/i.test(t) && /baseline/i.test(t));
      const aipEndline = aipBreakdown(s.examScores, (t) => /aip/i.test(t) && /endline/i.test(t));
      return [
        s.id,
        s.fullName,
        cap(s.gender),
        s.standard || "",
        s.center?.name || "",
        s.program?.name || "",
        academicYearLabel(s.enrollmentDate || s.createdAt),
        s.createdByUser?.fullName || "",
        s.guardianName || "",
        s.guardianPhone || "",
        d(s.enrollmentDate),
        s.isActive ? "Yes" : "No",
        baseline.date, baseline.english, baseline.maths, baseline.evs, baseline.other, baseline.avg,
        endline.date, endline.english, endline.maths, endline.evs, endline.other, endline.avg,
        aipBaseline.date, aipBaseline.detail, aipBaseline.avg,
        aipEndline.date, aipEndline.detail, aipEndline.avg,
      ];
    }),
  );
}

// ─────────────────────────── 2. Meetings (Parent + Student) ───────────────────────────
async function syncMeetings() {
  const [studentMeetings, parentMeetings] = await Promise.all([
    prisma.studentMeeting.findMany({
      include: {
        center: { select: { name: true } },
        program: { select: { name: true } },
        createdByUser: { select: { fullName: true } },
        attendance: { select: { isPresent: true } },
      },
      orderBy: { meetingDate: "desc" },
    }),
    prisma.parentMeeting.findMany({
      include: {
        center: { select: { name: true } },
        program: { select: { name: true } },
        createdByUser: { select: { fullName: true } },
        attendance: { select: { id: true } },
      },
      orderBy: { meetingDate: "desc" },
    }),
  ]);

  const rows: (string | number | boolean | null)[][] = [];

  for (const m of studentMeetings) {
    const present = m.attendance.filter((a) => a.isPresent).length;
    rows.push([
      "Student Meeting", m.topic, d(m.meetingDate), m.meetingTime || "", m.center?.name || "", m.program?.name || "",
      m.standard, m.description || "", m.createdByUser?.fullName || "", `${present} present / ${m.attendance.length} total`,
    ]);
  }
  for (const m of parentMeetings) {
    rows.push([
      "Parent Meeting", m.topic, d(m.meetingDate), m.meetingTime || "", m.center?.name || "", m.program?.name || "",
      m.standard, m.description || "", m.createdByUser?.fullName || "", `${m.attendance.length} parents attended`,
    ]);
  }

  await writeSheet(
    "2. Meetings",
    ["Type", "Topic", "Date", "Time", "Center", "Program", "Standard", "Description", "Conducted By", "Attendance"],
    rows,
  );
}

// ─────────────────────────── 3. Attendance ───────────────────────────
async function syncAttendance() {
  const records = await prisma.attendanceRecord.findMany({
    include: {
      student: { select: { fullName: true } },
      center: { select: { name: true } },
      session: {
        select: {
          sessionDate: true,
          academicYearId: true,
          program: { select: { name: true } },
          activity: { select: { name: true } },
          createdByUser: { select: { fullName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20000, // safety cap so a huge history doesn't blow past Sheets' limits
  });

  const yearLabel = await academicYearMap();

  await writeSheet(
    "3. Attendance",
    ["Record ID", "Date", "Academic Year", "Student ID", "Student Name", "Center", "Program", "Activity", "Status", "Marked By"],
    records.map((r) => [
      r.id,
      d(r.session?.sessionDate ?? null),
      r.session?.academicYearId ? yearLabel.get(r.session.academicYearId) || "" : "",
      r.studentId,
      r.student?.fullName || "",
      r.center?.name || "",
      r.session?.program?.name || "",
      r.session?.activity?.name || "",
      r.status,
      r.session?.createdByUser?.fullName || "",
    ]),
  );
}

// ─────────────────────────── 4. Dropout & Re-enrolled ───────────────────────────
async function syncDropouts() {
  const [droppedStudents, transfers] = await Promise.all([
    prisma.student.findMany({
      where: { OR: [{ isActive: false }, { transferStatus: { not: "active" } }] },
      include: { center: { select: { name: true } }, program: { select: { name: true } } },
    }),
    prisma.studentTransfer.findMany({
      include: {
        student: { select: { fullName: true } },
        fromCenter: { select: { name: true } },
        toCenter: { select: { name: true } },
        approvedByUser: { select: { fullName: true } },
      },
      orderBy: { transferDate: "desc" },
    }),
  ]);

  const rows: (string | number | boolean | null)[][] = [];

  for (const s of droppedStudents) {
    rows.push([
      "Dropout / Inactive", s.id, s.fullName, s.center?.name || "", s.program?.name || "",
      s.standard || "", s.transferStatus, s.isActive ? "Yes" : "No", "", "", "",
    ]);
  }
  for (const t of transfers) {
    rows.push([
      "Transfer / Re-enrolled", t.studentId, t.student?.fullName || "", t.toCenter?.name || "", "",
      "", "", "", d(t.transferDate), t.fromCenter?.name || "", `${t.reason || ""} (approved by ${t.approvedByUser?.fullName || "?"})`,
    ]);
  }

  await writeSheet(
    "4. Dropout & Reenrolled",
    ["Event Type", "Student ID", "Name", "Center", "Program", "Standard", "Transfer Status", "Currently Active", "Transfer Date", "From Center", "Notes"],
    rows,
  );
}

// ─────────────────────────── 5. Sponsorship & Scholarship ───────────────────────────
async function syncSponsorship() {
  const tpl = await prisma.formTemplate.findFirst({ where: { name: "Sponsorship Profile" } });
  if (!tpl) {
    await writeSheet("5. Sponsorship & Scholarship", ["Student ID", "Name", "Center", "Standard", "Support Type", "Status", "Donor", "Animator", "Area"], []);
    return;
  }

  const subs = await prisma.formSubmission.findMany({
    where: { templateId: tpl.id },
    include: { student: { select: { fullName: true, standard: true } }, center: { select: { name: true } } },
    orderBy: { submittedAt: "desc" },
  });

  await writeSheet(
    "5. Sponsorship & Scholarship",
    ["Student ID", "Name", "Center", "Standard", "Support Type", "Status", "Donor", "Animator", "Area"],
    subs.map((s) => {
      const data = (s.data || {}) as Record<string, unknown>;
      return [
        s.studentId || "",
        s.student?.fullName || "",
        s.center?.name || "",
        s.student?.standard || "",
        String(data.supportType || ""),
        String(data.status || "pending"),
        String(data.donorName || ""),
        String(data.animatorName || ""),
        String(data.area || ""),
      ];
    }),
  );
}

// ─────────────────────────── 6. Health Camps (Sehat) ───────────────────────────
async function syncHealthCamps() {
  const headers = [
    "Camp Type", "Date", "Time", "Hospital", "Doctors", "Area", "Audience", "Students Recorded",
    "Swayam Count", "Shiksha Count", "Sanskar Count", "Center-wise Breakdown",
  ];
  const tpl = await prisma.formTemplate.findFirst({ where: { name: "Sehat Health Camps" } });
  if (!tpl) {
    await writeSheet("6. Health Camps", headers, []);
    return;
  }

  const camps = await prisma.formSubmission.findMany({ where: { templateId: tpl.id }, orderBy: { submittedAt: "desc" } });

  // Look up center + program of every student recorded in any camp (one query).
  const ids = new Set<string>();
  for (const c of camps) {
    const data = (c.data || {}) as Record<string, any>;
    if (data.records && typeof data.records === "object") Object.keys(data.records).forEach((k) => ids.add(k));
  }
  const studs = ids.size
    ? await prisma.student.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, center: { select: { name: true } }, program: { select: { name: true } } },
      })
    : [];
  const studMap = new Map(studs.map((s) => [s.id, s] as const));

  const progKey = (name: string): "Swayam" | "Shiksha" | "Sanskar" | null => {
    if (/swayam/i.test(name)) return "Swayam";
    if (/shiksha/i.test(name)) return "Shiksha";
    if (/sanskar/i.test(name)) return "Sanskar";
    return null;
  };

  await writeSheet(
    "6. Health Camps",
    headers,
    camps.map((c) => {
      const data = (c.data || {}) as Record<string, any>;
      const recKeys = data.records && typeof data.records === "object" ? Object.keys(data.records) : [];
      const totals = { Swayam: 0, Shiksha: 0, Sanskar: 0 };
      const byCenter = new Map<string, { Swayam: number; Shiksha: number; Sanskar: number }>();
      for (const id of recKeys) {
        const st = studMap.get(id);
        if (!st) continue;
        const pk = progKey(st.program?.name || "");
        if (!pk) continue;
        totals[pk] += 1;
        const cn = st.center?.name || "Unknown";
        const row = byCenter.get(cn) || { Swayam: 0, Shiksha: 0, Sanskar: 0 };
        row[pk] += 1;
        byCenter.set(cn, row);
      }
      const breakdown = [...byCenter.entries()]
        .map(([cn, r]) => {
          const parts = (["Swayam", "Shiksha", "Sanskar"] as const)
            .filter((k) => r[k] > 0)
            .map((k) => `${k} ${r[k]}`);
          return `${cn}: ${parts.join(", ")}`;
        })
        .join(" | ");
      return [
        String(data.campType || ""),
        String(data.date || ""),
        String(data.time || ""),
        String(data.hospital || ""),
        Array.isArray(data.doctors) ? data.doctors.join(", ") : "",
        String(data.area || ""),
        String(data.audience || ""),
        recKeys.length,
        totals.Swayam,
        totals.Shiksha,
        totals.Sanskar,
        breakdown,
      ];
    }),
  );
}

// ─────────────────────────── 7. Digital Literacy ───────────────────────────
async function syncDigitalLiteracy() {
  const program = await prisma.program.findFirst({ where: { code: "DIGITAL" } });
  if (!program) {
    await writeSheet("7. Digital Literacy", ["Student ID", "Name", "Standard", "Center", "Added By", "Active"], []);
    return;
  }

  const students = await prisma.student.findMany({
    where: { programId: program.id },
    include: { center: { select: { name: true } }, createdByUser: { select: { fullName: true } } },
    orderBy: { fullName: "asc" },
  });

  await writeSheet(
    "7. Digital Literacy",
    ["Student ID", "Name", "Standard", "Center", "Added By", "Active"],
    students.map((s) => [s.id, s.fullName, s.standard || "", s.center?.name || "", s.createdByUser?.fullName || "", s.isActive ? "Yes" : "No"]),
  );
}

// Append-only: anything that's now inactive (soft-deleted student, or a
// deactivated/former user) gets logged here permanently — so even after it
// drops off the live tabs, it stays recoverable.
async function syncDeletedLog() {
  const tab = "Deleted Records";
  const alreadyLogged = await readColumnA(tab);

  const inactiveStudents = await prisma.student.findMany({
    where: { isActive: false },
    include: { center: { select: { name: true } }, program: { select: { name: true } } },
  });
  const inactiveUsers = await prisma.user.findMany({ where: { isActive: false } });

  const newRows: (string | number | boolean | null)[][] = [];

  for (const s of inactiveStudents) {
    if (alreadyLogged.has(s.id)) continue;
    newRows.push([
      s.id, "Student", s.fullName, s.center?.name || "", s.program?.name || "",
      "No", s.updatedAt.toISOString(), "Deactivated / dropped out",
    ]);
  }
  for (const u of inactiveUsers) {
    if (alreadyLogged.has(u.id)) continue;
    newRows.push([u.id, "User", u.fullName, u.role, "", "No", u.updatedAt.toISOString(), "Deactivated"]);
  }

  await appendToSheet(tab, ["ID", "Type", "Name", "Center / Role", "Program", "Active", "Detected At", "Note"], newRows);
}

export async function runFullSync() {
  if (!isBackupConfigured()) {
    return { skipped: true, reason: "Google Sheets backup is not configured yet." };
  }

  lastSyncStatus = "running";
  try {
    await syncStudents();
    await syncMeetings();
    await syncAttendance();
    await syncDropouts();
    await syncSponsorship();
    await syncHealthCamps();
    await syncDigitalLiteracy();
    await syncDeletedLog();

    lastSyncAt = new Date();
    lastSyncStatus = "success";
    lastSyncError = null;
    return { skipped: false, success: true, syncedAt: lastSyncAt };
  } catch (error: any) {
    lastSyncStatus = "error";
    lastSyncError = error?.message || "Unknown error";
    console.error("Google Sheets backup sync failed:", error);
    return { skipped: false, success: false, error: lastSyncError };
  }
}
