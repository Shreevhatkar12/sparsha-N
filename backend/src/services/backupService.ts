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
async function syncStudents() {
  const yearLabel = await academicYearMap();

  const students = await prisma.student.findMany({
    include: {
      center: { select: { name: true } },
      program: { select: { name: true } },
      createdByUser: { select: { fullName: true } },
      examScores: {
        include: { exam: { select: { examType: true } } },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const avgFor = (scores: typeof students[number]["examScores"], matcher: (t: string) => boolean) => {
    const marks = scores.filter((s) => matcher(s.exam?.examType || "") && s.marks !== null).map((s) => Number(s.marks));
    if (marks.length === 0) return "";
    return (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1);
  };

  await writeSheet(
    "1. Students",
    [
      "Student ID", "Full Name", "Standard", "Center", "Program", "Academic Year",
      "Added By", "Guardian Name", "Guardian Phone", "Enrollment Date", "Active",
      "Baseline Avg", "Endline Avg", "AIP Baseline Avg", "AIP Endline Avg",
    ],
    students.map((s) => [
      s.id,
      s.fullName,
      s.standard || "",
      s.center?.name || "",
      s.program?.name || "",
      s.academicYearId ? yearLabel.get(s.academicYearId) || "" : "",
      s.createdByUser?.fullName || "",
      s.guardianName || "",
      s.guardianPhone || "",
      d(s.enrollmentDate),
      s.isActive ? "Yes" : "No",
      avgFor(s.examScores, (t) => /baseline/i.test(t) && !/aip/i.test(t)),
      avgFor(s.examScores, (t) => /endline/i.test(t) && !/aip/i.test(t)),
      avgFor(s.examScores, (t) => /aip/i.test(t) && /baseline/i.test(t)),
      avgFor(s.examScores, (t) => /aip/i.test(t) && /endline/i.test(t)),
    ]),
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
  const tpl = await prisma.formTemplate.findFirst({ where: { name: "Sehat Health Camps" } });
  if (!tpl) {
    await writeSheet("6. Health Camps", ["Camp Name / Type", "Date", "Time", "Hospital", "Doctors", "Area", "Audience", "Students Recorded"], []);
    return;
  }

  const camps = await prisma.formSubmission.findMany({ where: { templateId: tpl.id }, orderBy: { submittedAt: "desc" } });

  await writeSheet(
    "6. Health Camps",
    ["Camp Type", "Date", "Time", "Hospital", "Doctors", "Area", "Audience", "Students Recorded"],
    camps.map((c) => {
      const data = (c.data || {}) as Record<string, any>;
      const recordsCount = data.records && typeof data.records === "object" ? Object.keys(data.records).length : 0;
      return [
        String(data.campType || ""),
        String(data.date || ""),
        String(data.time || ""),
        String(data.hospital || ""),
        Array.isArray(data.doctors) ? data.doctors.join(", ") : "",
        String(data.area || ""),
        String(data.audience || ""),
        recordsCount,
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
    include: { center: { select: { name: true } } },
  });
  const inactiveUsers = await prisma.user.findMany({ where: { isActive: false } });

  const newRows: (string | number | boolean | null)[][] = [];

  for (const s of inactiveStudents) {
    if (alreadyLogged.has(s.id)) continue;
    newRows.push([s.id, "Student", s.fullName, s.center?.name || "", s.updatedAt.toISOString(), "Deactivated / dropped out"]);
  }
  for (const u of inactiveUsers) {
    if (alreadyLogged.has(u.id)) continue;
    newRows.push([u.id, "User", u.fullName, u.role, u.updatedAt.toISOString(), "Deactivated"]);
  }

  await appendToSheet(tab, ["ID", "Type", "Name", "Center / Role", "Detected At", "Note"], newRows);
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
