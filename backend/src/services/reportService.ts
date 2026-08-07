import type { Prisma } from "@prisma/client";
import prisma from '../lib/prisma.js';
import type { JwtPayload } from '../lib/auth.js';
import { ForbiddenError } from '../lib/errors.js';

// Helper to apply center scope safely
function getCenterScope(user: JwtPayload) {
  return user.role === "super_admin" ? undefined : { in: user.centerIds };
}

// ----------------------------------------------------------------------
// DASHBOARD
// ----------------------------------------------------------------------
export async function getDashboardSummary(user: JwtPayload) {
  const centerScope = getCenterScope(user);

  const [totalStudents, totalCentersList] = await Promise.all([
    prisma.student.count({
      where: { isActive: true, centerId: centerScope },
    }),
    prisma.center.findMany({
      where: { id: centerScope },
      select: { id: true, name: true }
    }),
  ]);

  const centerIds = centerScope ? user.centerIds : totalCentersList.map((c: any) => c.id);

  // Overall Attendance Rate (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentAttendance = await prisma.attendanceRecord.groupBy({
    by: ['status'],
    where: {
      centerId: centerScope,
      student: { isActive: true },
      session: { sessionDate: { gte: thirtyDaysAgo } }
    },
    _count: { status: true },
  });

  let present = 0, late = 0, totalAtt = 0;
  for (const group of recentAttendance) {
    if (group.status === 'present') present += group._count.status;
    if (group.status === 'late') late += group._count.status;
    totalAtt += group._count.status;
  }
  const overallAttendanceRate = totalAtt === 0 ? 0 : Math.round(((present + late) / totalAtt) * 100);

  // Center Breakdown
  const centerBreakdown = [];
  for (const center of totalCentersList) {
    const studentCount = await prisma.student.count({
      where: { centerId: center.id, isActive: true }
    });
    
    // rate for this specific center
    const cAtt = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { centerId: center.id, student: { isActive: true } },
      _count: { status: true },
    });
    let cp = 0, cl = 0, ct = 0;
    for (const g of cAtt) {
      if (g.status === 'present') cp += g._count.status;
      if (g.status === 'late') cl += g._count.status;
      ct += g._count.status;
    }
    const attendanceRate = ct === 0 ? 0 : Math.round(((cp + cl) / ct) * 100);

    centerBreakdown.push({
      centerId: center.id,
      name: center.name,
      studentCount,
      attendanceRate
    });
  }

  // Program Breakdown
  const programCounts = await prisma.student.groupBy({
    by: ['programId'],
    where: { centerId: centerScope, isActive: true },
    _count: { programId: true }
  });

  const programsMap = await prisma.program.findMany({
    where: { id: { in: programCounts.map((p: any) => p.programId) } },
    select: { id: true, name: true }
  });

  const programBreakdown = programCounts.map((pc: any) => {
    const p = programsMap.find((x: any) => x.id === pc.programId);
    return {
      programId: pc.programId,
      name: p?.name || 'Unknown',
      studentCount: pc._count.programId
    };
  });

  // Growth (new students this month)
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const newStudentsThisMonth = await prisma.student.count({
    where: { 
      centerId: centerScope, 
      isActive: true,
      enrollmentDate: { gte: firstOfMonth }
    }
  });

  return {
    totalStudents,
    totalCenters: totalCentersList.length,
    overallAttendanceRate,
    newStudentsThisMonth,
    centerBreakdown,
    programBreakdown
  };
}


// ----------------------------------------------------------------------
// ATTENDANCE ANALYTICS
// ----------------------------------------------------------------------
export async function getAttendanceAnalytics(user: JwtPayload, query: any) {
  const { centerId, programId, from, to } = query;
  if (!from || !to) throw new Error("from and to dates are required");

  const whereSession: Prisma.AttendanceSessionWhereInput = {
    sessionDate: { gte: new Date(from), lte: new Date(to) },
    centerId: getCenterScope(user)
  };

  if (centerId) whereSession.centerId = centerId;
  if (programId) whereSession.programId = programId;

  // Verify access for arbitrary centerId
  if (centerId && user.role !== "super_admin" && !user.centerIds.includes(centerId as string)) {
    throw new ForbiddenError("No access to requested center");
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: whereSession,
    include: {
      records: {
        where: { student: { isActive: true } },
        include: { student: { select: { fullName: true } } }
      }
    }
  });

  let totalPresent = 0, totalAbsent = 0, totalLate = 0;
  
  const byDateMap = new Map<string, any>();
  const byStudentMap = new Map<string, any>();

  for (const session of sessions) {
    const dStr = session.sessionDate.toISOString().split('T')[0];
    if (!byDateMap.has(dStr)) {
      byDateMap.set(dStr, { date: dStr, presentCount: 0, absentCount: 0, lateCount: 0, rate: 0 });
    }
    const dObj = byDateMap.get(dStr);

    for (const record of session.records) {
      // Global counts
      if (record.status === 'present') totalPresent++;
      else if (record.status === 'absent') totalAbsent++;
      else if (record.status === 'late') totalLate++;

      // Date counts
      if (record.status === 'present') dObj.presentCount++;
      else if (record.status === 'absent') dObj.absentCount++;
      else if (record.status === 'late') dObj.lateCount++;

      // Student counts
      if (!byStudentMap.has(record.studentId)) {
        byStudentMap.set(record.studentId, {
          studentId: record.studentId,
          fullName: record.student.fullName,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          rate: 0
        });
      }
      const sObj = byStudentMap.get(record.studentId);
      if (record.status === 'present') sObj.presentCount++;
      else if (record.status === 'absent') sObj.absentCount++;
      else if (record.status === 'late') sObj.lateCount++;
    }
  }

  const totalRecs = totalPresent + totalAbsent + totalLate;
  const averageAttendanceRate = totalRecs === 0 ? 0 : Math.round(((totalPresent + totalLate) / totalRecs) * 100);

  const byDate = Array.from(byDateMap.values()).map(d => {
    const total = d.presentCount + d.absentCount + d.lateCount;
    d.rate = total === 0 ? 0 : Math.round(((d.presentCount + d.lateCount) / total) * 100);
    return d;
  });

  const byStudent = Array.from(byStudentMap.values()).map(s => {
    const total = s.presentCount + s.absentCount + s.lateCount;
    s.rate = total === 0 ? 0 : Math.round(((s.presentCount + s.lateCount) / total) * 100);
    return s;
  });

  byStudent.sort((a, b) => a.rate - b.rate); // lowest ascending

  return {
    summary: {
      totalSessions: sessions.length,
      averageAttendanceRate,
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate
    },
    byDate,
    byStudent
  };
}

// ----------------------------------------------------------------------
// EXAM ANALYTICS
// ----------------------------------------------------------------------
export async function getExamAnalytics(user: JwtPayload, query: any) {
  const { centerId, programId, academicYear } = query;
  if (!academicYear) throw new Error("academicYear is required");

  // Fetch all qualifying exams and scores
  const whereExam: Prisma.ExamWhereInput = {
    academicYear: { label: { contains: academicYear } },
    centerId: getCenterScope(user)
  };
  if (centerId) {
    if (user.role !== "super_admin" && !user.centerIds.includes(centerId as string)) throw new ForbiddenError("Denied");
    whereExam.centerId = centerId;
  }
  if (programId) whereExam.programId = programId;

  const exams = await prisma.exam.findMany({
    where: whereExam,
    include: {
      scores: {
        where: { student: { isActive: true } },
        include: { student: { select: { fullName: true } }, subject: true }
      }
    }
  });

  const baseline = { english: { values: [] as number[], avg: 0, min: 0, max: 0 }, maths: { values: [] as number[], avg: 0, min: 0, max: 0 }, science: { values: [] as number[], avg: 0, min: 0, max: 0 } };
  const endline = { english: { values: [] as number[], avg: 0, min: 0, max: 0 }, maths: { values: [] as number[], avg: 0, min: 0, max: 0 }, science: { values: [] as number[], avg: 0, min: 0, max: 0 } };

  const studentMap = new Map<string, any>();

  for (const exam of exams) {
    const targetObj = exam.examType === 'baseline' ? baseline : endline;
    
    for (const score of exam.scores) {
      if (!score.marks || !score.subject) continue;
      const val = Number(score.marks);
      const sub = score.subject.name.toLowerCase() as 'english' | 'maths' | 'science';

      if (targetObj[sub]) {
        targetObj[sub].values.push(val);
      }

      if (!studentMap.has(score.studentId)) {
        studentMap.set(score.studentId, { studentId: score.studentId, fullName: score.student.fullName, baselineTotal: 0, endlineTotal: 0, delta: 0 });
      }
      const sObj = studentMap.get(score.studentId);
      if (exam.examType === 'baseline') sObj.baselineTotal += val;
      else sObj.endlineTotal += val;
    }
  }

  // Calc metrics
  for (const t of [baseline, endline]) {
    for (const k of ['english', 'maths', 'science'] as const) {
      const v = t[k].values;
      if (v.length > 0) {
        t[k].avg = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
        t[k].min = Math.min(...v);
        t[k].max = Math.max(...v);
      }
    }
  }

  const improvement = {
    english: endline.english.avg - baseline.english.avg,
    maths: endline.maths.avg - baseline.maths.avg,
    science: endline.science.avg - baseline.science.avg,
  };

  const studentPerformance = Array.from(studentMap.values()).map(s => {
    s.delta = s.endlineTotal - s.baselineTotal;
    return s;
  });

  studentPerformance.sort((a, b) => b.delta - a.delta); // ascending logic for most improved last

  return {
    baseline: { english: { avg: baseline.english.avg, min: baseline.english.min, max: baseline.english.max }, maths: { avg: baseline.maths.avg, min: baseline.maths.min, max: baseline.maths.max }, science: { avg: baseline.science.avg, min: baseline.science.min, max: baseline.science.max } },
    endline: { english: { avg: endline.english.avg, min: endline.english.min, max: endline.english.max }, maths: { avg: endline.maths.avg, min: endline.maths.min, max: endline.maths.max }, science: { avg: endline.science.avg, min: endline.science.min, max: endline.science.max } },
    improvement,
    studentPerformance: studentPerformance.reverse() // smallest last initially reversed, actually sort wants most improved last, which means min at index 0
  };
}

// ----------------------------------------------------------------------
// SKILLS REPORT (no dedicated Skill model — averages from exam scores + skill-like forms)
// ----------------------------------------------------------------------
export async function getSkillsReport(user: JwtPayload, query: { centerId?: string; programId?: string }) {
  if (query.centerId && user.role !== "super_admin" && !user.centerIds.includes(query.centerId as string)) {
    throw new ForbiddenError("No access to requested center");
  }

  const centerFilter = query.centerId
    ? query.centerId
    : user.role === "super_admin"
      ? undefined
      : { in: user.centerIds };

  const studentWhere: Prisma.StudentWhereInput = {
    isActive: true,
    ...(centerFilter ? { centerId: centerFilter as string } : user.role === "super_admin" ? {} : { centerId: { in: user.centerIds } }),
    ...(query.programId ? { programId: query.programId as string } : {}),
  };

  const scores = await prisma.examScore.findMany({
    where: {
      student: studentWhere,
    },
    select: {
      subject: true,
      marks: true,
    },
  });

  const bySubject = new Map<string, { sum: number; count: number }>();
  for (const row of scores) {
    if (row.marks === null || !row.subject) continue;
    const key = row.subject.name.toLowerCase();
    const prev = bySubject.get(key) ?? { sum: 0, count: 0 };
    prev.sum += Number(row.marks);
    prev.count += 1;
    bySubject.set(key, prev);
  }

  const fromExamScoresBySubject = [...bySubject.entries()].map(([subject, { sum, count }]) => ({
    subject,
    averageMarks: count ? Number((sum / count).toFixed(2)) : 0,
    sampleSize: count,
  }));

  const skillTemplates = await prisma.formTemplate.findMany({
    where: {
      isActive: true,
      formType: { contains: "skill", mode: "insensitive" },
    },
    select: { id: true, name: true, formType: true },
  });

  const skillAveragesByTemplate: Array<{
    templateId: string;
    name: string;
    formType: string;
    fieldAverages: Record<string, number>;
    submissionCount: number;
  }> = [];

  for (const tpl of skillTemplates) {
    const submissions = await prisma.formSubmission.findMany({
      where: {
        templateId: tpl.id,
        student: studentWhere,
      },
      select: { data: true },
    });

    const numericSums = new Map<string, { sum: number; n: number }>();
    for (const sub of submissions) {
      const data = sub.data as Record<string, unknown>;
      if (!data || typeof data !== "object") continue;
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === "number" && !Number.isNaN(v)) {
          const cur = numericSums.get(k) ?? { sum: 0, n: 0 };
          cur.sum += v;
          cur.n += 1;
          numericSums.set(k, cur);
        }
      }
    }

    const fieldAverages: Record<string, number> = {};
    for (const [k, { sum, n }] of numericSums) {
      fieldAverages[k] = n ? Number((sum / n).toFixed(2)) : 0;
    }

    skillAveragesByTemplate.push({
      templateId: tpl.id,
      name: tpl.name,
      formType: tpl.formType,
      fieldAverages,
      submissionCount: submissions.length,
    });
  }

  return {
    fromExamScoresBySubject,
    skillAveragesByTemplate,
  };
}


// ----------------------------------------------------------------------
// STUDENTS FILTER
// ----------------------------------------------------------------------
export async function getFilteredStudents(user: JwtPayload, query: any) {
  const { centerId, programId, ageMin, ageMax, gender, attendanceRateMin, attendanceRateMax, examScoreMin, examScoreMax } = query;
  
  if (centerId && user.role !== "super_admin" && !user.centerIds.includes(centerId as string)) throw new ForbiddenError("Denied");

  const whereStudent: Prisma.StudentWhereInput = {
    centerId: centerId ? (centerId as string) : getCenterScope(user),
    isActive: true
  };
  if (programId) whereStudent.programId = programId as string;
  if (gender) whereStudent.gender = gender as any;

  if (ageMin || ageMax) {
    const now = new Date();
    whereStudent.dob = {};
    if (ageMin) {
      const d = new Date(); d.setFullYear(now.getFullYear() - Number(ageMin));
      whereStudent.dob.lte = d;
    }
    if (ageMax) {
      const d = new Date(); d.setFullYear(now.getFullYear() - Number(ageMax) - 1);
      whereStudent.dob.gte = d;
    }
  }

  const rawStudents = await prisma.student.findMany({
    where: whereStudent,
    include: {
      attendanceRecords: true,
      examScores: true
    }
  });

  const aMin = attendanceRateMin ? Number(attendanceRateMin) : 0;
  const aMax = attendanceRateMax ? Number(attendanceRateMax) : 100;
  const eMin = examScoreMin ? Number(examScoreMin) : 0;
  const eMax = examScoreMax ? Number(examScoreMax) : 100;

  const results = [];
  for (const s of rawStudents) {
    // Math logic attendance
    const tAtt = s.attendanceRecords.length;
    const pAtt = s.attendanceRecords.filter((x: any) => x.status === 'present' || x.status === 'late').length;
    const aRate = tAtt === 0 ? 0 : Math.round((pAtt / tAtt) * 100);

    // Math logic exam
    const tEx = s.examScores.length;
    const validScores = s.examScores.filter((x: any) => x.marks !== null).map((x: any) => Number(x.marks) / Number(x.maxMarks));
    const eRate = validScores.length === 0 ? 0 : Math.round((validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length) * 100);

    if (aRate >= aMin && aRate <= aMax && eRate >= eMin && eRate <= eMax) {
      results.push({
        id: s.id,
        fullName: s.fullName,
        centerId: s.centerId,
        programId: s.programId,
        attendanceRate: aRate,
        avgExamScore: eRate
      });
    }
  }

  return results;
}

// ----------------------------------------------------------------------
// EXPORT (CSV)
// ----------------------------------------------------------------------
export async function exportStudentDataCsv(user: JwtPayload, query: any): Promise<string> {
  const data = await getFilteredStudents(user, query); // reuse the same broad logic
  
  if (data.length === 0) return "id,fullName,centerId,programId,attendanceRate,avgExamScore\n";

  const headers = "id,fullName,centerId,programId,attendanceRate,avgExamScore\n";
  const rows = data.map(d =>
    `"${d.id}","${d.fullName}","${d.centerId}","${d.programId}",${d.attendanceRate},${d.avgExamScore}`
  ).join("\n");

  return headers + rows;
}

// ----------------------------------------------------------------------
// TEACHER SELF DASHBOARD
// Scoped strictly to the students the teacher registered (createdById).
// "Maze students, other nahi." Admin dashboard is untouched.
// ----------------------------------------------------------------------

const TD_STD_ORDER = [
  "Jr KG", "Sr KG", "KG",
  "1st", "2nd", "3rd", "4th", "5th", "6th",
  "7th", "8th", "9th", "10th", "11th", "12th",
];

function tdStandardRank(std: string): number {
  const idx = TD_STD_ORDER.findIndex(
    (s) => s.toLowerCase() === (std || "").trim().toLowerCase(),
  );
  return idx === -1 ? 500 : idx;
}

function tdMonthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const TD_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function tdMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${TD_MONTHS[Number(m) - 1]} ${y}`;
}

const TD_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolve the time window for analytics. Default = current month. Year mode
// widens it to the whole year. All time-based data is filtered to [start, end).
function tdResolvePeriod(query: any): {
  start: Date;
  end: Date;
  period: "month" | "year";
  label: string;
} {
  const period = query?.period === "year" ? "year" : "month";
  const now = new Date();
  if (period === "year") {
    let y = now.getUTCFullYear();
    if (typeof query?.year === "string" && /^\d{4}$/.test(query.year)) y = Number(query.year);
    return {
      start: new Date(Date.UTC(y, 0, 1)),
      end: new Date(Date.UTC(y + 1, 0, 1)),
      period,
      label: String(y),
    };
  }
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth();
  if (typeof query?.month === "string" && /^\d{4}-\d{2}$/.test(query.month)) {
    const [yy, mm] = query.month.split("-").map(Number);
    y = yy;
    m = mm - 1;
  }
  return {
    start: new Date(Date.UTC(y, m, 1)),
    end: new Date(Date.UTC(y, m + 1, 1)),
    period,
    label: tdMonthLabel(`${y}-${String(m + 1).padStart(2, "0")}`),
  };
}

const tdInRange = (d: Date | null | undefined, start: Date, end: Date) =>
  !!d && d >= start && d < end;

export async function getTeacherDashboard(user: JwtPayload, query: any) {
  const userId = user.userId;

  // ---- parse filters -------------------------------------------------
  const rawCenter =
    typeof query.centerId === "string" && query.centerId ? query.centerId : undefined;
  const rawProgram =
    typeof query.programId === "string" && query.programId ? query.programId : undefined;
  const safeCenter = rawCenter && TD_UUID_RE.test(rawCenter) ? rawCenter : undefined;
  const safeProgram = rawProgram && TD_UUID_RE.test(rawProgram) ? rawProgram : undefined;

  let standards: string[] = [];
  if (typeof query.standards === "string" && query.standards.trim()) {
    standards = query.standards
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  } else if (Array.isArray(query.standards)) {
    standards = (query.standards as unknown[]).filter(
      (s): s is string => typeof s === "string" && s.length > 0,
    );
  }

  const { start, end, period, label: periodLabel } = tdResolvePeriod(query);

  // ---- teacher identity ---------------------------------------------
  const teacher = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  const teacherName = teacher?.fullName ?? "Teacher";

  // ---- all my students (single fetch, filter in memory) --------------
  const allMine = await prisma.student.findMany({
    where: { isActive: true, createdById: userId },
    select: {
      id: true,
      gender: true,
      standard: true,
      centerId: true,
      programId: true,
      enrollmentDate: true,
    },
  });

  const cpStudents = allMine.filter(
    (s) =>
      (!safeCenter || s.centerId === safeCenter) &&
      (!safeProgram || s.programId === safeProgram),
  );

  const filtered = standards.length
    ? cpStudents.filter((s) => !!s.standard && standards.includes(s.standard))
    : cpStudents;

  // ---- totals + gender ----------------------------------------------
  let male = 0,
    female = 0,
    other = 0;
  for (const s of filtered) {
    if (s.gender === "male") male++;
    else if (s.gender === "female") female++;
    else other++;
  }
  const totals = { students: filtered.length, male, female, other };

  // ---- std breakdown (center/program scoped, ignores std filter) -----
  const stdMap = new Map<
    string,
    { standard: string; count: number; male: number; female: number }
  >();
  for (const s of cpStudents) {
    const key = s.standard && s.standard.trim() ? s.standard.trim() : "N/A";
    const cur = stdMap.get(key) ?? { standard: key, count: 0, male: 0, female: 0 };
    cur.count++;
    if (s.gender === "male") cur.male++;
    else if (s.gender === "female") cur.female++;
    stdMap.set(key, cur);
  }
  const stdBreakdown = Array.from(stdMap.values()).sort(
    (a, b) => tdStandardRank(a.standard) - tdStandardRank(b.standard),
  );

  // ---- student growth (monthly by enrollment, within period) ---------
  const growthMap = new Map<string, number>();
  for (const s of filtered) {
    const enrolled = new Date(s.enrollmentDate);
    if (!tdInRange(enrolled, start, end)) continue;
    const key = tdMonthKey(enrolled);
    growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
  }
  let cumulative = 0;
  const studentGrowthMonthly = Array.from(growthMap.keys())
    .sort()
    .map((k) => {
      const added = growthMap.get(k) ?? 0;
      cumulative += added;
      return { monthKey: k, label: tdMonthLabel(k), added, cumulative };
    });

  const filteredIds = filtered.map((s) => s.id);

  // ---- attendance (overall + monthly) --------------------------------
  let attendance = {
    overallRate: 0,
    present: 0,
    absent: 0,
    late: 0,
    totalRecords: 0,
  };
  const attMonthMap = new Map<
    string,
    { present: number; late: number; total: number }
  >();
  if (filteredIds.length) {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        studentId: { in: filteredIds },
        session: { sessionDate: { gte: start, lt: end } },
      },
      select: { status: true, session: { select: { sessionDate: true } } },
    });
    let p = 0,
      a = 0,
      l = 0;
    for (const r of records) {
      const key = tdMonthKey(new Date(r.session.sessionDate));
      const m = attMonthMap.get(key) ?? { present: 0, late: 0, total: 0 };
      m.total++;
      if (r.status === "present") {
        p++;
        m.present++;
      } else if (r.status === "late") {
        l++;
        m.late++;
      } else if (r.status === "absent") {
        a++;
      }
      attMonthMap.set(key, m);
    }
    const totalRec = records.length;
    attendance = {
      overallRate: totalRec === 0 ? 0 : Math.round(((p + l) / totalRec) * 100),
      present: p,
      absent: a,
      late: l,
      totalRecords: totalRec,
    };
  }
  const attendanceMonthly = Array.from(attMonthMap.keys())
    .sort()
    .map((k) => {
      const m = attMonthMap.get(k)!;
      return {
        monthKey: k,
        label: tdMonthLabel(k),
        rate: m.total === 0 ? 0 : Math.round(((m.present + m.late) / m.total) * 100),
      };
    });

  // ---- exams (monthly average % + grade distribution) ----------------
  const examMonthMap = new Map<
    string,
    { sumPct: number; n: number; students: Set<string> }
  >();
  // per-student totals (obtained / max) — overall + per month — for grading
  const perStudentOverall = new Map<string, { obt: number; max: number }>();
  const perStudentMonth = new Map<string, Map<string, { obt: number; max: number }>>();
  if (filteredIds.length) {
    const scores = await prisma.examScore.findMany({
      where: { studentId: { in: filteredIds } },
      select: {
        marks: true,
        isAbsent: true,
        studentId: true,
        subject: { select: { maxMarks: true } },
        exam: { select: { examDate: true, createdAt: true } },
      },
    });
    for (const sc of scores) {
      if (sc.isAbsent || sc.marks === null) continue;
      const max = sc.subject ? Number(sc.subject.maxMarks) : 0;
      if (!max || max <= 0) continue;
      const obt = Number(sc.marks);
      const pct = (obt / max) * 100;
      const d = sc.exam?.examDate ?? sc.exam?.createdAt;
      if (!d || !tdInRange(d, start, end)) continue;
      const key = tdMonthKey(new Date(d));
      const m =
        examMonthMap.get(key) ?? { sumPct: 0, n: 0, students: new Set<string>() };
      m.sumPct += pct;
      m.n++;
      m.students.add(sc.studentId);
      examMonthMap.set(key, m);

      const ov = perStudentOverall.get(sc.studentId) ?? { obt: 0, max: 0 };
      ov.obt += obt;
      ov.max += max;
      perStudentOverall.set(sc.studentId, ov);

      let byMonth = perStudentMonth.get(sc.studentId);
      if (!byMonth) {
        byMonth = new Map<string, { obt: number; max: number }>();
        perStudentMonth.set(sc.studentId, byMonth);
      }
      const mm = byMonth.get(key) ?? { obt: 0, max: 0 };
      mm.obt += obt;
      mm.max += max;
      byMonth.set(key, mm);
    }
  }
  const examMonthly = Array.from(examMonthMap.keys())
    .sort()
    .map((k) => {
      const m = examMonthMap.get(k)!;
      return {
        monthKey: k,
        label: tdMonthLabel(k),
        avgPercent: m.n === 0 ? 0 : Math.round(m.sumPct / m.n),
        studentCount: m.students.size,
      };
    });
  let examGrowth = {
    firstLabel: "",
    firstAvg: 0,
    latestLabel: "",
    latestAvg: 0,
    deltaPercent: 0,
  };
  if (examMonthly.length) {
    const first = examMonthly[0];
    const last = examMonthly[examMonthly.length - 1];
    examGrowth = {
      firstLabel: first.label,
      firstAvg: first.avgPercent,
      latestLabel: last.label,
      latestAvg: last.avgPercent,
      deltaPercent: last.avgPercent - first.avgPercent,
    };
  }

  // ---- grade distribution (A/B/C/D/E) --------------------------------
  const studentStdMap = new Map<string, string>(
    filtered.map((s): [string, string] => [
      s.id,
      s.standard && s.standard.trim() ? s.standard.trim() : "N/A",
    ]),
  );
  const gradeOf = (pct: number): "A" | "B" | "C" | "D" | "E" =>
    pct >= 80 ? "A" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "E";
  const emptyGrade = () => ({ A: 0, B: 0, C: 0, D: 0, E: 0 });

  const gradeOverall = emptyGrade();
  const stdGradeMap = new Map<
    string,
    { A: number; B: number; C: number; D: number; E: number }
  >();
  for (const [sid, agg] of perStudentOverall) {
    if (agg.max <= 0) continue;
    const g = gradeOf((agg.obt / agg.max) * 100);
    gradeOverall[g]++;
    const std = studentStdMap.get(sid) ?? "N/A";
    const sg = stdGradeMap.get(std) ?? emptyGrade();
    sg[g]++;
    stdGradeMap.set(std, sg);
  }
  const gradeByStd = Array.from(stdGradeMap.entries())
    .map(([standard, g]) => ({
      standard,
      ...g,
      total: g.A + g.B + g.C + g.D + g.E,
    }))
    .sort((a, b) => tdStandardRank(a.standard) - tdStandardRank(b.standard));

  const monthGradeMap = new Map<
    string,
    { A: number; B: number; C: number; D: number; E: number }
  >();
  for (const [, byMonth] of perStudentMonth) {
    for (const [mk, agg] of byMonth) {
      if (agg.max <= 0) continue;
      const g = gradeOf((agg.obt / agg.max) * 100);
      const mg = monthGradeMap.get(mk) ?? emptyGrade();
      mg[g]++;
      monthGradeMap.set(mk, mg);
    }
  }
  const gradeByMonth = Array.from(monthGradeMap.keys())
    .sort()
    .map((k) => {
      const g = monthGradeMap.get(k)!;
      return {
        monthKey: k,
        label: tdMonthLabel(k),
        ...g,
        total: g.A + g.B + g.C + g.D + g.E,
      };
    });

  // ---- activities conducted (monthly) --------------------------------
  const actWhere: Prisma.ActivityWhereInput = {
    createdBy: userId,
    isActive: true,
  };
  if (safeCenter) actWhere.centerId = safeCenter;
  if (safeProgram) actWhere.programId = safeProgram;
  const activities = await prisma.activity.findMany({
    where: actWhere,
    select: { startDate: true, createdAt: true },
  });
  const actMonthMap = new Map<string, number>();
  let totalActivities = 0;
  for (const act of activities) {
    const d = act.startDate ?? act.createdAt;
    if (!tdInRange(d, start, end)) continue;
    totalActivities++;
    const key = tdMonthKey(new Date(d));
    actMonthMap.set(key, (actMonthMap.get(key) ?? 0) + 1);
  }
  const activitiesMonthly = Array.from(actMonthMap.keys())
    .sort()
    .map((k) => ({ monthKey: k, label: tdMonthLabel(k), count: actMonthMap.get(k) ?? 0 }));

  // ---- filter options (from ALL my students, ignoring filters) -------
  const centerIds = Array.from(
    new Set(allMine.map((s) => s.centerId).filter((x): x is string => !!x)),
  );
  const programIds = Array.from(
    new Set(allMine.map((s) => s.programId).filter((x): x is string => !!x)),
  );
  const stdOptions = Array.from(
    new Set(
      allMine
        .map((s) => s.standard)
        .filter((x): x is string => !!x && x.trim().length > 0),
    ),
  ).sort((a, b) => tdStandardRank(a) - tdStandardRank(b));

  const [centers, programs] = await Promise.all([
    centerIds.length
      ? prisma.center.findMany({
          where: { id: { in: centerIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([] as Array<{ id: string; name: string }>),
    programIds.length
      ? prisma.program.findMany({
          where: { id: { in: programIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([] as Array<{ id: string; name: string }>),
  ]);

  return {
    teacherName,
    totals,
    stdBreakdown,
    attendance,
    attendanceMonthly,
    studentGrowthMonthly,
    examMonthly,
    examGrowth,
    gradeOverall,
    gradeByStd,
    gradeByMonth,
    activitiesMonthly,
    totalActivities,
    filterOptions: {
      centers,
      programs,
      standards: stdOptions,
    },
    appliedPeriod: { period, label: periodLabel },
    appliedFilters: {
      centerId: safeCenter ?? null,
      programId: safeProgram ?? null,
      standards,
    },
  };
}

// ----------------------------------------------------------------------
// ADMIN ANALYTICS (super_admin + tech_admin = all; center_admin = own centers)
// One comprehensive payload for the admin control-tower dashboard.
// ----------------------------------------------------------------------
export async function getAdminAnalytics(user: JwtPayload, query: any) {
  const isSuper = user.role === "super_admin" || user.role === "tech_admin";
  const myCenterIds = user.centerIds ?? [];

  const pickUuid = (v: unknown): string | undefined =>
    typeof v === "string" && v && TD_UUID_RE.test(v) ? v : undefined;
  const fCenter = pickUuid(query.centerId);
  const fProgram = pickUuid(query.programId);
  const fTeacher = pickUuid(query.teacherId);
  const fStandard =
    typeof query.standard === "string" && query.standard.trim()
      ? query.standard.trim()
      : undefined;
  const fGrade =
    typeof query.grade === "string" && ["A", "B", "C", "D", "E"].includes(query.grade)
      ? (query.grade as "A" | "B" | "C" | "D" | "E")
      : undefined;

  // Allowed centers: super/tech = all (undefined), others = their centers.
  const centerIn: string[] | undefined = isSuper
    ? fCenter
      ? [fCenter]
      : undefined
    : fCenter && myCenterIds.includes(fCenter)
      ? [fCenter]
      : myCenterIds;

  const gradeOf = (pct: number): "A" | "B" | "C" | "D" | "E" =>
    pct >= 80 ? "A" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "E";
  const emptyGrade = () => ({ A: 0, B: 0, C: 0, D: 0, E: 0 });
  const rate = (p: number, l: number, t: number) =>
    t === 0 ? 0 : Math.round(((p + l) / t) * 100);

  const { start, end, period, label: periodLabel } = tdResolvePeriod(query);

  // ---- students -----------------------------------------------------
  const studentWhere: Prisma.StudentWhereInput = { isActive: true };
  if (centerIn) studentWhere.centerId = { in: centerIn };
  if (fProgram) studentWhere.programId = fProgram;
  if (fStandard) studentWhere.standard = fStandard;
  if (fTeacher) studentWhere.createdById = fTeacher;

  const allStudents = await prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      fullName: true,
      rollNumber: true,
      gender: true,
      standard: true,
      centerId: true,
      programId: true,
      enrollmentDate: true,
      createdById: true,
    },
  });
  const allIds = allStudents.map((s) => s.id);

  // ---- exam scores --------------------------------------------------
  const scores = allIds.length
    ? await prisma.examScore.findMany({
        where: { studentId: { in: allIds } },
        select: {
          marks: true,
          isAbsent: true,
          studentId: true,
          enteredBy: true,
          examId: true,
          subject: { select: { name: true, maxMarks: true } },
          exam: { select: { examDate: true, createdAt: true } },
        },
      })
    : [];

  // per-student overall % → grade (for the grade filter + distributions)
  const psOverallAll = new Map<string, { obt: number; max: number }>();
  for (const sc of scores) {
    if (sc.isAbsent || sc.marks === null) continue;
    const max = sc.subject ? Number(sc.subject.maxMarks) : 0;
    if (!max || max <= 0) continue;
    const o = psOverallAll.get(sc.studentId) ?? { obt: 0, max: 0 };
    o.obt += Number(sc.marks);
    o.max += max;
    psOverallAll.set(sc.studentId, o);
  }
  const studentGrade = new Map<string, "A" | "B" | "C" | "D" | "E">();
  for (const [sid, agg] of psOverallAll) {
    if (agg.max > 0) studentGrade.set(sid, gradeOf((agg.obt / agg.max) * 100));
  }

  // grade filter narrows the effective student set
  const students = fGrade
    ? allStudents.filter((s) => studentGrade.get(s.id) === fGrade)
    : allStudents;
  const ids = students.map((s) => s.id);
  const idSet = new Set(ids);
  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const effScores = fGrade ? scores.filter((sc) => idSet.has(sc.studentId)) : scores;

  // ---- gender ------------------------------------------------------
  let male = 0,
    female = 0,
    other = 0;
  for (const s of students) {
    if (s.gender === "male") male++;
    else if (s.gender === "female") female++;
    else other++;
  }

  // ---- exam aggregations (grades, subjects, teachers) --------------
  const psOverallEff = new Map<string, { obt: number; max: number }>();
  const psMonth = new Map<string, Map<string, { obt: number; max: number }>>();
  const subjMap = new Map<string, { obt: number; max: number }>();
  const teacherExam = new Map<string, { obt: number; max: number; exams: Set<string> }>();
  const examIdSet = new Set<string>();
  for (const sc of effScores) {
    const d = sc.exam?.examDate ?? sc.exam?.createdAt;
    if (!tdInRange(d, start, end)) continue;
    examIdSet.add(sc.examId);
    if (sc.isAbsent || sc.marks === null) continue;
    const max = sc.subject ? Number(sc.subject.maxMarks) : 0;
    if (!max || max <= 0) continue;
    const obt = Number(sc.marks);
    const ov = psOverallEff.get(sc.studentId) ?? { obt: 0, max: 0 };
    ov.obt += obt;
    ov.max += max;
    psOverallEff.set(sc.studentId, ov);
    if (d) {
      const mk = tdMonthKey(new Date(d));
      let bm = psMonth.get(sc.studentId);
      if (!bm) {
        bm = new Map<string, { obt: number; max: number }>();
        psMonth.set(sc.studentId, bm);
      }
      const mm = bm.get(mk) ?? { obt: 0, max: 0 };
      mm.obt += obt;
      mm.max += max;
      bm.set(mk, mm);
    }
    if (sc.subject) {
      const sj = subjMap.get(sc.subject.name) ?? { obt: 0, max: 0 };
      sj.obt += obt;
      sj.max += max;
      subjMap.set(sc.subject.name, sj);
    }
    const te = teacherExam.get(sc.enteredBy) ?? { obt: 0, max: 0, exams: new Set<string>() };
    te.obt += obt;
    te.max += max;
    te.exams.add(sc.examId);
    teacherExam.set(sc.enteredBy, te);
  }

  const gradeOverall = emptyGrade();
  const stdGradeMap = new Map<
    string,
    { A: number; B: number; C: number; D: number; E: number }
  >();
  const genderGrade = { male: emptyGrade(), female: emptyGrade() };
  for (const [sid, agg] of psOverallEff) {
    if (agg.max <= 0) continue;
    const g = gradeOf((agg.obt / agg.max) * 100);
    gradeOverall[g]++;
    const st = studentById.get(sid);
    const std = st?.standard && st.standard.trim() ? st.standard.trim() : "N/A";
    const sg = stdGradeMap.get(std) ?? emptyGrade();
    sg[g]++;
    stdGradeMap.set(std, sg);
    if (st?.gender === "male") genderGrade.male[g]++;
    else if (st?.gender === "female") genderGrade.female[g]++;
  }
  const gradeByStd = Array.from(stdGradeMap.entries())
    .map(([standard, g]) => ({ standard, ...g, total: g.A + g.B + g.C + g.D + g.E }))
    .sort((a, b) => tdStandardRank(a.standard) - tdStandardRank(b.standard));
  const monthGradeMap = new Map<
    string,
    { A: number; B: number; C: number; D: number; E: number }
  >();
  for (const [, bm] of psMonth) {
    for (const [mk, agg] of bm) {
      if (agg.max <= 0) continue;
      const g = gradeOf((agg.obt / agg.max) * 100);
      const mg = monthGradeMap.get(mk) ?? emptyGrade();
      mg[g]++;
      monthGradeMap.set(mk, mg);
    }
  }
  const gradeByMonth = Array.from(monthGradeMap.keys())
    .sort()
    .map((k) => {
      const g = monthGradeMap.get(k)!;
      return { monthKey: k, label: tdMonthLabel(k), ...g, total: g.A + g.B + g.C + g.D + g.E };
    });
  const avgBySubject = Array.from(subjMap.entries())
    .map(([name, v]) => ({ name, avgPercent: v.max > 0 ? Math.round((v.obt / v.max) * 100) : 0 }))
    .sort((a, b) => b.avgPercent - a.avgPercent);

  // ---- attendance (last 12 months) ---------------------------------
  const records = ids.length
    ? await prisma.attendanceRecord.findMany({
        where: { studentId: { in: ids }, session: { sessionDate: { gte: start, lt: end } } },
        select: {
          status: true,
          studentId: true,
          centerId: true,
          session: { select: { sessionDate: true, createdBy: true } },
        },
      })
    : [];
  let aPresent = 0,
    aLate = 0,
    aTotal = 0;
  const attMonth = new Map<string, { p: number; l: number; t: number }>();
  const attCenter = new Map<string, { p: number; l: number; t: number }>();
  const attTeacher = new Map<string, { p: number; l: number; t: number }>();
  const attGender = { male: { p: 0, l: 0, t: 0 }, female: { p: 0, l: 0, t: 0 } };
  const psAtt = new Map<string, { p: number; t: number }>();
  for (const r of records) {
    const pres = r.status === "present";
    const late = r.status === "late";
    aTotal++;
    if (pres) aPresent++;
    if (late) aLate++;
    const mk = tdMonthKey(new Date(r.session.sessionDate));
    const m = attMonth.get(mk) ?? { p: 0, l: 0, t: 0 };
    m.t++;
    if (pres) m.p++;
    if (late) m.l++;
    attMonth.set(mk, m);
    const c = attCenter.get(r.centerId) ?? { p: 0, l: 0, t: 0 };
    c.t++;
    if (pres) c.p++;
    if (late) c.l++;
    attCenter.set(r.centerId, c);
    const tk = r.session.createdBy;
    const tt = attTeacher.get(tk) ?? { p: 0, l: 0, t: 0 };
    tt.t++;
    if (pres) tt.p++;
    if (late) tt.l++;
    attTeacher.set(tk, tt);
    const st = studentById.get(r.studentId);
    if (st?.gender === "male") {
      attGender.male.t++;
      if (pres) attGender.male.p++;
      if (late) attGender.male.l++;
    } else if (st?.gender === "female") {
      attGender.female.t++;
      if (pres) attGender.female.p++;
      if (late) attGender.female.l++;
    }
    const pa = psAtt.get(r.studentId) ?? { p: 0, t: 0 };
    pa.t++;
    if (pres || late) pa.p++;
    psAtt.set(r.studentId, pa);
  }
  const overallAttendanceRate = rate(aPresent, aLate, aTotal);
  const attendanceMonthly = Array.from(attMonth.keys())
    .sort()
    .map((k) => {
      const m = attMonth.get(k)!;
      return { monthKey: k, label: tdMonthLabel(k), rate: rate(m.p, m.l, m.t) };
    });

  // ---- enrollment growth -------------------------------------------
  const enrMap = new Map<string, { added: number; male: number; female: number }>();
  for (const s of students) {
    const enrolled = new Date(s.enrollmentDate);
    if (!tdInRange(enrolled, start, end)) continue;
    const k = tdMonthKey(enrolled);
    const e = enrMap.get(k) ?? { added: 0, male: 0, female: 0 };
    e.added++;
    if (s.gender === "male") e.male++;
    else if (s.gender === "female") e.female++;
    enrMap.set(k, e);
  }
  let cum = 0;
  const enrollmentMonthly = Array.from(enrMap.keys())
    .sort()
    .map((k) => {
      const e = enrMap.get(k)!;
      cum += e.added;
      return { monthKey: k, label: tdMonthLabel(k), added: e.added, cumulative: cum, male: e.male, female: e.female };
    });

  // ---- activities ---------------------------------------------------
  const actWhere: Prisma.ActivityWhereInput = { isActive: true };
  if (centerIn) actWhere.centerId = { in: centerIn };
  if (fProgram) actWhere.programId = fProgram;
  if (fTeacher) actWhere.createdBy = fTeacher;
  const activities = await prisma.activity.findMany({
    where: actWhere,
    select: { startDate: true, createdAt: true, centerId: true, createdBy: true },
  });
  const actMonth = new Map<string, number>();
  const actCenter = new Map<string, number>();
  const actTeacher = new Map<string, number>();
  let actTotal = 0;
  for (const a of activities) {
    const d = a.startDate ?? a.createdAt;
    if (!tdInRange(d, start, end)) continue;
    actTotal++;
    const k = tdMonthKey(new Date(d));
    actMonth.set(k, (actMonth.get(k) ?? 0) + 1);
    actCenter.set(a.centerId, (actCenter.get(a.centerId) ?? 0) + 1);
    actTeacher.set(a.createdBy, (actTeacher.get(a.createdBy) ?? 0) + 1);
  }
  const activitiesMonthly = Array.from(actMonth.keys())
    .sort()
    .map((k) => ({ monthKey: k, label: tdMonthLabel(k), count: actMonth.get(k) ?? 0 }));

  // ---- meetings (student + parent) ---------------------------------
  const [stuMeet, parMeet] = await Promise.all([
    prisma.studentMeeting.findMany({
      where: centerIn ? { centerId: { in: centerIn } } : {},
      select: {
        meetingDate: true,
        attendance: { where: { student: { isActive: true } }, select: { isPresent: true } },
      },
    }),
    prisma.parentMeeting.findMany({
      where: centerIn ? { centerId: { in: centerIn } } : {},
      select: { meetingDate: true, attendance: { select: { gender: true } } },
    }),
  ]);
  const stuMeetMonth = new Map<string, number>();
  let stuMeetPresent = 0;
  let stuMeetTotal = 0;
  for (const m of stuMeet) {
    if (!tdInRange(new Date(m.meetingDate), start, end)) continue;
    stuMeetTotal++;
    const k = tdMonthKey(new Date(m.meetingDate));
    stuMeetMonth.set(k, (stuMeetMonth.get(k) ?? 0) + 1);
    for (const a of m.attendance) if (a.isPresent) stuMeetPresent++;
  }
  const parMeetMonth = new Map<string, number>();
  let parMale = 0,
    parFemale = 0,
    parMeetTotal = 0;
  for (const m of parMeet) {
    if (!tdInRange(new Date(m.meetingDate), start, end)) continue;
    parMeetTotal++;
    const k = tdMonthKey(new Date(m.meetingDate));
    parMeetMonth.set(k, (parMeetMonth.get(k) ?? 0) + 1);
    for (const a of m.attendance) {
      if (a.gender === "male") parMale++;
      else if (a.gender === "female") parFemale++;
    }
  }
  const meetings = {
    studentTotal: stuMeetTotal,
    parentTotal: parMeetTotal,
    studentPresent: stuMeetPresent,
    parentAttendees: parMale + parFemale,
    parentMale: parMale,
    parentFemale: parFemale,
    studentMonthly: Array.from(stuMeetMonth.keys())
      .sort()
      .map((k) => ({ monthKey: k, label: tdMonthLabel(k), count: stuMeetMonth.get(k) ?? 0 })),
    parentMonthly: Array.from(parMeetMonth.keys())
      .sort()
      .map((k) => ({ monthKey: k, label: tdMonthLabel(k), count: parMeetMonth.get(k) ?? 0 })),
  };

  // ---- centers / programs / teachers (names + options) -------------
  const centerWhere: Prisma.CenterWhereInput = { isActive: true };
  if (centerIn) centerWhere.id = { in: centerIn };
  const centersList = await prisma.center.findMany({
    where: centerWhere,
    select: { id: true, name: true },
  });
  const centerName = new Map(centersList.map((c) => [c.id, c.name] as const));
  const programsList = await prisma.program.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const programName = new Map(programsList.map((p) => [p.id, p.name] as const));

  const teacherWhere: Prisma.UserWhereInput = { role: "teacher", isActive: true };
  if (centerIn) teacherWhere.centerAssignments = { some: { centerId: { in: centerIn } } };
  const teachersList = await prisma.user.findMany({
    where: teacherWhere,
    select: { id: true, fullName: true },
  });

  // teacher names for anyone appearing in the summaries
  const teacherIdSet = new Set<string>();
  for (const s of students) if (s.createdById) teacherIdSet.add(s.createdById);
  for (const k of teacherExam.keys()) teacherIdSet.add(k);
  for (const k of attTeacher.keys()) teacherIdSet.add(k);
  for (const k of actTeacher.keys()) teacherIdSet.add(k);
  const teacherNameRows = teacherIdSet.size
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(teacherIdSet) } },
        select: { id: true, fullName: true },
      })
    : [];
  const teacherName = new Map(teacherNameRows.map((u) => [u.id, u.fullName] as const));

  const teacherStudents = new Map<string, number>();
  for (const s of students)
    if (s.createdById) teacherStudents.set(s.createdById, (teacherStudents.get(s.createdById) ?? 0) + 1);

  const teacherSummary = Array.from(teacherIdSet)
    .map((id) => {
      const te = teacherExam.get(id);
      const at = attTeacher.get(id);
      return {
        teacherId: id,
        name: teacherName.get(id) || "Unknown",
        students: teacherStudents.get(id) || 0,
        examsEntered: te ? te.exams.size : 0,
        avgPercent: te && te.max > 0 ? Math.round((te.obt / te.max) * 100) : 0,
        attendanceRate: at ? rate(at.p, at.l, at.t) : 0,
        activities: actTeacher.get(id) || 0,
      };
    })
    .filter((t) => t.students > 0 || t.examsEntered > 0 || t.activities > 0)
    .sort((a, b) => b.students - a.students);

  // ---- center comparison -------------------------------------------
  const centerStudents = new Map<string, number>();
  for (const s of students) centerStudents.set(s.centerId, (centerStudents.get(s.centerId) ?? 0) + 1);
  const centerExam = new Map<string, { obt: number; max: number }>();
  for (const sc of effScores) {
    if (sc.isAbsent || sc.marks === null) continue;
    const max = sc.subject ? Number(sc.subject.maxMarks) : 0;
    if (!max || max <= 0) continue;
    const st = studentById.get(sc.studentId);
    if (!st) continue;
    const ce = centerExam.get(st.centerId) ?? { obt: 0, max: 0 };
    ce.obt += Number(sc.marks);
    ce.max += max;
    centerExam.set(st.centerId, ce);
  }
  const centerComparison = centersList
    .map((c) => {
      const att = attCenter.get(c.id);
      const ex = centerExam.get(c.id);
      return {
        centerId: c.id,
        name: c.name,
        students: centerStudents.get(c.id) || 0,
        attendanceRate: att ? rate(att.p, att.l, att.t) : 0,
        avgExamPercent: ex && ex.max > 0 ? Math.round((ex.obt / ex.max) * 100) : 0,
        activities: actCenter.get(c.id) || 0,
      };
    })
    .sort((a, b) => b.students - a.students);

  // ---- at-risk students --------------------------------------------
  const atRisk: Array<{
    studentId: string;
    name: string;
    center: string;
    standard: string;
    attendanceRate: number | null;
    avgPercent: number | null;
    grade: string | null;
    reasons: string[];
  }> = [];
  for (const s of students) {
    const pa = psAtt.get(s.id);
    const attRate = pa && pa.t > 0 ? Math.round((pa.p / pa.t) * 100) : null;
    const g = studentGrade.get(s.id) ?? null;
    const ov = psOverallEff.get(s.id);
    const pct = ov && ov.max > 0 ? Math.round((ov.obt / ov.max) * 100) : null;
    const reasons: string[] = [];
    if (attRate != null && attRate < 60) reasons.push(`Attendance ${attRate}%`);
    if (g === "D" || g === "E") reasons.push(`Grade ${g}`);
    if (reasons.length) {
      atRisk.push({
        studentId: s.id,
        name: s.fullName,
        center: centerName.get(s.centerId) || "—",
        standard: s.standard || "—",
        attendanceRate: attRate,
        avgPercent: pct,
        grade: g,
        reasons,
      });
    }
  }
  atRisk.sort((a, b) => (a.attendanceRate ?? 101) - (b.attendanceRate ?? 101));
  const atRiskTop = atRisk.slice(0, 50);

  // ---- data completeness -------------------------------------------
  const withMarks = new Set(
    effScores.filter((sc) => !sc.isAbsent && sc.marks !== null).map((sc) => sc.studentId),
  ).size;
  const withAtt = psAtt.size;
  const totalS = students.length;
  const dataCompleteness = {
    totalStudents: totalS,
    withMarks,
    withoutMarks: Math.max(0, totalS - withMarks),
    withAttendance: withAtt,
    withoutAttendance: Math.max(0, totalS - withAtt),
    marksPercent: totalS ? Math.round((withMarks / totalS) * 100) : 0,
    attendancePercent: totalS ? Math.round((withAtt / totalS) * 100) : 0,
  };

  // ---- gender equity ------------------------------------------------
  const progGender = new Map<string, { male: number; female: number }>();
  for (const s of students) {
    if (!s.programId) continue;
    const pg = progGender.get(s.programId) ?? { male: 0, female: 0 };
    if (s.gender === "male") pg.male++;
    else if (s.gender === "female") pg.female++;
    progGender.set(s.programId, pg);
  }
  const genderEquity = {
    byProgram: Array.from(progGender.entries()).map(([pid, g]) => ({
      program: programName.get(pid) || "Unknown",
      male: g.male,
      female: g.female,
    })),
    attendanceByGender: {
      maleRate: rate(attGender.male.p, attGender.male.l, attGender.male.t),
      femaleRate: rate(attGender.female.p, attGender.female.l, attGender.female.t),
    },
    gradeByGender: genderGrade,
  };

  // ---- standard options (independent of std/grade filter) ----------
  const stdWhere: Prisma.StudentWhereInput = { isActive: true };
  if (centerIn) stdWhere.centerId = { in: centerIn };
  if (fProgram) stdWhere.programId = fProgram;
  const stdRows = await prisma.student.findMany({ where: stdWhere, select: { standard: true } });
  const stdOptions = Array.from(
    new Set(stdRows.map((r) => r.standard).filter((x): x is string => !!x && x.trim().length > 0)),
  ).sort((a, b) => tdStandardRank(a) - tdStandardRank(b));

  // ---- KPI ----------------------------------------------------------
  let avgObt = 0,
    avgMax = 0;
  for (const v of psOverallEff.values()) {
    avgObt += v.obt;
    avgMax += v.max;
  }
  const kpis = {
    totalStudents: students.length,
    male,
    female,
    other,
    totalTeachers: teachersList.length,
    totalCenters: centersList.length,
    overallAttendanceRate,
    examsConducted: examIdSet.size,
    avgExamPercent: avgMax > 0 ? Math.round((avgObt / avgMax) * 100) : 0,
    totalActivities: actTotal,
    studentMeetings: meetings.studentTotal,
    parentMeetings: meetings.parentTotal,
  };

  return {
    scope: isSuper ? "all" : "centers",
    appliedPeriod: { period, label: periodLabel },
    kpis,
    attendanceMonthly,
    gradeOverall,
    gradeByMonth,
    gradeByStd,
    avgBySubject,
    enrollmentMonthly,
    activitiesMonthly,
    centerComparison,
    teacherSummary,
    meetings,
    atRisk: atRiskTop,
    dataCompleteness,
    genderEquity,
    filterOptions: {
      centers: centersList,
      programs: programsList,
      standards: stdOptions,
      teachers: teachersList,
      grades: ["A", "B", "C", "D", "E"],
    },
    appliedFilters: {
      centerId: fCenter ?? null,
      programId: fProgram ?? null,
      standard: fStandard ?? null,
      grade: fGrade ?? null,
      teacherId: fTeacher ?? null,
    },
  };
}

// ----------------------------------------------------------------------
// EXAM COMPLETION — how many students' exams are done vs pending.
// Teacher = own class; super/tech admin = all centers/programs (+ filters).
// ----------------------------------------------------------------------
export async function getExamCompletion(user: JwtPayload, query: any) {
  const isSuper = user.role === "super_admin" || user.role === "tech_admin";
  const isTeacher = user.role === "teacher" || user.role === "staff";
  const myCenterIds = user.centerIds ?? [];

  const pickUuid = (v: unknown): string | undefined =>
    typeof v === "string" && v && TD_UUID_RE.test(v) ? v : undefined;
  const fCenter = pickUuid(query.centerId);
  const fProgram = pickUuid(query.programId);
  const fStandard =
    typeof query.standard === "string" && query.standard.trim() ? query.standard.trim() : undefined;

  const centerIn: string[] | undefined = isSuper
    ? fCenter
      ? [fCenter]
      : undefined
    : fCenter && myCenterIds.includes(fCenter)
      ? [fCenter]
      : myCenterIds;

  const { start, end, period, label: periodLabel } = tdResolvePeriod(query);

  // ---- roster (students in scope) ----------------------------------
  const studentWhere: Prisma.StudentWhereInput = { isActive: true };
  if (isTeacher) studentWhere.createdById = user.userId;
  if (!isTeacher && centerIn) studentWhere.centerId = { in: centerIn };
  if (fProgram) studentWhere.programId = fProgram;
  if (fStandard) studentWhere.standard = fStandard;

  const roster = await prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      fullName: true,
      rollNumber: true,
      standard: true,
      centerId: true,
      programId: true,
    },
  });
  const rosterIds = roster.map((s) => s.id);

  // ---- exams that apply to this roster -----------------------------
  const rosterCenters = Array.from(new Set(roster.map((s) => s.centerId)));
  const examWhere: Prisma.ExamWhereInput = {};
  if (centerIn) examWhere.centerId = { in: centerIn };
  else if (isTeacher) examWhere.centerId = { in: rosterCenters.length ? rosterCenters : ["__none__"] };
  if (fProgram) examWhere.programId = fProgram;

  const rawExams = rosterIds.length
    ? await prisma.exam.findMany({
        where: examWhere,
        select: { id: true, name: true, examDate: true, createdAt: true, centerId: true, programId: true },
      })
    : [];
  const exams = rawExams.filter((e) => tdInRange(e.examDate ?? e.createdAt, start, end));
  const examIds = exams.map((e) => e.id);

  // ---- scores for those exams among roster students ----------------
  const scores =
    rosterIds.length && examIds.length
      ? await prisma.examScore.findMany({
          where: { examId: { in: examIds }, studentId: { in: rosterIds } },
          select: { examId: true, studentId: true, marks: true, isAbsent: true },
        })
      : [];
  const scoreMap = new Map<string, { filled: boolean; absent: boolean }>();
  for (const sc of scores) {
    const key = `${sc.examId}|${sc.studentId}`;
    const cur = scoreMap.get(key) ?? { filled: false, absent: false };
    if (sc.isAbsent) cur.absent = true;
    if (!sc.isAbsent && sc.marks !== null) cur.filled = true;
    scoreMap.set(key, cur);
  }

  // ---- per-exam completion + monthly rollup ------------------------
  const monthMap = new Map<string, { done: number; absent: number; pending: number }>();
  let tDone = 0,
    tAbsent = 0,
    tPending = 0;
  const examsOut = exams.map((e) => {
    const expected = roster.filter((s) => s.centerId === e.centerId && s.programId === e.programId);
    let done = 0,
      absent = 0,
      pending = 0;
    const studentsOut = expected.map((s) => {
      const st = scoreMap.get(`${e.id}|${s.id}`);
      let status: "done" | "absent" | "pending";
      if (st?.filled) {
        status = "done";
        done++;
      } else if (st?.absent) {
        status = "absent";
        absent++;
      } else {
        status = "pending";
        pending++;
      }
      return {
        studentId: s.id,
        name: s.fullName,
        rollNumber: s.rollNumber || "",
        standard: s.standard || "",
        status,
      };
    });
    const d = e.examDate ?? e.createdAt;
    const mk = d ? tdMonthKey(new Date(d)) : "0000-00";
    const m = monthMap.get(mk) ?? { done: 0, absent: 0, pending: 0 };
    m.done += done;
    m.absent += absent;
    m.pending += pending;
    monthMap.set(mk, m);
    tDone += done;
    tAbsent += absent;
    tPending += pending;
    return {
      id: e.id,
      name: e.name,
      examDate: d,
      monthKey: mk,
      label: tdMonthLabel(mk),
      total: expected.length,
      done,
      absent,
      pending,
      students: studentsOut,
    };
  });
  examsOut.sort((a, b) => String(b.monthKey).localeCompare(String(a.monthKey)));

  const monthly = Array.from(monthMap.keys())
    .sort()
    .map((k) => {
      const m = monthMap.get(k)!;
      return {
        monthKey: k,
        label: tdMonthLabel(k),
        done: m.done,
        absent: m.absent,
        pending: m.pending,
        total: m.done + m.absent + m.pending,
      };
    });

  // ---- filter options (admins) -------------------------------------
  const centerIds = Array.from(new Set(roster.map((s) => s.centerId).filter((x): x is string => !!x)));
  const programIds = Array.from(new Set(roster.map((s) => s.programId).filter((x): x is string => !!x)));
  const [centersList, programsList] = await Promise.all([
    centerIds.length
      ? prisma.center.findMany({ where: { id: { in: centerIds } }, select: { id: true, name: true } })
      : Promise.resolve([] as Array<{ id: string; name: string }>),
    programIds.length
      ? prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true } })
      : Promise.resolve([] as Array<{ id: string; name: string }>),
  ]);
  const stdWhere: Prisma.StudentWhereInput = { isActive: true };
  if (isTeacher) stdWhere.createdById = user.userId;
  if (!isTeacher && centerIn) stdWhere.centerId = { in: centerIn };
  if (fProgram) stdWhere.programId = fProgram;
  const stdRows = await prisma.student.findMany({ where: stdWhere, select: { standard: true } });
  const standards = Array.from(
    new Set(stdRows.map((r) => r.standard).filter((x): x is string => !!x && x.trim().length > 0)),
  ).sort((a, b) => tdStandardRank(a) - tdStandardRank(b));

  return {
    scope: isSuper ? "all" : isTeacher ? "teacher" : "centers",
    appliedPeriod: { period, label: periodLabel },
    totals: {
      totalStudents: roster.length,
      examCount: exams.length,
      done: tDone,
      absent: tAbsent,
      pending: tPending,
      totalSlots: tDone + tAbsent + tPending,
    },
    monthly,
    exams: examsOut,
    filterOptions: {
      centers: centersList,
      programs: programsList,
      standards,
    },
    appliedFilters: {
      centerId: fCenter ?? null,
      programId: fProgram ?? null,
      standard: fStandard ?? null,
    },
  };
}
