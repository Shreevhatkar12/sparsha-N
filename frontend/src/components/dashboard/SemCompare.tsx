import React, { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from "recharts";
import type { SemCompareData } from "../../services/reports.service";

type Group = "all" | "sanskar" | "swayam";
const GROUPS: Array<{ key: Group; label: string }> = [
  { key: "all", label: "All" },
  { key: "sanskar", label: "Sanskar" },
  { key: "swayam", label: "Swayam" },
];

// Sem Baseline vs Sem Endline — average % per subject, so improvement is
// easy to see. Follows the dashboard filters; the small toggle narrows it
// to one program.
export const SemCompare: React.FC<{ data?: SemCompareData }> = ({ data }) => {
  const [group, setGroup] = useState<Group>("all");
  const [view, setView] = useState<"graph" | "table">("graph");
  const rows = data?.[group] ?? [];
  const hasData = rows.some((r) => r.baseline !== null || r.endline !== null);
  const chart = rows.map((r) => ({ subject: r.subject, Baseline: r.baseline ?? 0, Endline: r.endline ?? 0 }));
  const pill = (active: boolean) =>
    `px-3 py-1 text-xs font-bold ${active ? "bg-primary text-white" : "bg-white text-neutral-500"}`;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-neutral-900">Sem Baseline vs Sem Endline</h3>
          <p className="mt-1 text-[11px] font-medium text-neutral-400">Average % per subject — see the improvement</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-neutral-200">
            {GROUPS.map((g) => (
              <button key={g.key} type="button" className={pill(group === g.key)} onClick={() => setGroup(g.key)}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-neutral-200">
            <button type="button" className={pill(view === "graph")} onClick={() => setView("graph")}>Graph</button>
            <button type="button" className={pill(view === "table")} onClick={() => setView("table")}>Table</button>
          </div>
        </div>
      </div>

      {!hasData ? (
        <p className="mt-6 text-sm text-neutral-500">No Sem Baseline / Endline marks for this selection.</p>
      ) : view === "graph" ? (
        <div className="mt-4" style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chart} margin={{ top: 16, right: 8, bottom: 8, left: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
              <XAxis dataKey="subject" tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => `${v ?? 0}%`} cursor={{ fill: "#f6f8fa" }} />
              <Legend />
              <Bar dataKey="Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={48}>
                <LabelList dataKey="Baseline" position="top" fontSize={11} formatter={(v) => (Number(v) > 0 ? `${v}%` : "")} />
              </Bar>
              <Bar dataKey="Endline" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48}>
                <LabelList dataKey="Endline" position="top" fontSize={11} formatter={(v) => (Number(v) > 0 ? `${v}%` : "")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-neutral-400">
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Baseline %</th>
                <th className="py-2 pr-3">Endline %</th>
                <th className="py-2 pr-3">Improvement</th>
                <th className="py-2 pr-3">Students (B / E)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.subject} className="border-t border-neutral-100">
                  <td className="py-2 pr-3 font-semibold text-neutral-800">{r.subject}</td>
                  <td className="py-2 pr-3">{r.baseline ?? "—"}{r.baseline !== null ? "%" : ""}</td>
                  <td className="py-2 pr-3">{r.endline ?? "—"}{r.endline !== null ? "%" : ""}</td>
                  <td className={`py-2 pr-3 font-bold ${r.improvement === null ? "text-neutral-400" : r.improvement >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {r.improvement === null ? "—" : `${r.improvement > 0 ? "+" : ""}${r.improvement}%`}
                  </td>
                  <td className="py-2 pr-3 text-neutral-500">{r.baselineStudents} / {r.endlineStudents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
