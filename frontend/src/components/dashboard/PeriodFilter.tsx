import React from "react";

export interface PeriodValue {
  period: "month" | "year";
  month: string; // "YYYY-MM"
  year: string; // "YYYY"
}

// Default = current month (primary view is month-wise).
export const defaultPeriod = (): PeriodValue => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return { period: "month", month: `${y}-${m}`, year: String(y) };
};

export const periodParams = (v: PeriodValue): Record<string, string> =>
  v.period === "year" ? { period: "year", year: v.year } : { period: "month", month: v.month };

export const PeriodFilter: React.FC<{
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
}> = ({ value, onChange }) => {
  const cy = Number(value.year) || new Date().getFullYear();
  const years: string[] = [];
  for (let y = cy + 1; y >= cy - 5; y--) years.push(String(y));

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-semibold">
        {(["month", "year"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ ...value, period: p })}
            className={
              "px-3 py-1.5 capitalize " +
              (value.period === p ? "bg-brand-500 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50")
            }
          >
            {p}
          </button>
        ))}
      </div>
      {value.period === "month" ? (
        <input
          type="month"
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
          className="h-9 rounded-lg border border-neutral-300 px-2 text-sm bg-white"
        />
      ) : (
        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
          className="h-9 rounded-lg border border-neutral-300 px-2 text-sm bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default PeriodFilter;
