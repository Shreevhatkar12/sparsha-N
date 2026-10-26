import React, { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from "recharts";
import { Card } from "../ui/Card";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ErrorMessage } from "../ui/ErrorMessage";
import { getAipParticipation, type AipParticipationData } from "../../services/reports.service";
import { periodParams, type PeriodValue } from "./PeriodFilter";

type BandKey = "1-4" | "5-7" | "8-10";
const BAND_ORDER: BandKey[] = ["1-4", "5-7", "8-10"];
const BAND_LABEL: Record<BandKey, string> = { "1-4": "1st - 4th", "5-7": "5th - 7th", "8-10": "8th - 10th" };
const BAND_COLOR: Record<BandKey, string> = { "1-4": "#3b82f6", "5-7": "#ec4899", "8-10": "#10b981" };

export const AipParticipation: React.FC<{ periodVal: PeriodValue; centerId?: string }> = ({ periodVal, centerId }) => {
  const [data, setData] = useState<AipParticipationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"graph" | "table">("graph");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | undefined> = { ...periodParams(periodVal) };
        if (centerId) params.centerId = centerId;
        const d = await getAipParticipation(params);
        if (alive) setData(d);
      } catch {
        if (alive) setError("Could not load participation data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [periodVal, centerId]);

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

  const months = data?.months ?? [];
  const chartData = months.map((m) => {
    const point: Record<string, string | number> = { month: m.month };
    for (const b of BAND_ORDER) {
      point[b] = m.cells[b].count;
      point[`topic_${b}`] = m.cells[b].topic;
    }
    return point;
  });

  const tabCls = (active: boolean) =>
    `px-3 py-1 text-xs font-bold ${active ? "bg-primary text-white" : "bg-white text-neutral-500"}`;

  return (
    <Card className="border-none shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-bold text-neutral-900">Holistic Development Participation</h3>
          <p className="text-[11px] text-neutral-400 font-medium mt-1">
            Students who attended the AIP Endline &middot; topic wise (12 topics), by standard
          </p>
        </div>
        <div className="inline-flex rounded-lg overflow-hidden border border-neutral-200 shrink-0">
          <button type="button" className={tabCls(view === "graph")} onClick={() => setView("graph")}>Graph</button>
          <button type="button" className={tabCls(view === "table")} onClick={() => setView("table")}>Table</button>
        </div>
      </div>

      {view === "graph" ? (
        <div style={{ width: "100%", height: 320 }} className="mt-3">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} barGap={2} barCategoryGap={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={32} />
              <RTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as Record<string, string | number>;
                  return (
                    <div className="rounded-lg border border-neutral-200 bg-white p-2 shadow text-xs max-w-[260px]">
                      <p className="font-bold text-neutral-700 mb-1">{label}</p>
                      {BAND_ORDER.map((b) => (
                        <p key={b} className="mb-0.5">
                          <span className="font-bold" style={{ color: BAND_COLOR[b] }}>{BAND_LABEL[b]}: {p[b]}</span>
                          <span className="text-neutral-500"> &middot; {p[`topic_${b}`]}</span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              {BAND_ORDER.map((b) => (
                <Bar key={b} dataKey={b} name={BAND_LABEL[b]} fill={BAND_COLOR[b]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-neutral-400 uppercase tracking-wider text-[10px]">
                <th className="py-2 pr-3">Month</th>
                {BAND_ORDER.map((b) => (
                  <th key={b} className="py-2 pr-3" style={{ color: BAND_COLOR[b] }}>{BAND_LABEL[b]} (topic &middot; students)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-t border-neutral-100">
                  <td className="py-2 pr-3 font-bold text-neutral-700">{m.month}</td>
                  {BAND_ORDER.map((b) => (
                    <td key={b} className="py-2 pr-3 text-neutral-700">
                      {m.cells[b].topic} &middot; <span className="font-bold" style={{ color: BAND_COLOR[b] }}>{m.cells[b].count}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
        {BAND_ORDER.map((b) => (
          <div key={b} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BAND_COLOR[b] }} />
            <span className="text-[11px] font-bold text-neutral-500">{BAND_LABEL[b]}</span>
          </div>
        ))}
      </div>

      {data && data.unmatched.length > 0 && (
        <p className="text-[11px] text-neutral-400 font-medium mt-3">
          Not matched to any topic: {data.unmatched.map((u) => `${u.name} - ${u.count}`).join(", ")}
        </p>
      )}
    </Card>
  );
};
