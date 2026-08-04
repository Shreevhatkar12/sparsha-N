import React, { useCallback, useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ErrorMessage } from "../ui/ErrorMessage";
import { useAuthStore } from "../../store/useAuthStore";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { getExamCompletion, type ExamCompletionData } from "../../services/reports.service";

const C_DONE = "#008300";
const C_ABSENT = "#e34948";
const C_PENDING = "#eda100";
const AXIS_INK = "#6b7280";
const GRID_INK = "#eef1f4";
const CHART_MARGIN = { top: 12, right: 16, bottom: 28, left: 8 };
const hideZero = (v: unknown) => (Number(v) > 0 ? String(v) : "");

const statusStyle: Record<string, { label: string; color: string }> = {
  done: { label: "Done", color: C_DONE },
  absent: { label: "Absent", color: C_ABSENT },
  pending: { label: "Pending", color: C_PENDING },
};

export const ExamCompletion: React.FC = () => {
  const role = useAuthStore((s) => s.currentUser?.role) || "";
  const isAdmin = ["super_admin", "tech_admin", "center_admin"].includes(role);

  const [data, setData] = useState<ExamCompletionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [centerId, setCenterId] = useState("");
  const [programId, setProgramId] = useState("");
  const [standard, setStandard] = useState("");
  const [view, setView] = useState<"graph" | "table">("graph");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | undefined> = {};
      if (centerId) params.centerId = centerId;
      if (programId) params.programId = programId;
      if (standard) params.standard = standard;
      const d = await getExamCompletion(params);
      setData(d);
    } catch {
      setError("Could not load exam completion.");
    } finally {
      setLoading(false);
    }
  }, [centerId, programId, standard]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <Card className="border-none shadow-sm">
        <LoadingSpinner />
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="border-none shadow-sm">
        <ErrorMessage message={error} />
      </Card>
    );
  }
  if (!data) return null;

  const t = data.totals;
  const donePct = t.totalSlots > 0 ? Math.round((t.done / t.totalSlots) * 100) : 0;

  const tile = (label: string, value: React.ReactNode, color?: string) => (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-center">
      <div className="text-2xl font-black" style={{ color: color || "#111827" }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  );

  return (
    <Card className="border-none shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Exam Completion — Done vs Pending</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAdmin
              ? "How many students' exams are filled, absent, or still pending (all centers)."
              : "How many of your students' exams are filled vs still pending."}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-semibold">
          {(["graph", "table"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setView(m)}
              className={
                "px-3 py-1.5 capitalize " +
                (view === m ? "bg-brand-500 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50")
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Filters (admins only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <select
            className="h-10 rounded-lg border border-neutral-300 px-2 text-sm bg-white"
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
          <select
            className="h-10 rounded-lg border border-neutral-300 px-2 text-sm bg-white"
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
          <select
            className="h-10 rounded-lg border border-neutral-300 px-2 text-sm bg-white"
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
          >
            <option value="">All Standards</option>
            {data.filterOptions.standards.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {tile("Students", t.totalStudents)}
        {tile("Exams", t.examCount)}
        {tile("Done", t.done, C_DONE)}
        {tile("Pending", t.pending, C_PENDING)}
        {tile("Absent", t.absent, C_ABSENT)}
      </div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-neutral-700">Overall completion</span>
          <span className="text-sm font-black text-neutral-900">{donePct}%</span>
        </div>
        <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${donePct}%`, backgroundColor: C_DONE }} />
        </div>
      </div>

      {data.monthly.length === 0 ? (
        <div className="flex items-center justify-center h-[180px] rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70">
          <p className="text-sm text-neutral-400">No exam data yet.</p>
        </div>
      ) : view === "graph" ? (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.monthly} margin={CHART_MARGIN}>
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
            <Bar dataKey="done" stackId="c" name="Done" fill={C_DONE} radius={[0, 0, 0, 0]}>
              <LabelList dataKey="done" position="center" fontSize={11} fill="#ffffff" formatter={hideZero} />
            </Bar>
            <Bar dataKey="pending" stackId="c" name="Pending" fill={C_PENDING} radius={[0, 0, 0, 0]}>
              <LabelList dataKey="pending" position="center" fontSize={11} fill="#ffffff" formatter={hideZero} />
            </Bar>
            <Bar dataKey="absent" stackId="c" name="Absent" fill={C_ABSENT} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="absent" position="center" fontSize={11} fill="#ffffff" formatter={hideZero} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-600">
                <th className="py-2 pr-3 font-medium">Month</th>
                <th className="py-2 pr-3 font-medium">Exam</th>
                <th className="py-2 pr-3 font-medium text-center">Total</th>
                <th className="py-2 pr-3 font-medium text-center">Done</th>
                <th className="py-2 pr-3 font-medium text-center">Pending</th>
                <th className="py-2 pr-3 font-medium text-center">Absent</th>
                <th className="py-2 pr-3 font-medium text-center">%</th>
                <th className="py-2 pr-3 font-medium text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.exams.map((ex, i) => {
                const pct = ex.total > 0 ? Math.round((ex.done / ex.total) * 100) : 0;
                const isOpen = !!expanded[ex.id];
                return (
                  <React.Fragment key={ex.id}>
                    <tr className={"border-b border-neutral-100 " + (i % 2 ? "bg-neutral-50/60" : "")}>
                      <td className="py-2 pr-3 text-neutral-500">{ex.label}</td>
                      <td className="py-2 pr-3 font-medium text-neutral-900">{ex.name}</td>
                      <td className="py-2 pr-3 text-center">{ex.total}</td>
                      <td className="py-2 pr-3 text-center font-semibold" style={{ color: C_DONE }}>{ex.done}</td>
                      <td className="py-2 pr-3 text-center font-semibold" style={{ color: C_PENDING }}>{ex.pending}</td>
                      <td className="py-2 pr-3 text-center font-semibold" style={{ color: C_ABSENT }}>{ex.absent}</td>
                      <td className="py-2 pr-3 text-center">{pct}%</td>
                      <td className="py-2 pr-3 text-center">
                        <button
                          onClick={() => setExpanded((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50"
                        >
                          {isOpen ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-neutral-50/40">
                        <td colSpan={8} className="p-3">
                          <div className="overflow-x-auto rounded-lg border border-neutral-100 bg-white">
                            <table className="w-full text-xs">
                              <thead className="bg-neutral-50">
                                <tr className="text-left text-neutral-500">
                                  <th className="py-1.5 px-3 font-medium">Student</th>
                                  <th className="py-1.5 px-3 font-medium">Std</th>
                                  <th className="py-1.5 px-3 font-medium">Roll</th>
                                  <th className="py-1.5 px-3 font-medium text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ex.students.map((s) => {
                                  const st = statusStyle[s.status];
                                  return (
                                    <tr key={s.studentId} className="border-t border-neutral-100">
                                      <td className="py-1.5 px-3">{s.name}</td>
                                      <td className="py-1.5 px-3 text-neutral-500">{s.standard || "—"}</td>
                                      <td className="py-1.5 px-3 text-neutral-500">{s.rollNumber || "—"}</td>
                                      <td className="py-1.5 px-3 text-center">
                                        <span
                                          className="inline-block px-2 py-0.5 rounded-full font-bold text-white"
                                          style={{ backgroundColor: st.color }}
                                        >
                                          {st.label}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loading && <p className="text-xs text-neutral-400 mt-2">Updating…</p>}
    </Card>
  );
};

export default ExamCompletion;
