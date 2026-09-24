import React, { useState } from "react";
import { Card } from "../ui/Card";

// ----------------------------------------------------------------------
// AIP (Annual Implementation Plan) topic calendar — a static reference,
// not exam data. One ring per std band, one segment per month (academic
// year: June -> May). Source: the official AIP topic sheet.
// ----------------------------------------------------------------------

const MONTHS = [
  "June", "July", "August", "September", "October", "November",
  "December", "January", "February", "March", "April", "May",
];

type BandKey = "1-4" | "5-7" | "8-10";

const BANDS: Array<{ key: BandKey; label: string; color: string }> = [
  { key: "1-4", label: "1st - 4th", color: "#3b82f6" },
  { key: "5-7", label: "5th - 7th", color: "#ec4899" },
  { key: "8-10", label: "8th - 10th", color: "#10b981" },
];

const TOPICS: Record<BandKey, string[]> = {
  "1-4": [
    "National Symbol", "Cleanliness and Hygiene", "Community Helpers",
    "Animal and Birds Around Us", "Amazing Science Around Us", "Be Kind, Be Confident",
    "Digital Devices Around Us", "Save Water, Save Earth", "My School, My City and India",
    "Money Matters (Coins and Notes)", "Road Safety Rules", "Solar System",
  ],
  "5-7": [
    "Personality Development", "Artificial Intelligence (AI)", "States and Capital",
    "Foreign Currency and World Money", "Amazing Facts Around the World", "Digital Payment and Online Safety - Banking",
    "Parts of Robot and Their Function", "Career Guidance - How to Achieve Goals", "Importance of Voting and Democracy",
    "Disaster Management", "Entrepreneurship and Small Business Idea", "Types of Communication",
  ],
  "8-10": [
    "Current Affairs", "Indian History", "Geography of India and the World",
    "Science and Technology", "Environment and Climate Changes", "Indian Constitution and Civics",
    "Famous Personalities", "Sports and Awards", "Space and Discoveries",
    "Digital Literacy and Cyber Safety", "Basic Economics and Banking", "Cultural Heritage of India",
  ],
};

// Generous canvas so month labels never clip against the edge.
const SIZE = 460;
const CENTER = SIZE / 2;
const RING_GAP = 3;
const RINGS: Record<BandKey, { inner: number; outer: number }> = {
  "1-4": { inner: 64, outer: 104 },
  "5-7": { inner: 107, outer: 147 },
  "8-10": { inner: 150, outer: 190 },
};
const LABEL_RADIUS = RINGS["8-10"].outer + 24; // 214, well inside the 230 half-width

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function ringSegmentPath(inner: number, outer: number, startAngle: number, endAngle: number) {
  const a = startAngle + 0.6;
  const b = endAngle - 0.6;
  const p1 = polarToCartesian(CENTER, CENTER, outer, a);
  const p2 = polarToCartesian(CENTER, CENTER, outer, b);
  const p3 = polarToCartesian(CENTER, CENTER, inner, b);
  const p4 = polarToCartesian(CENTER, CENTER, inner, a);
  const largeArc = b - a <= 180 ? 0 : 1;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

// Keep text anchored so it grows away from the circle instead of getting
// centered over the boundary (which is what clipped "Sep" -> "Se" etc.)
function anchorForAngle(angleDeg: number): "start" | "middle" | "end" {
  const a = ((angleDeg % 360) + 360) % 360;
  if (a > 100 && a < 260) return "end";
  if (a < 80 || a > 280) return "start";
  return "middle";
}

export const AipTopicWheel: React.FC = () => {
  const [active, setActive] = useState<{ month: string; band: BandKey; topic: string } | null>(null);
  const [view, setView] = useState<"graph" | "table">("graph");

  const segAngle = 360 / 12;

  return (
    <Card className="border-none shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-bold text-neutral-900">AIP Topic Calendar</h3>
          <p className="text-[11px] text-neutral-400 font-medium">
            Annual Implementation Plan — monthly topics by standard
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-semibold shrink-0">
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

      {view === "graph" ? (
        <div className="flex flex-col items-center gap-4 mt-3">
          <div className="relative w-full flex justify-center">
            <svg width="100%" height="auto" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: 460, overflow: "visible" }}>
              {BANDS.map((band) =>
                MONTHS.map((month, i) => {
                  const startAngle = i * segAngle;
                  const endAngle = startAngle + segAngle;
                  const isActive = active?.band === band.key && active?.month === month;
                  return (
                    <path
                      key={`${band.key}-${month}`}
                      d={ringSegmentPath(RINGS[band.key].inner + RING_GAP, RINGS[band.key].outer, startAngle, endAngle)}
                      fill={band.color}
                      opacity={isActive ? 1 : 0.72}
                      stroke="#fff"
                      strokeWidth={isActive ? 2 : 1}
                      style={{ cursor: "pointer", transition: "opacity 120ms" }}
                      onMouseEnter={() => setActive({ month, band: band.key, topic: TOPICS[band.key][i] })}
                      onClick={() => setActive({ month, band: band.key, topic: TOPICS[band.key][i] })}
                    />
                  );
                })
              )}
              {/* Month labels — anchored away from the ring so they never get clipped */}
              {MONTHS.map((month, i) => {
                const mid = i * segAngle + segAngle / 2;
                const pos = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, mid);
                return (
                  <text
                    key={month}
                    x={pos.x}
                    y={pos.y}
                    textAnchor={anchorForAngle(mid)}
                    dominantBaseline="middle"
                    fontSize={13}
                    fontWeight={700}
                    fill="#4b5563"
                  >
                    {month}
                  </text>
                );
              })}
              <circle cx={CENTER} cy={CENTER} r={RINGS["1-4"].inner - 6} fill="#f9fafb" />
              <text x={CENTER} y={CENTER - 8} textAnchor="middle" fontSize={15} fontWeight={800} fill="#111827">
                AIP
              </text>
              <text x={CENTER} y={CENTER + 12} textAnchor="middle" fontSize={11} fontWeight={600} fill="#9ca3af">
                Topics
              </text>
            </svg>
          </div>

          <div className="flex items-center gap-4">
            {BANDS.map((b) => (
              <div key={b.key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-[11px] font-bold text-neutral-500">{b.label}</span>
              </div>
            ))}
          </div>

          <div className="w-full min-h-[48px] rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-center">
            {active ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {active.month} &middot; {BANDS.find((b) => b.key === active.band)?.label}
                </p>
                <p className="text-sm font-bold text-neutral-800 mt-0.5">{active.topic}</p>
              </>
            ) : (
              <p className="text-[11px] text-neutral-400 font-medium">Hover or tap a segment to see that month's topic</p>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 font-bold text-neutral-500 bg-neutral-50 sticky left-0">Std Wise AIP</th>
                {MONTHS.map((m) => (
                  <th key={m} className="text-left py-2 px-3 font-bold text-neutral-500 whitespace-nowrap">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BANDS.map((band) => (
                <tr key={band.key} className="border-t border-neutral-100">
                  <td className="py-2 pr-3 font-bold whitespace-nowrap bg-neutral-50 sticky left-0" style={{ color: band.color }}>
                    {band.label}
                  </td>
                  {TOPICS[band.key].map((topic, i) => (
                    <td key={MONTHS[i]} className="py-2 px-3 text-neutral-700 whitespace-nowrap">
                      {topic}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
