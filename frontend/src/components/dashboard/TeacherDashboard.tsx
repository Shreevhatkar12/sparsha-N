import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PageWrapper } from "../layout/PageWrapper";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ErrorMessage } from "../ui/ErrorMessage";
import { Users, TrendingUp, Activity, Target } from "lucide-react";
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
} from "recharts";
import {
  getTeacherDashboard,
  type TeacherDashboardData,
} from "../../services/reports.service";

// Colour-blind-safe categorical palette (validated) — same system as the
// Exam Report so the whole app reads as one visual language.
const C_MALE = "#2a78d6";
const C_FEMALE = "#e87ba4";
const C_OTHER = "#9aa4b2";
const C_GROWTH_BAR = "#2a78d6";
const C_GROWTH_LINE = "#eb6834";
const C_ATT = "#1baf7a";
const C_EXAM = "#4a3aa7";
const C_ACT = "#eda100";
const AXIS_INK = "#6b7280";
const GRID_INK = "#eef1f4";

// Grade system — green (best) → red (needs support). Colour-blind friendly.
const GRADE_ORDER = ["A", "B", "C", "D", "E"] as const;
const GRADE_COLORS: Record<string, string> = {
  A: "#008300",
  B: "#2a78d6",
  C: "#eda100",
  D: "#eb6834",
  E: "#e34948",
};
const GRADE_RANGE: Record<string, string> = {
  A: "80% & above",
  B: "60–79%",
  C: "50–59%",
  D: "40–49%",
  E: "below 40%",
};

const CHART_H = 280;
const CHART_MARGIN = { top: 8, right: 16, bottom: 28, left: 8 };

// Label helpers for data labels on charts (v is untyped on purpose — safe under
// strictFunctionTypes, same as the Tooltip formatter pattern).
const hideZero = (v: unknown) => (Number(v) > 0 ? String(v) : "");
const pctLabel = (v: unknown) => (v == null || v === "" ? "" : `${v}%`);
// Explicit tuple type so the radius prop keeps its [n,n,n,n] shape.
const topRadius = (last: boolean): [number, number, number, number] =>
  last ? [4, 4, 0, 0] : [0, 0, 0, 0];

type KpiProps = {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
};

const Kpi: React.FC<KpiProps> = ({ icon, tint, label, value, sub }) => (
  <Card className="border-none shadow-sm">
    <div className="flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${tint}1a`, color: tint }}>
          {icon}
        </div>
        <span className="text-neutral-500 font-bold text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl md:text-4xl font-black text-neutral-900 mb-1">{value}</p>
      {sub && <div className="text-xs font-semibold text-neutral-500">{sub}</div>}
    </div>
  </Card>
);

type ChartCardProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  hasData: boolean;
  children: React.ReactNode;
};

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, right, hasData, children }) => (
  <Card className="border-none shadow-sm">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="font-bold text-neutral-900">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    {hasData ? (
      children
    ) : (
      <div className="flex items-center justify-center h-[220px] rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70">
        <p className="text-sm text-neutral-400">Ajun ithe data nahi</p>
      </div>
    )}
  </Card>
);

export const TeacherDashboard: React.FC = () => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [centerId, setCenterId] = useState<string>("");
  const [programId, setProgramId] = useState<string>("");
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | undefined> = {};
      if (centerId) params.centerId = centerId;
      if (programId) params.programId = programId;
      if (selectedStandards.length) params.standards = selectedStandards.join(",");
      const d = await getTeacherDashboard(params);
      setData(d);
    } catch {
      setError("Dashboard load nahi zala. Parat try kara.");
    } finally {
      setLoading(false);
    }
  }, [centerId, programId, selectedStandards]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStandard = (std: string) => {
    setSelectedStandards((prev) =>
      prev.includes(std) ? prev.filter((s) => s !== std) : [...prev, std],
    );
  };

  const resetFilters = () => {
    setCenterId("");
    setProgramId("");
    setSelectedStandards([]);
  };

  const stdChartData = useMemo(
    () =>
      (data?.stdBreakdown ?? []).map((s) => ({
        standard: s.standard,
        Male: s.male,
        Female: s.female,
        Other: Math.max(0, s.count - s.male - s.female),
        count: s.count,
      })),
    [data],
  );

  const hasFilters = !!centerId || !!programId || selectedStandards.length > 0;
  const latestGrowth = data?.studentGrowthMonthly?.[data.studentGrowthMonthly.length - 1];
  const delta = data?.examGrowth?.deltaPercent ?? 0;

  return (
    <PageWrapper title="My Dashboard">
      {loading && !data ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : data ? (
        <div className="flex flex-col gap-6">
          {/* Teacher header */}
          <Card className="border-none shadow-sm bg-gradient-to-r from-brand-50 to-white">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-black text-lg">
                {data.teacherName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-neutral-400">Teacher Dashboard</p>
                <h2 className="text-xl md:text-2xl font-black text-neutral-900 leading-tight">
                  {data.teacherName}
                </h2>
                <p className="text-xs text-neutral-500">Aaple registered students cha overview</p>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card className="border-none shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-1 block">
                    Center
                  </label>
                  <select
                    className="w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={centerId}
                    onChange={(e) => setCenterId(e.target.value)}
                  >
                    <option value="">All Centers</option>
                    {data.filterOptions.centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-1 block">
                    Program
                  </label>
                  <select
                    className="w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                  >
                    <option value="">All Programs</option>
                    {data.filterOptions.programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {data.filterOptions.standards.length > 0 && (
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-bold mb-1.5 block">
                    Standard (multi-select)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {data.filterOptions.standards.map((std) => {
                      const active = selectedStandards.includes(std);
                      return (
                        <button
                          key={std}
                          type="button"
                          onClick={() => toggleStandard(std)}
                          className={
                            "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors " +
                            (active
                              ? "bg-brand-500 text-white border-brand-500"
                              : "bg-white text-neutral-600 border-neutral-300 hover:border-brand-400")
                          }
                        >
                          {std}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasFilters && (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Reset filters
                  </Button>
                  {loading && <span className="text-xs text-neutral-400">Updating…</span>}
                </div>
              )}
            </div>
          </Card>

          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Kpi
              icon={<Users size={22} />}
              tint={C_MALE}
              label="Total Students"
              value={data.totals.students}
              sub={
                <span className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: C_MALE }} />
                    {data.totals.male} Male
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: C_FEMALE }} />
                    {data.totals.female} Female
                  </span>
                  {data.totals.other > 0 && <span>· {data.totals.other} Other</span>}
                </span>
              }
            />
            <Kpi
              icon={<Activity size={22} />}
              tint={C_ATT}
              label="Attendance Rate"
              value={`${data.attendance.overallRate}%`}
              sub={`${data.attendance.present + data.attendance.late}/${data.attendance.totalRecords} present`}
            />
            <Kpi
              icon={<TrendingUp size={22} />}
              tint={C_GROWTH_LINE}
              label="Student Growth"
              value={`+${latestGrowth?.added ?? 0}`}
              sub={latestGrowth ? `new in ${latestGrowth.label}` : "no enrolments yet"}
            />
            <Kpi
              icon={<Target size={22} />}
              tint={C_ACT}
              label="Activities Done"
              value={data.totalActivities}
              sub="conducted by you"
            />
          </div>

          {/* Standard-wise students */}
          <ChartCard
            title="Standard-wise Students"
            subtitle="Kontya std la kiti students (Male / Female split)"
            hasData={stdChartData.length > 0}
          >
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={stdChartData} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                <XAxis
                  dataKey="standard"
                  tick={{ fontSize: 12, fill: AXIS_INK }}
                  tickLine={false}
                  label={{ value: "Standard", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: AXIS_INK }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Students", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }}
                />
                <Tooltip cursor={{ fill: "#f6f8fa" }} />
                <Legend />
                <Bar dataKey="Male" stackId="g" fill={C_MALE} radius={[0, 0, 0, 0]}>
                  <LabelList dataKey="Male" position="center" fontSize={11} fill="#ffffff" formatter={hideZero} />
                </Bar>
                <Bar dataKey="Female" stackId="g" fill={C_FEMALE} radius={[0, 0, 0, 0]}>
                  <LabelList dataKey="Female" position="center" fontSize={11} fill="#ffffff" formatter={hideZero} />
                </Bar>
                <Bar dataKey="Other" stackId="g" fill={C_OTHER} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Other" position="center" fontSize={11} fill="#ffffff" formatter={hideZero} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Grade Distribution — big section (month-wise + std-wise) */}
          <Card className="border-none shadow-sm">
            <div className="flex flex-col gap-1 mb-4">
              <h3 className="font-bold text-neutral-900 text-lg">Grade Distribution</h3>
              <p className="text-xs text-neutral-500">
                Exam % var grade — month-wise ani standard-wise. (A 80%+ · B 60–79% · C 50–59% · D 40–49% · E below 40%)
              </p>
            </div>

            {/* grade tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {GRADE_ORDER.map((g) => (
                <div
                  key={g}
                  className="rounded-xl p-3 text-center border"
                  style={{ backgroundColor: `${GRADE_COLORS[g]}12`, borderColor: `${GRADE_COLORS[g]}33` }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: GRADE_COLORS[g] }} />
                    <span className="text-sm font-black" style={{ color: GRADE_COLORS[g] }}>
                      Grade {g}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-neutral-900 mt-1">{data.gradeOverall[g]}</p>
                  <p className="text-[10px] text-neutral-500">{GRADE_RANGE[g]}</p>
                </div>
              ))}
            </div>

            {/* month-wise stacked-by-grade */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-1">Exam Grades by Month</h4>
              <p className="text-xs text-neutral-500 mb-3">
                Ek bar = ek mahina · grade-wise student count (color-wise partition)
              </p>
              {data.gradeByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={data.gradeByMonth} margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: AXIS_INK }}
                      tickLine={false}
                      label={{ value: "Month", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: AXIS_INK }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "Students", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }}
                    />
                    <Tooltip cursor={{ fill: "#f6f8fa" }} />
                    <Legend />
                    {GRADE_ORDER.map((g, idx) => (
                      <Bar
                        key={g}
                        dataKey={g}
                        stackId="grade"
                        name={`Grade ${g} (${GRADE_RANGE[g]})`}
                        fill={GRADE_COLORS[g]}
                        radius={topRadius(idx === GRADE_ORDER.length - 1)}
                      >
                        <LabelList dataKey={g} position="center" fontSize={11} fill="#ffffff" formatter={hideZero} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70">
                  <p className="text-sm text-neutral-400">Ajun exam data nahi</p>
                </div>
              )}
            </div>

            {/* std-wise stacked-by-grade */}
            <div className="mt-8">
              <h4 className="text-sm font-semibold text-neutral-700 mb-1">Exam Grades by Standard</h4>
              <p className="text-xs text-neutral-500 mb-3">Ek bar = ek std · grade-wise student count</p>
              {data.gradeByStd.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.gradeByStd} margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                    <XAxis
                      dataKey="standard"
                      tick={{ fontSize: 12, fill: AXIS_INK }}
                      tickLine={false}
                      label={{ value: "Standard", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: AXIS_INK }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "Students", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }}
                    />
                    <Tooltip cursor={{ fill: "#f6f8fa" }} />
                    <Legend />
                    {GRADE_ORDER.map((g, idx) => (
                      <Bar
                        key={g}
                        dataKey={g}
                        stackId="grade"
                        name={`Grade ${g}`}
                        fill={GRADE_COLORS[g]}
                        radius={topRadius(idx === GRADE_ORDER.length - 1)}
                      >
                        <LabelList dataKey={g} position="center" fontSize={11} fill="#ffffff" formatter={hideZero} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70">
                  <p className="text-sm text-neutral-400">Ajun exam data nahi</p>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student growth month-wise */}
            <ChartCard
              title="Student Growth (month-wise)"
              subtitle="Dar mahinyala kiti students add zale + total"
              hasData={(data.studentGrowthMonthly ?? []).length > 0}
            >
              <ResponsiveContainer width="100%" height={CHART_H}>
                <ComposedChart data={data.studentGrowthMonthly} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: AXIS_INK }}
                    tickLine={false}
                    label={{ value: "Month", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: AXIS_INK }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: "Students", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }}
                  />
                  <Tooltip cursor={{ fill: "#f6f8fa" }} />
                  <Legend />
                  <Bar dataKey="added" name="New added" fill={C_GROWTH_BAR} radius={[4, 4, 0, 0]} barSize={26}>
                    <LabelList dataKey="added" position="top" fontSize={11} fill={AXIS_INK} formatter={hideZero} />
                  </Bar>
                  <Line
                    dataKey="cumulative"
                    name="Total (cumulative)"
                    type="monotone"
                    stroke={C_GROWTH_LINE}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  >
                    <LabelList dataKey="cumulative" position="top" fontSize={11} fill={C_GROWTH_LINE} formatter={hideZero} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Attendance month-wise */}
            <ChartCard
              title="Attendance Rate (month-wise)"
              subtitle="Dar mahinyacha attendance %"
              hasData={(data.attendanceMonthly ?? []).length > 0}
            >
              <ResponsiveContainer width="100%" height={CHART_H}>
                <LineChart data={data.attendanceMonthly} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: AXIS_INK }}
                    tickLine={false}
                    label={{ value: "Month", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: AXIS_INK }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                    label={{ value: "Attendance %", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }}
                  />
                  <Tooltip formatter={(v) => `${v ?? 0}%`} cursor={{ stroke: GRID_INK }} />
                  <Line
                    dataKey="rate"
                    name="Attendance %"
                    type="monotone"
                    stroke={C_ATT}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  >
                    <LabelList dataKey="rate" position="top" fontSize={11} fill={C_ATT} formatter={pctLabel} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Exam average month-wise */}
            <ChartCard
              title="Exam Average % (month-wise)"
              subtitle="Baseline/exam cha average score dar mahina"
              hasData={(data.examMonthly ?? []).length > 0}
              right={
                data.examMonthly.length > 1 ? (
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: delta >= 0 ? "#0083001a" : "#e349481a",
                      color: delta >= 0 ? "#008300" : "#e34948",
                    }}
                  >
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% growth
                  </span>
                ) : undefined
              }
            >
              <ResponsiveContainer width="100%" height={CHART_H}>
                <BarChart data={data.examMonthly} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: AXIS_INK }}
                    tickLine={false}
                    label={{ value: "Month", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: AXIS_INK }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                    label={{ value: "Average %", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }}
                  />
                  <Tooltip formatter={(v) => `${v ?? 0}%`} cursor={{ fill: "#f6f8fa" }} />
                  <Bar dataKey="avgPercent" name="Average %" fill={C_EXAM} radius={[4, 4, 0, 0]} barSize={30}>
                    <LabelList dataKey="avgPercent" position="top" fontSize={11} fill={C_EXAM} formatter={pctLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Activities month-wise */}
            <ChartCard
              title="Activities Conducted (month-wise)"
              subtitle="Dar mahinyala kiti activities zale"
              hasData={(data.activitiesMonthly ?? []).length > 0}
            >
              <ResponsiveContainer width="100%" height={CHART_H}>
                <BarChart data={data.activitiesMonthly} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: AXIS_INK }}
                    tickLine={false}
                    label={{ value: "Month", position: "insideBottom", offset: -12, fill: AXIS_INK, fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: AXIS_INK }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: "Activities", angle: -90, position: "insideLeft", fill: AXIS_INK, fontSize: 12 }}
                  />
                  <Tooltip cursor={{ fill: "#f6f8fa" }} />
                  <Bar dataKey="count" name="Activities" fill={C_ACT} radius={[4, 4, 0, 0]} barSize={30}>
                    <LabelList dataKey="count" position="top" fontSize={11} fill={AXIS_INK} formatter={hideZero} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      ) : null}
    </PageWrapper>
  );
};

export default TeacherDashboard;
