import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ErrorMessage } from "../ui/ErrorMessage";
import { EmptyState } from "../ui/EmptyState";
import { ConfirmModal } from "../ui/ConfirmModal";
import {
  getExamReport,
  deleteExam,
  type ExamReportQuery,
  type ReportExam,
  type ReportStudent,
} from "../../services/exams.service";
import type { CenterSummary, ProgramSummary } from "../../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";

const STD_OPTIONS = [
  "Jr KG", "Sr KG", "KG",
  "1st", "2nd", "3rd", "4th", "5th", "6th",
  "7th", "8th", "9th", "10th", "11th", "12th",
];

// Colour-blind-safe categorical palette (validated). Bars carry redundant
// identity — the axis labels name each category, so colour is never the
// only signal.
const CAT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const C_PRESENT = "#008300";
const C_ABSENT = "#e34948";
const C_MALE = "#2a78d6";
const C_FEMALE = "#e87ba4";
const AXIS_INK = "#6b7280";
const GRID_INK = "#eef1f4";

// Grade system — green (best) → red (needs support).
const GRADE_KEYS = ["A", "B", "C", "D", "E"] as const;
type Grade = (typeof GRADE_KEYS)[number];
const GRADE_COLORS: Record<Grade, string> = {
  A: "#008300",
  B: "#2a78d6",
  C: "#eda100",
  D: "#eb6834",
  E: "#e34948",
};
const GRADE_RANGE: Record<Grade, string> = {
  A: "80%+",
  B: "60-79%",
  C: "50-59%",
  D: "40-49%",
  E: "<40%",
};
const gradeOf = (pct: number): Grade =>
  pct >= 80 ? "A" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "E";
const countLabel = (v: unknown) => (Number(v) > 0 ? String(v) : "");

type Props = {
  centers: CenterSummary[];
  programs: ProgramSummary[];
  canDelete: boolean;
  onEdit: (examId: string) => void;
};

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const genderShort = (g: string | null) =>
  g === "male" ? "M" : g === "female" ? "F" : g === "other" ? "O" : "—";

// Average % across students who actually have marks entered.
const avgPct = (ex: ReportExam) => {
  let obt = 0;
  let max = 0;
  for (const s of ex.students) {
    if (s.hasMarks) {
      obt += s.obtainedTotal;
      max += s.maxTotal;
    }
  }
  return max > 0 ? (obt / max) * 100 : null;
};

const studentPct = (s: ReportStudent): number | null =>
  !s.isAbsent && s.hasMarks && s.maxTotal > 0
    ? (s.obtainedTotal / s.maxTotal) * 100
    : null;

const gradeCounts = (ex: ReportExam): Record<Grade, number> => {
  const c: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const s of ex.students) {
    const p = studentPct(s);
    if (p != null) c[gradeOf(p)]++;
  }
  return c;
};

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );

export const ExamReport: React.FC<Props> = ({ centers, programs, canDelete, onEdit }) => {
  const [filterCenter, setFilterCenter] = useState("");
  const [filterProgram, setFilterProgram] = useState("");
  const [filterExamType, setFilterExamType] = useState("");
  const [filterStd, setFilterStd] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const [exams, setExams] = useState<ReportExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<Record<string, "table" | "graph">>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReportExam | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ExamReportQuery = {};
      if (filterCenter) params.centerId = filterCenter;
      if (filterProgram) params.programId = filterProgram;
      if (filterExamType) params.examType = filterExamType;
      if (filterStd) params.standard = filterStd;
      if (filterMonth) params.month = filterMonth;
      const res = await getExamReport(params);
      setExams(res.exams || []);
    } catch {
      setError("Could not load exam report.");
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [filterCenter, filterProgram, filterExamType, filterStd, filterMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  // Group exams by month (YYYY-MM), newest month first.
  const byMonth = useMemo(() => {
    const map = new Map<string, ReportExam[]>();
    for (const ex of exams) {
      const d = new Date(ex.examDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ex);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [exams]);

  const selectedExams = exams.filter((e) => selected.includes(e.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExam(deleteTarget.id);
      setDeleteTarget(null);
      setSelected((prev) => prev.filter((x) => x !== deleteTarget.id));
      await load();
    } catch {
      setError("Delete failed.");
      setDeleteTarget(null);
    }
  };

  // Build a printable page and open the browser print dialog (Save as PDF).
  const printExam = (ex: ReportExam) => {
    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) return;

    const subjHead = ex.subjects.map((s) => `<th>${esc(s.name)}</th>`).join("");
    const rows = ex.students
      .map((s, i) => {
        const cells = ex.subjects
          .map((sub) => {
            const cell = s.perSubject[sub.id];
            const val = !cell ? "—" : cell.isAbsent ? "Ab" : cell.marks ?? "—";
            return `<td style="text-align:center">${esc(val)}</td>`;
          })
          .join("");
        return `<tr style="${i % 2 ? "background:#f8fafc" : ""}">
          <td>${i + 1}</td>
          <td>${esc(s.rollNumber || "—")}</td>
          <td>${esc(s.name)}</td>
          <td style="text-align:center">${genderShort(s.gender)}</td>
          ${cells}
          <td style="text-align:center;font-weight:600">${s.isAbsent ? "—" : `${s.obtainedTotal}/${s.maxTotal}`}</td>
          <td style="text-align:center">${s.isAbsent ? "Absent" : "Present"}</td>
        </tr>`;
      })
      .join("");

    win.document.write(`<!doctype html><html><head><title>${esc(ex.name)}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px}
        h1{font-size:20px;margin:0 0 4px}
        .meta{color:#555;font-size:13px;margin-bottom:12px}
        .tiles{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
        .tile{border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:13px}
        .tile b{display:block;font-size:16px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
        th,td{border:1px solid #e5e7eb;padding:5px 7px;text-align:left}
        th{background:#f1f5f9}
      </style></head><body>
      <h1>${esc(ex.name)} — ${esc(ex.examType)}</h1>
      <div class="meta">
        Date: ${new Date(ex.examDate).toLocaleDateString()} &nbsp;|&nbsp;
        Center: ${esc(ex.center.name)} &nbsp;|&nbsp; Program: ${esc(ex.program.name)}
        ${ex.enteredBy.length ? `&nbsp;|&nbsp; By: ${esc(ex.enteredBy.join(", "))}` : ""}
      </div>
      <div class="tiles">
        <div class="tile"><b>${ex.totals.totalStudents}</b>Total</div>
        <div class="tile"><b>${ex.totals.present}</b>Present</div>
        <div class="tile"><b>${ex.totals.absent}</b>Absent</div>
        <div class="tile"><b>${ex.totals.male}</b>Male</div>
        <div class="tile"><b>${ex.totals.female}</b>Female</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Roll</th><th>Student</th><th>Gender</th>${subjHead}<th>Total</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  // Graphical view for one exam: subject-wise average %, attendance, gender
  // split, and standard-wise count — each a small bar chart with clear axes.
  const renderCharts = (ex: ReportExam) => {
    const subjectAvg = ex.subjects.map((sub) => {
      let obt = 0;
      let max = 0;
      for (const st of ex.students) {
        const cell = st.perSubject[sub.id];
        if (cell && !cell.isAbsent && cell.marks != null) {
          obt += cell.marks;
          max += cell.maxMarks;
        }
      }
      return { name: sub.name, pct: max > 0 ? Math.round((obt / max) * 1000) / 10 : 0 };
    });

    const attendance = [
      { name: "Present", value: ex.totals.present },
      { name: "Absent", value: ex.totals.absent },
    ];
    const gender = [
      { name: "Male", value: ex.totals.male },
      { name: "Female", value: ex.totals.female },
    ];
    const stdMap = new Map<string, number>();
    for (const st of ex.students) {
      const key = st.standard || "—";
      stdMap.set(key, (stdMap.get(key) || 0) + 1);
    }
    const byStd = Array.from(stdMap.entries()).map(([name, value]) => ({ name, value }));

    const gc = gradeCounts(ex);
    const gradeData = GRADE_KEYS.map((g) => ({ name: g, value: gc[g] }));

    return (
      <div className="space-y-6">
        {/* Subject-wise average — the headline chart */}
        <div>
          <h4 className="text-sm font-semibold text-neutral-700 mb-2">Average % by subject</h4>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={subjectAvg} margin={{ top: 10, right: 12, left: 4, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_INK} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  label={{ value: "Subject", position: "insideBottom", offset: -14, fontSize: 12, fill: AXIS_INK }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: "Average %", angle: -90, position: "insideLeft", fontSize: 12, fill: AXIS_INK }}
                />
                <Tooltip formatter={(v) => `${v ?? 0}%`} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {subjectAvg.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                  <LabelList dataKey="pct" position="top" fontSize={11} fill={AXIS_INK} formatter={(v) => `${v ?? 0}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade distribution */}
        <div>
          <h4 className="text-sm font-semibold text-neutral-700 mb-2">Grade distribution (A–E)</h4>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={gradeData} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_INK} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  label={{ value: "Grade", position: "insideBottom", offset: -4, fontSize: 12, fill: AXIS_INK }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  label={{ value: "Students", angle: -90, position: "insideLeft", fontSize: 12, fill: AXIS_INK }}
                />
                <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72}>
                  {gradeData.map((d) => (
                    <Cell key={d.name} fill={GRADE_COLORS[d.name]} />
                  ))}
                  <LabelList dataKey="value" position="top" fontSize={12} fill={AXIS_INK} formatter={countLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance / Gender / Standard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 mb-2">Attendance</h4>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={attendance} margin={{ top: 10, right: 8, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_INK} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }}
                    label={{ value: "Students", angle: -90, position: "insideLeft", fontSize: 12, fill: AXIS_INK }} />
                  <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    <Cell fill={C_PRESENT} />
                    <Cell fill={C_ABSENT} />
                    <LabelList dataKey="value" position="top" fontSize={12} fill={AXIS_INK} formatter={countLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700 mb-2">Gender split</h4>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={gender} margin={{ top: 10, right: 8, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_INK} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }}
                    label={{ value: "Students", angle: -90, position: "insideLeft", fontSize: 12, fill: AXIS_INK }} />
                  <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    <Cell fill={C_MALE} />
                    <Cell fill={C_FEMALE} />
                    <LabelList dataKey="value" position="top" fontSize={12} fill={AXIS_INK} formatter={countLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-700 mb-2">Students by standard</h4>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={byStd} margin={{ top: 10, right: 8, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_INK} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }}
                    label={{ value: "Students", angle: -90, position: "insideLeft", fontSize: 12, fill: AXIS_INK }} />
                  <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {byStd.map((_, i) => (
                      <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                    ))}
                    <LabelList dataKey="value" position="top" fontSize={12} fill={AXIS_INK} formatter={countLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-600">Center</label>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
              value={filterCenter}
              onChange={(e) => setFilterCenter(e.target.value)}
            >
              <option value="">All centers</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Program</label>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
            >
              <option value="">All programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Standard</label>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
              value={filterStd}
              onChange={(e) => setFilterStd(e.target.value)}
            >
              <option value="">All standards</option>
              {STD_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Exam type</label>
            <input
              list="report-exam-types"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
              value={filterExamType}
              onChange={(e) => setFilterExamType(e.target.value)}
              placeholder="All types"
            />
            <datalist id="report-exam-types">
              <option value="baseline" />
              <option value="endline" />
            </datalist>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Month</label>
            <input
              type="month"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>
        </div>
        {(filterCenter || filterProgram || filterStd || filterExamType || filterMonth) && (
          <div className="mt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCenter("");
                setFilterProgram("");
                setFilterStd("");
                setFilterExamType("");
                setFilterMonth("");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {/* Compare bar */}
      {selected.length >= 2 && (
        <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 mb-4">
          <span className="text-sm font-medium text-brand-800">
            {selected.length} exams selected
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => setShowCompare(true)}>
              Compare
            </Button>
          </div>
        </div>
      )}

      {exams.length === 0 ? (
        <EmptyState
          title="No exam records found"
          description="No saved exam marks match these filters. Fill marks in the Mark Entry tab, or change the filters."
        />
      ) : (
        byMonth.map(([mKey, monthExams]) => (
          <div key={mKey} className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500 mb-3">
              {monthLabel(mKey)}
              <span className="ml-2 font-normal text-neutral-400">
                ({monthExams.length} exam{monthExams.length !== 1 ? "s" : ""})
              </span>
            </h3>

            <div className="space-y-4">
              {monthExams.map((ex) => {
                const pct = avgPct(ex);
                const isExpanded = !!expanded[ex.id];
                const mode = viewMode[ex.id] || "table";
                return (
                  <Card key={ex.id}>
                    {/* header */}
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-4 border-b border-neutral-100 pb-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4"
                          checked={selected.includes(ex.id)}
                          onChange={() => toggleSelect(ex.id)}
                          title="Select to compare"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-neutral-900">{ex.name}</span>
                            <Badge variant="neutral">{ex.examType}</Badge>
                            {pct != null && (
                              <Badge variant={pct >= 40 ? "success" : "neutral"}>
                                Avg {pct.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            {new Date(ex.examDate).toLocaleDateString()} · {ex.center.name} · {ex.program.name}
                            {ex.enteredBy.length > 0 && <> · by {ex.enteredBy.join(", ")}</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {mode === "graph" ? (
                          <Button type="button" variant="secondary" size="sm" onClick={() => setViewMode((p) => ({ ...p, [ex.id]: "table" }))}>
                            View in table
                          </Button>
                        ) : (
                          <>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setExpanded((p) => ({ ...p, [ex.id]: !p[ex.id] }))}>
                              {isExpanded ? "Hide subjects" : "Show subjects"}
                            </Button>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setViewMode((p) => ({ ...p, [ex.id]: "graph" }))}>
                              View in graph
                            </Button>
                          </>
                        )}
                        <Button type="button" variant="secondary" size="sm" onClick={() => printExam(ex)}>
                          PDF
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(ex.id)}>
                          Edit
                        </Button>
                        {canDelete && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-danger hover:bg-danger/10"
                            onClick={() => setDeleteTarget(ex)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* summary tiles */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        { label: "Total", value: ex.totals.totalStudents },
                        { label: "Present", value: ex.totals.present },
                        { label: "Absent", value: ex.totals.absent },
                        { label: "Male", value: ex.totals.male },
                        { label: "Female", value: ex.totals.female },
                      ].map((t) => (
                        <div key={t.label} className="px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-100 text-center min-w-[70px]">
                          <div className="text-lg font-semibold text-neutral-900">{t.value}</div>
                          <div className="text-[11px] uppercase tracking-wide text-neutral-500">{t.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* grade-wise counts (whole class) */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="text-[11px] uppercase tracking-wide text-neutral-400 font-semibold mr-1">
                        Grades
                      </span>
                      {GRADE_KEYS.map((g) => {
                        const gc = gradeCounts(ex);
                        return (
                          <div
                            key={g}
                            className="px-3 py-2 rounded-lg text-center min-w-[62px] border"
                            style={{ backgroundColor: `${GRADE_COLORS[g]}12`, borderColor: `${GRADE_COLORS[g]}33` }}
                          >
                            <div className="text-lg font-bold" style={{ color: GRADE_COLORS[g] }}>{gc[g]}</div>
                            <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                              {g} <span className="text-neutral-400">({GRADE_RANGE[g]})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* student data — table or graph */}
                    {mode === "graph" ? (
                      renderCharts(ex)
                    ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-neutral-200 text-left text-neutral-600">
                            <th className="py-2 pr-3 font-medium">#</th>
                            <th className="py-2 pr-3 font-medium">Roll</th>
                            <th className="py-2 pr-3 font-medium">Student</th>
                            <th className="py-2 pr-2 font-medium text-center">Gender</th>
                            {isExpanded &&
                              ex.subjects.map((s) => (
                                <th key={s.id} className="py-2 pr-2 font-medium text-center capitalize">
                                  {s.name}
                                  <span className="block text-[10px] text-neutral-400">/{s.maxMarks}</span>
                                </th>
                              ))}
                            <th className="py-2 pr-2 font-medium text-center">Total</th>
                            <th className="py-2 pr-2 font-medium text-center">%</th>
                            <th className="py-2 pr-2 font-medium text-center">Grade</th>
                            <th className="py-2 pr-2 font-medium text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ex.students.map((s, i) => {
                            const stPct =
                              !s.isAbsent && s.maxTotal > 0 && s.hasMarks
                                ? (s.obtainedTotal / s.maxTotal) * 100
                                : null;
                            return (
                              <tr key={s.studentId} className={`border-b border-neutral-100 ${i % 2 ? "bg-neutral-50/60" : ""}`}>
                                <td className="py-2 pr-3 text-neutral-500">{i + 1}</td>
                                <td className="py-2 pr-3 text-neutral-600">{s.rollNumber || "—"}</td>
                                <td className="py-2 pr-3 font-medium text-neutral-900 whitespace-nowrap">{s.name}</td>
                                <td className="py-2 pr-2 text-center">{genderShort(s.gender)}</td>
                                {isExpanded &&
                                  ex.subjects.map((sub) => {
                                    const cell = s.perSubject[sub.id];
                                    return (
                                      <td key={sub.id} className="py-2 pr-2 text-center">
                                        {!cell ? "—" : cell.isAbsent ? <span className="text-neutral-400">Ab</span> : cell.marks ?? "—"}
                                      </td>
                                    );
                                  })}
                                <td className="py-2 pr-2 text-center font-semibold">
                                  {s.isAbsent ? "—" : `${s.obtainedTotal}/${s.maxTotal}`}
                                </td>
                                <td className="py-2 pr-2 text-center">
                                  {stPct != null ? `${stPct.toFixed(0)}%` : "—"}
                                </td>
                                <td className="py-2 pr-2 text-center">
                                  {stPct != null ? (
                                    <span
                                      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                      style={{ backgroundColor: GRADE_COLORS[gradeOf(stPct)] }}
                                    >
                                      {gradeOf(stPct)}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="py-2 pr-2 text-center">
                                  {s.isAbsent ? (
                                    <Badge variant="danger">Absent</Badge>
                                  ) : (
                                    <Badge variant="success">Present</Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Compare modal (simple side-by-side) */}
      {showCompare && selectedExams.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCompare(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Compare exams</h3>
              <button className="text-neutral-500 hover:text-neutral-800" onClick={() => setShowCompare(false)}>✕</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-600">
                    <th className="py-2 pr-3 font-medium">Exam</th>
                    <th className="py-2 pr-3 font-medium text-center">Avg %</th>
                    <th className="py-2 pr-3 font-medium text-center">Total</th>
                    <th className="py-2 pr-3 font-medium text-center">Present</th>
                    <th className="py-2 pr-3 font-medium text-center">Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExams.map((ex) => {
                    const p = avgPct(ex);
                    return (
                      <tr key={ex.id} className="border-b border-neutral-100">
                        <td className="py-2 pr-3">
                          <div className="font-medium text-neutral-900">{ex.name}</div>
                          <div className="text-xs text-neutral-500">
                            {new Date(ex.examDate).toLocaleDateString()} · {ex.center.name}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-center font-semibold">{p != null ? `${p.toFixed(1)}%` : "—"}</td>
                        <td className="py-2 pr-3 text-center">{ex.totals.totalStudents}</td>
                        <td className="py-2 pr-3 text-center">{ex.totals.present}</td>
                        <td className="py-2 pr-3 text-center">{ex.totals.absent}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete this exam?"
        message={
          deleteTarget
            ? `This permanently deletes "${deleteTarget.name}" and all its marks. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete exam"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
