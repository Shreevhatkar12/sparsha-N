import React, { useCallback, useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ErrorMessage } from "../ui/ErrorMessage";
import {
  Users,
  UserCog,
  Building2,
  ClipboardCheck,
  GraduationCap,
  Activity,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  Cell,
} from "recharts";
import { getAdminAnalytics, type AdminAnalyticsData } from "../../services/reports.service";
import { PeriodFilter, defaultPeriod, periodParams, type PeriodValue } from "./PeriodFilter";

// Shared, colour-blind-safe system (same as the rest of the app).
const CAT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const C_MALE = "#2a78d6";
const C_FEMALE = "#e87ba4";
const C_ATT = "#1baf7a";
const C_EXAM = "#4a3aa7";
const C_ACT = "#eda100";
const C_GROWTH_BAR = "#2a78d6";
const C_GROWTH_LINE = "#eb6834";
const AXIS_INK = "#6b7280";
const GRID_INK = "#eef1f4";

const GRADE_ORDER = ["A", "B", "C", "D", "E"] as const;
const GRADE_COLORS: Record<string, string> = {
  A: "#008300",
  B: "#2a78d6",
  C: "#eda100",
  D: "#eb6834",
  E: "#e34948",
};

const CHART_MARGIN = { top: 12, right: 16, bottom: 28, left: 8 };
const hideZero = (v: unknown) => (Number(v) > 0 ? String(v) : "");
const pctLabel = (v: unknown) => (v == null || v === "" ? "" : `${v}%`);
const topRadius = (last: boolean): [number, number, number, number] =>
  last ? [4, 4, 0, 0] : [0, 0, 0, 0];

type KpiProps = { icon: React.ReactNode; tint: string; label: string; value: React.ReactNode; sub?: string };
const Kpi: React.FC<KpiProps> = ({ icon, tint, label, value, sub }) => (
  <Card className="border-none shadow-sm">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${tint}1a`, color: tint }}>
        {icon}
      </div>
      <span className="text-neutral-500 font-bold text-[11px] uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl md:text-3xl font-black text-neutral-900">{value}</p>
    {sub && <p className="text-[11px] text-neutral-500 mt-0.5">{sub}</p>}
  </Card>
);

const EmptyBox: React.FC<{ msg?: string }> = ({ msg }) => (
  <div className="flex items-center justify-center h-[220px] rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70">
    <p className="text-sm text-neutral-400">{msg || "No data here yet"}</p>
  </div>
);

export const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [centerId, setCenterId] = useState("");
  const [programId, setProgramId] = useState("");
  const [standard, setStandard] = useState("");
  const [grade, setGrade] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [periodVal, setPeriodVal] = useState<PeriodValue>(defaultPeriod);

  const [views, setViews] = useState<Record<string, "graph" | "table">>({});
  const viewOf = (k: string) => views[k] ?? "graph";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | undefined> = { ...periodParams(periodVal) };
      if (centerId) params.centerId = centerId;
      if (programId) params.programId = programId;
      if (standard) params.standard = standard;
      if (grade) params.grade = grade;
      if (teacherId) params.teacherId = teacherId;
      const d = await getAdminAnalytics(params);
      setData(d);
    } catch {
      setError("Could not load admin analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [centerId, programId, standard, grade, teacherId, periodVal]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetFilters = () => {
    setCenterId("");
    setProgramId("");
    setStandard("");
    setGrade("");
    setTeacherId("");
  };

  const hasFilters = !!centerId || !!programId || !!standard || !!grade || !!teacherId;

  const ToggleView: React.FC<{ k: string }> = ({ k }) => (
    <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-semibold">
      {(["graph", "table"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setViews((v) => ({ ...v, [k]: m }))}
          className={
            "px-3 py-1.5 capitalize " +
            (viewOf(k) === m ? "bg-brand-500 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50")
          }
        >
          {m}
        </button>
      ))}
    </div>
  );

  const SectionCard: React.FC<{
    title: string;
    subtitle?: string;
    toggleKey?: string;
    children: React.ReactNode;
  }> = ({ title, subtitle, toggleKey, children }) => (
    <Card className="border-none shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-neutral-900">{title}</h3>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
        {toggleKey && <ToggleView k={toggleKey} />}
      </div>
      {children}
    </Card>
  );

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  const k = data.kpis;

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="h-6 w-1.5 rounded-full bg-brand-500" />
          <h2 className="text-xl font-black text-neutral-900">Organisation Analytics</h2>
          <span className="text-xs text-neutral-400 font-semibold">
            {data.scope === "all" ? "All centers" : "Your centers"}
          </span>
        </div>
        <PeriodFilter value={periodVal} onChange={setPeriodVal} />
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-1 block">Center</label>
            <select className="w-full h-10 rounded-lg border border-neutral-300 px-2 text-sm bg-white" value={centerId} onChange={(e) => setCenterId(e.target.value)}>
              <option value="">All</option>
              {data.filterOptions.centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-1 block">Program</label>
            <select className="w-full h-10 rounded-lg border border-neutral-300 px-2 text-sm bg-white" value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="">All</option>
              {data.filterOptions.programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-1 block">Standard</label>
            <select className="w-full h-10 rounded-lg border border-neutral-300 px-2 text-sm bg-white" value={standard} onChange={(e) => setStandard(e.target.value)}>
              <option value="">All</option>
              {data.filterOptions.standards.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-1 block">Grade</label>
            <select className="w-full h-10 rounded-lg border border-neutral-300 px-2 text-sm bg-white" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">All</option>
              {data.filterOptions.grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-1 block">Teacher</label>
            <select className="w-full h-10 rounded-lg border border-neutral-300 px-2 text-sm bg-white" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">All</option>
              {data.filterOptions.teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>
            {loading && <span className="text-xs text-neutral-400">Updating…</span>}
          </div>
        )}
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4">
        <Kpi icon={<Users size={20} />} tint={C_MALE} label="Students" value={k.totalStudents} sub={`${k.male} M · ${k.female} F`} />
        <Kpi icon={<ClipboardCheck size={20} />} tint={C_ATT} label="Attendance" value={`${k.overallAttendanceRate}%`} sub="last 12 months" />
        <Kpi icon={<GraduationCap size={20} />} tint={C_EXAM} label="Avg Exam %" value={`${k.avgExamPercent}%`} sub={`${k.examsConducted} exams`} />
        <Kpi icon={<Activity size={20} />} tint={C_ACT} label="Activities" value={k.totalActivities} sub="conducted" />
        <Kpi icon={<UserCog size={20} />} tint="#4a3aa7" label="Teachers" value={k.totalTeachers} />
        <Kpi icon={<Building2 size={20} />} tint="#008300" label="Centers" value={k.totalCenters} />
        <Kpi icon={<BookOpen size={20} />} tint="#eb6834" label="Meetings" value={k.studentMeetings + k.parentMeetings} sub={`${k.studentMeetings} student · ${k.parentMeetings} parent`} />
        <Kpi icon={<TrendingUp size={20} />} tint="#e87ba4" label="Girls / Boys" value={`${k.female} / ${k.male}`} sub={k.other ? `${k.other} other` : undefined} />
      </div>

      {/* Standard-wise students (whole scope) */}
      <SectionCard
        title="Standard-wise Students"
        subtitle="Students per standard — total with Male / Female split (whole class)"
        toggleKey="std"
      >
        {!data.stdWise || data.stdWise.length === 0 ? (
          <EmptyBox />
        ) : viewOf("std") === "graph" ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.stdWise} margin={{ ...CHART_MARGIN, top: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
              <XAxis dataKey="standard" tick={{ fontSize: 12, fill: AXIS_INK }} tickLine={false} label={{ value: "Standard", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_INK }} tickLine={false} axisLine={false} label={{ value: "Students", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "#f6f8fa" }}
                formatter={(v, name) => [`${v ?? 0}`, String(name)]}
                labelFormatter={(l) => {
                  const row = data.stdWise?.find((r) => r.standard === l);
                  return row ? `${l} — Total ${row.total}` : String(l);
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="male" name="Male" stackId="g" fill={C_MALE} maxBarSize={56}>
                <LabelList dataKey="male" position="center" fontSize={11} fill="#fff" formatter={hideZero} />
              </Bar>
              <Bar dataKey="female" name="Female" stackId="g" fill={C_FEMALE} maxBarSize={56}>
                <LabelList dataKey="female" position="center" fontSize={11} fill="#fff" formatter={hideZero} />
              </Bar>
              <Bar dataKey="other" name="Other" stackId="g" fill="#9ca3af" radius={[4, 4, 0, 0]} maxBarSize={56}>
                <LabelList dataKey="other" position="center" fontSize={11} fill="#fff" formatter={hideZero} />
                {/* Total on top of every stacked bar */}
                <LabelList
                  dataKey="total"
                  position="top"
                  fontSize={12}
                  fill="#111827"
                  fontWeight={700}
                  formatter={(v: unknown) => (Number(v) > 0 ? `Total ${v}` : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <SimpleTable
            head={["Standard", "Total", "Male", "Female", "Other"]}
            rows={[
              ...data.stdWise.map((r) => [r.standard, r.total, r.male, r.female, r.other]),
              [
                "All",
                data.stdWise.reduce((a, r) => a + r.total, 0),
                data.stdWise.reduce((a, r) => a + r.male, 0),
                data.stdWise.reduce((a, r) => a + r.female, 0),
                data.stdWise.reduce((a, r) => a + r.other, 0),
              ],
            ]}
          />
        )}
      </SectionCard>

      {/* Standard-wise students — per center */}
      {data.stdWiseByCenter && data.stdWiseByCenter.length > 0 && (
        <SectionCard
          title="Standard-wise Students — per Center"
          subtitle="Standard-wise totals with Male / Female count for every center"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.stdWiseByCenter.map((c) => (
              <div key={c.centerId} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-neutral-800">{c.centerName}</span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white border border-neutral-200 text-brand-700">
                    Total {c.total}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-neutral-500 border-b border-neutral-200">
                        <th className="py-1.5 pr-2 font-semibold">Std</th>
                        <th className="py-1.5 px-2 font-semibold text-center">Total</th>
                        <th className="py-1.5 px-2 font-semibold text-center" style={{ color: C_MALE }}>Male</th>
                        <th className="py-1.5 px-2 font-semibold text-center" style={{ color: C_FEMALE }}>Female</th>
                        <th className="py-1.5 pl-2 font-semibold text-center">Other</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.rows.map((r) => (
                        <tr key={r.standard} className="border-b border-neutral-100 last:border-0">
                          <td className="py-1.5 pr-2 font-medium text-neutral-800">{r.standard}</td>
                          <td className="py-1.5 px-2 text-center font-bold text-neutral-900">{r.total}</td>
                          <td className="py-1.5 px-2 text-center text-neutral-700">{r.male}</td>
                          <td className="py-1.5 px-2 text-center text-neutral-700">{r.female}</td>
                          <td className="py-1.5 pl-2 text-center text-neutral-500">{r.other || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Attendance trend */}
      <SectionCard title="Attendance Trend (month-wise)" subtitle="Overall attendance % per month" toggleKey="att">
        {data.attendanceMonthly.length === 0 ? (
          <EmptyBox />
        ) : viewOf("att") === "graph" ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.attendanceMonthly} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS_INK }} tickLine={false} label={{ value: "Month", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: AXIS_INK }} tickLine={false} axisLine={false} label={{ value: "Attendance %", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v ?? 0}%`} cursor={{ stroke: GRID_INK }} />
              <Line dataKey="rate" name="Attendance %" type="monotone" stroke={C_ATT} strokeWidth={3} dot={{ r: 3 }}>
                <LabelList dataKey="rate" position="top" fontSize={11} fill={C_ATT} formatter={pctLabel} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <SimpleTable head={["Month", "Attendance %"]} rows={data.attendanceMonthly.map((m) => [m.label, `${m.rate}%`])} />
        )}
      </SectionCard>

      {/* Exam grades by month */}
      <SectionCard title="Exam Grades by Month" subtitle="One bar = one month, grade-wise student count (A–E)" toggleKey="grades">
        {data.gradeByMonth.length === 0 ? (
          <EmptyBox msg="No exam data yet" />
        ) : viewOf("grades") === "graph" ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.gradeByMonth} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS_INK }} tickLine={false} label={{ value: "Month", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_INK }} tickLine={false} axisLine={false} label={{ value: "Students", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }} />
              <Tooltip cursor={{ fill: "#f6f8fa" }} />
              <Legend />
              {GRADE_ORDER.map((g, idx) => (
                <Bar key={g} dataKey={g} stackId="g" name={`Grade ${g}`} fill={GRADE_COLORS[g]} radius={topRadius(idx === GRADE_ORDER.length - 1)}>
                  <LabelList dataKey={g} position="center" fontSize={11} fill="#ffffff" formatter={hideZero} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <SimpleTable
            head={["Standard", "A", "B", "C", "D", "E", "Total"]}
            rows={data.gradeByStd.map((r) => [r.standard, r.A, r.B, r.C, r.D, r.E, r.total])}
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment growth */}
        <SectionCard title="Enrollment Growth" subtitle="Added per month + running total (gender split)" toggleKey="enr">
          {data.enrollmentMonthly.length === 0 ? (
            <EmptyBox />
          ) : viewOf("enr") === "graph" ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.enrollmentMonthly} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS_INK }} tickLine={false} label={{ value: "Month", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_INK }} tickLine={false} axisLine={false} label={{ value: "Students", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#f6f8fa" }} />
                <Legend />
                <Bar dataKey="added" name="New added" fill={C_GROWTH_BAR} radius={[4, 4, 0, 0]} barSize={24}>
                  <LabelList dataKey="added" position="top" fontSize={11} fill={AXIS_INK} formatter={hideZero} />
                </Bar>
                <Line dataKey="cumulative" name="Total" type="monotone" stroke={C_GROWTH_LINE} strokeWidth={3} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <SimpleTable head={["Month", "Added", "Total", "M", "F"]} rows={data.enrollmentMonthly.map((m) => [m.label, m.added, m.cumulative, m.male, m.female])} />
          )}
        </SectionCard>

        {/* Activities */}
        <SectionCard title="Activities Conducted" subtitle="Activities conducted per month" toggleKey="act">
          {data.activitiesMonthly.length === 0 ? (
            <EmptyBox />
          ) : viewOf("act") === "graph" ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.activitiesMonthly} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS_INK }} tickLine={false} label={{ value: "Month", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_INK }} tickLine={false} axisLine={false} label={{ value: "Activities", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#f6f8fa" }} />
                <Bar dataKey="count" name="Activities" fill={C_ACT} radius={[4, 4, 0, 0]} barSize={28}>
                  <LabelList dataKey="count" position="top" fontSize={11} fill={AXIS_INK} formatter={hideZero} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <SimpleTable head={["Month", "Activities"]} rows={data.activitiesMonthly.map((m) => [m.label, m.count])} />
          )}
        </SectionCard>
      </div>

      {/* Center comparison */}
      <SectionCard title="Center Comparison" subtitle="Students, attendance % and avg exam % — center-wise" toggleKey="cmp">
        {data.centerComparison.length === 0 ? (
          <EmptyBox />
        ) : viewOf("cmp") === "graph" ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.centerComparison} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS_INK }} tickLine={false} label={{ value: "Center", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12, fill: AXIS_INK }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f6f8fa" }} />
              <Legend />
              <Bar dataKey="students" name="Students" fill={C_MALE} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="students" position="top" fontSize={10} fill={AXIS_INK} formatter={hideZero} />
              </Bar>
              <Bar dataKey="attendanceRate" name="Attendance %" fill={C_ATT} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="attendanceRate" position="top" fontSize={10} fill={AXIS_INK} formatter={hideZero} />
              </Bar>
              <Bar dataKey="avgExamPercent" name="Avg Exam %" fill={C_EXAM} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="avgExamPercent" position="top" fontSize={10} fill={AXIS_INK} formatter={hideZero} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <SimpleTable
            head={["Center", "Students", "Attendance %", "Avg Exam %", "Activities"]}
            rows={data.centerComparison.map((c) => [c.name, c.students, `${c.attendanceRate}%`, `${c.avgExamPercent}%`, c.activities])}
          />
        )}
      </SectionCard>

      {/* Avg by subject */}
      {data.avgBySubject.length > 0 && (
        <SectionCard title="Average % by Subject" subtitle="How students perform in each subject">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.avgBySubject} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS_INK }} tickLine={false} label={{ value: "Subject", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: AXIS_INK }} tickLine={false} axisLine={false} label={{ value: "Average %", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v ?? 0}%`} cursor={{ fill: "#f6f8fa" }} />
              <Bar dataKey="avgPercent" name="Average %" radius={[4, 4, 0, 0]} maxBarSize={64}>
                {data.avgBySubject.map((_, i) => (
                  <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                ))}
                <LabelList dataKey="avgPercent" position="top" fontSize={11} fill={AXIS_INK} formatter={pctLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Teacher-wise summary */}
      <SectionCard title="Teacher-wise Summary" subtitle="Each teacher\u2019s students / attendance / exams / activities">
        {data.teacherSummary.length === 0 ? (
          <EmptyBox />
        ) : (
          <SimpleTable
            head={["Teacher", "Students", "Attendance %", "Exams", "Avg %", "Activities"]}
            rows={data.teacherSummary.map((t) => [t.name, t.students, `${t.attendanceRate}%`, t.examsEntered, `${t.avgPercent}%`, t.activities])}
          />
        )}
      </SectionCard>

      {/* Smart insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data completeness */}
        <Card className="border-none shadow-sm">
          <h3 className="font-bold text-neutral-900 mb-1">Data Completeness</h3>
          <p className="text-xs text-neutral-500 mb-4">Kiti students cha data bharla ahe</p>
          <Meter label="Marks entered" value={data.dataCompleteness.marksPercent} sub={`${data.dataCompleteness.withMarks}/${data.dataCompleteness.totalStudents}`} color={C_EXAM} />
          <div className="h-3" />
          <Meter label="Attendance marked" value={data.dataCompleteness.attendancePercent} sub={`${data.dataCompleteness.withAttendance}/${data.dataCompleteness.totalStudents}`} color={C_ATT} />
        </Card>

        {/* Parent engagement */}
        <Card className="border-none shadow-sm">
          <h3 className="font-bold text-neutral-900 mb-1">Parent Engagement</h3>
          <p className="text-xs text-neutral-500 mb-4">Meetings ani parent attendance</p>
          <div className="grid grid-cols-2 gap-3">
            <MiniTile label="Parent meetings" value={data.meetings.parentTotal} />
            <MiniTile label="Parents attended" value={data.meetings.parentAttendees} />
            <MiniTile label="Mothers" value={data.meetings.parentFemale} color={C_FEMALE} />
            <MiniTile label="Fathers" value={data.meetings.parentMale} color={C_MALE} />
          </div>
          <div className="mt-3 text-xs text-neutral-500">
            Student meetings: <b className="text-neutral-800">{data.meetings.studentTotal}</b> · present{" "}
            <b className="text-neutral-800">{data.meetings.studentPresent}</b>
          </div>
        </Card>

        {/* Gender equity — attendance */}
        <Card className="border-none shadow-sm">
          <h3 className="font-bold text-neutral-900 mb-1">Gender Equity</h3>
          <p className="text-xs text-neutral-500 mb-4">Attendance % — girls vs boys</p>
          <Meter label="Girls attendance" value={data.genderEquity.attendanceByGender.femaleRate} color={C_FEMALE} />
          <div className="h-3" />
          <Meter label="Boys attendance" value={data.genderEquity.attendanceByGender.maleRate} color={C_MALE} />
        </Card>
      </div>

      {/* Gender by program */}
      {data.genderEquity.byProgram.length > 0 && (
        <SectionCard title="Gender by Program" subtitle="Girl / boy count per program">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.genderEquity.byProgram} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
              <XAxis dataKey="program" tick={{ fontSize: 11, fill: AXIS_INK }} tickLine={false} label={{ value: "Program", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_INK }} tickLine={false} axisLine={false} label={{ value: "Students", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }} />
              <Tooltip cursor={{ fill: "#f6f8fa" }} />
              <Legend />
              <Bar dataKey="female" name="Girls" fill={C_FEMALE} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="female" position="top" fontSize={11} fill={AXIS_INK} formatter={hideZero} />
              </Bar>
              <Bar dataKey="male" name="Boys" fill={C_MALE} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="male" position="top" fontSize={11} fill={AXIS_INK} formatter={hideZero} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* At-risk students */}
      <SectionCard title="At-risk Students" subtitle="Attendance below 60% or grade D/E — students who need attention">
        {data.atRisk.length === 0 ? (
          <EmptyBox msg="Koni at-risk nahi 🎉" />
        ) : (
          <SimpleTable
            head={["Student", "Center", "Std", "Attendance", "Exam %", "Grade", "Reason"]}
            rows={data.atRisk.map((s) => [
              s.name,
              s.center,
              s.standard,
              s.attendanceRate != null ? `${s.attendanceRate}%` : "—",
              s.avgPercent != null ? `${s.avgPercent}%` : "—",
              s.grade || "—",
              s.reasons.join(", "),
            ])}
          />
        )}
      </SectionCard>
    </div>
  );
};

// ── small presentational helpers ──────────────────────────────────────
const SimpleTable: React.FC<{ head: string[]; rows: Array<Array<React.ReactNode>> }> = ({ head, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-neutral-600">
          {head.map((h, i) => (
            <th key={i} className={"py-2 pr-3 font-medium " + (i === 0 ? "" : "text-center")}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className={"border-b border-neutral-100 " + (ri % 2 ? "bg-neutral-50/60" : "")}>
            {r.map((c, ci) => (
              <td key={ci} className={"py-2 pr-3 " + (ci === 0 ? "font-medium text-neutral-900" : "text-center text-neutral-700")}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Meter: React.FC<{ label: string; value: number; sub?: string; color: string }> = ({ label, value, sub, color }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <span className="text-sm font-black text-neutral-900">
        {value}% {sub && <span className="text-[11px] font-normal text-neutral-400">({sub})</span>}
      </span>
    </div>
    <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  </div>
);

const MiniTile: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
  <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-center">
    <div className="text-xl font-black" style={{ color: color || "#111827" }}>{value}</div>
    <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
  </div>
);

export default AdminAnalytics;
