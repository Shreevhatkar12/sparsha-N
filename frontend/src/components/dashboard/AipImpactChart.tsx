import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import { Card } from "../ui/Card";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ErrorMessage } from "../ui/ErrorMessage";
import { getAipImpact, type AipImpactData, type AipImpactCell } from "../../services/reports.service";
import { periodParams, type PeriodValue } from "./PeriodFilter";

type BandKey = "1-4" | "5-7" | "8-10";
const BAND_ORDER: BandKey[] = ["1-4", "5-7", "8-10"];
const BAND_LABEL: Record<BandKey, string> = { "1-4": "1st - 4th", "5-7": "5th - 7th", "8-10": "8th - 10th" };
const BAND_COLOR: Record<BandKey, string> = { "1-4": "#3b82f6", "5-7": "#ec4899", "8-10": "#10b981" };

type Selected = { monthLabel: string; band: BandKey; examType: "Baseline" | "Endline"; cell: AipImpactCell };

export const AipImpactChart: React.FC<{ periodVal: PeriodValue; centerId?: string }> = ({ periodVal, centerId }) => {
  const [data, setData] = useState<AipImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | undefined> = { ...periodParams(periodVal) };
        if (centerId) params.centerId = centerId;
        const d = await getAipImpact(params);
        if (alive) setData(d);
      } catch {
        if (alive) setError("Could not load AIP impact data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [periodVal, centerId]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.rows.map((row) => {
      const point: Record<string, string | number> = { month: row.label, monthKey: row.monthKey };
      for (const b of BAND_ORDER) {
        point[`base_${b}`] = row.baseline[b].percent;
        point[`end_${b}`] = row.endline[b].percent;
      }
      return point;
    });
  }, [data]);

  const rawByMonth = useMemo(() => {
    const map = new Map<string, AipImpactData["rows"][number]>();
    (data?.rows ?? []).forEach((r) => map.set(r.monthKey, r));
    return map;
  }, [data]);

  const handleBarClick = (examType: "Baseline" | "Endline", band: BandKey) => (point: any) => {
    const monthKey = point?.monthKey;
    const row = monthKey ? rawByMonth.get(monthKey) : null;
    if (!row) return;
    const cell = examType === "Baseline" ? row.baseline[band] : row.endline[band];
    setSelected({ monthLabel: row.label, band, examType, cell });
  };

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

  return (
    <Card className="border-none shadow-sm">
      <h3 className="font-bold text-neutral-900 mb-1">Holistic Dev Impact Graph</h3>
      <p className="text-[11px] text-neutral-400 font-medium mb-4">
        (AIP = Annual Implementation Planning) &middot; Baseline vs Endline, by standard, month wise
        <br />
        Showing: <span className="font-bold text-neutral-500">
          {periodVal.period === "year" ? periodVal.year : new Date(`${periodVal.month}-01`).toLocaleString("en-US", { month: "long", year: "numeric" })}
        </span>
      </p>

      {chartData.length === 0 ? (
        <p className="text-sm text-neutral-400 font-medium py-10 text-center">
          No AIP Baseline / Endline exam data yet.
        </p>
      ) : (
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} barGap={2} barCategoryGap={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <RTooltip
                formatter={(value: any, name: any) => [`${value}%`, String(name ?? "")]}
                labelFormatter={(label) => label}
              />
              {BAND_ORDER.map((b) => (
                <Bar
                  key={`base_${b}`}
                  dataKey={`base_${b}`}
                  name={`Baseline · ${BAND_LABEL[b]}`}
                  fill={BAND_COLOR[b]}
                  radius={[3, 3, 0, 0]}
                  onClick={handleBarClick("Baseline", b)}
                  style={{ cursor: "pointer" }}
                />
              ))}
              {BAND_ORDER.map((b) => (
                <Bar
                  key={`end_${b}`}
                  dataKey={`end_${b}`}
                  name={`Endline · ${BAND_LABEL[b]}`}
                  fill={BAND_COLOR[b]}
                  fillOpacity={0.45}
                  radius={[3, 3, 0, 0]}
                  onClick={handleBarClick("Endline", b)}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
        {BAND_ORDER.map((b) => (
          <div key={b} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BAND_COLOR[b] }} />
            <span className="text-[11px] font-bold text-neutral-500">{BAND_LABEL[b]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-neutral-200">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
          <span className="text-[11px] font-bold text-neutral-500">Solid = Baseline, Light = Endline</span>
        </div>
      </div>

      <div className="w-full min-h-[56px] rounded-xl border border-neutral-100 bg-neutral-50 p-3 mt-3">
        {selected ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {selected.monthLabel} &middot; {BAND_LABEL[selected.band]} &middot; AIP {selected.examType}
            </p>
            <p className="text-sm font-bold text-neutral-800 mt-1">
              {selected.cell.studentCount} students attended &middot; {selected.cell.totalObtained} / {selected.cell.totalMax} marks &middot;{" "}
              <span style={{ color: BAND_COLOR[selected.band] }}>{selected.cell.percent}%</span>
            </p>
          </>
        ) : (
          <p className="text-[11px] text-neutral-400 font-medium text-center">Tap a bar to see that group's count, marks and %</p>
        )}
      </div>
    </Card>
  );
};
