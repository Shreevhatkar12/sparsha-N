import React, { useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../store/useAuthStore';
import { GraduationCap, MonitorSmartphone } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Legend,
} from 'recharts';
import { listCenters } from '../services/centers.service';
import {
  listDigitalStudents,
  listDigitalExams,
  type DigitalListResponse,
  type DLExam,
} from '../services/digital.service';
import type { CenterSummary } from '../types';

const AXIS_INK = '#6b7280';
const GRID_INK = '#eef1f4';
const CHART_MARGIN = { top: 12, right: 16, bottom: 28, left: 8 };
const hideZero = (v: unknown) => (Number(v) > 0 ? String(v) : '');
const C_IN = '#008300';
const C_OUT = '#2a78d6';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Digital Literacy teacher's self dashboard — batch / year / month filters,
// in-out center counts, gender split, batch & month-wise charts.
export const DigitalDashboard: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [data, setData] = useState<DigitalListResponse | null>(null);
  const [exams, setExams] = useState<DLExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<CenterSummary[]>([]);

  // filters
  const [batchFilter, setBatchFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  useEffect(() => {
    listDigitalStudents()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
    listDigitalExams()
      .then((r) => setExams(r.exams))
      .catch(console.error);
    listCenters()
      .then((res) => setCenters(Array.isArray(res) ? res : []))
      .catch(() => setCenters([]));
  }, []);

  const myCenters = useMemo(() => {
    const ids = currentUser?.centerIds ?? [];
    if (!ids.length) return '';
    return centers
      .filter((c) => ids.includes(c.id))
      .map((c) => c.name)
      .join(', ');
  }, [centers, currentUser]);

  const rows = data?.students ?? [];
  const batches = data?.batches ?? [];

  const yearOptions = useMemo(() => {
    const ys = new Set<string>();
    for (const r of rows) {
      if (r.createdAt) ys.add(String(new Date(r.createdAt).getFullYear()));
    }
    return Array.from(ys).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (batchFilter && (r.batch || '') !== batchFilter) return false;
      if (!r.createdAt) return !yearFilter && !monthFilter;
      const d = new Date(r.createdAt);
      if (yearFilter && String(d.getFullYear()) !== yearFilter) return false;
      if (monthFilter && String(d.getMonth()) !== monthFilter) return false;
      return true;
    });
  }, [rows, batchFilter, yearFilter, monthFilter]);

  const stats = useMemo(() => {
    let inC = 0, outC = 0, male = 0, female = 0;
    const byBatch = new Map<string, { In: number; Out: number }>();
    const byMonth = new Map<string, number>();
    for (const r of filtered) {
      if (r.kind === 'in') inC++;
      else outC++;
      if (r.gender === 'male') male++;
      else if (r.gender === 'female') female++;
      const b = r.batch || '—';
      const cur = byBatch.get(b) ?? { In: 0, Out: 0 };
      if (r.kind === 'in') cur.In++;
      else cur.Out++;
      byBatch.set(b, cur);
      if (r.createdAt) {
        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
      }
    }
    const batchData = Array.from(byBatch.entries())
      .map(([name, v]) => ({ name, 'In Center': v.In, 'Out Center': v.Out }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const monthData = Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [y, m] = key.split('-');
        return { name: `${MONTHS[Number(m) - 1].slice(0, 3)} ${y}`, count };
      });
    return { total: filtered.length, inC, outC, male, female, batchData, monthData };
  }, [filtered]);

  // Exam-wise average % (date order) — growth over exams, same filters applied.
  const examGrowth = useMemo(() => {
    const list = exams
      .filter((e) => !batchFilter || e.batch === batchFilter)
      .filter((e) => {
        if (!e.date) return !yearFilter && !monthFilter;
        const d = new Date(e.date);
        if (yearFilter && String(d.getFullYear()) !== yearFilter) return false;
        if (monthFilter && String(d.getMonth()) !== monthFilter) return false;
        return true;
      })
      .slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return list.map((e) => {
      const entries = Object.values(e.marks || {});
      const scored = entries.filter((m) => !m.absent && m.score != null);
      const avg =
        scored.length && e.totalMarks > 0
          ? Math.round(
              scored.reduce((a, m) => a + ((m.score ?? 0) / e.totalMarks) * 100, 0) / scored.length,
            )
          : 0;
      return { name: e.name, 'Average %': avg };
    });
  }, [exams, batchFilter, yearFilter, monthFilter]);

  const axisLabelX = (text: string) => ({
    value: text,
    position: 'insideBottom' as const,
    offset: -4,
    fontSize: 12,
    fill: AXIS_INK,
  });
  const axisLabelY = (text: string) => ({
    value: text,
    angle: -90,
    position: 'insideLeft' as const,
    fontSize: 12,
    fill: AXIS_INK,
  });

  const tile = (label: string, value: React.ReactNode, color?: string) => (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-center">
      <div className="text-2xl font-black" style={{ color: color || '#111827' }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  );

  const selectCls =
    'h-10 rounded-lg border border-neutral-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500';

  const chipCls = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
      active
        ? 'bg-brand-500 text-white border-brand-500'
        : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
    }`;

  return (
    <PageWrapper title="Digital Literacy — Dashboard">
      {loading && !data ? (
        <LoadingSpinner />
      ) : (
        <div className="flex flex-col gap-6">
          {/* teacher header card */}
          <Card className="border-none shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <img
                src="/sparsha-logo.png"
                alt="Sparsha logo"
                draggable={false}
                className="h-14 w-14 rounded-full shadow-sm select-none"
              />
              <div className="min-w-0">
                <h2 className="text-xl font-black text-neutral-900 truncate">
                  {currentUser?.name || currentUser?.email || 'Teacher'}
                </h2>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    <MonitorSmartphone size={12} /> DIGITAL LITERACY TEACHER
                  </span>
                  {myCenters && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100">
                      <GraduationCap size={12} /> {myCenters}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* filters */}
          <Card className="border-none shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase">Filters:</span>
              <select className={selectCls} value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); if (!e.target.value) setMonthFilter(''); }}>
                <option value="">All Years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select className={selectCls} value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                <option value="">All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i)}>{m}</option>
                ))}
              </select>
              <span className="text-neutral-300">|</span>
              <button type="button" onClick={() => setBatchFilter('')} className={chipCls(batchFilter === '')}>
                All Batches
              </button>
              {batches.map((b) => (
                <button key={b} type="button" onClick={() => setBatchFilter(batchFilter === b ? '' : b)} className={chipCls(batchFilter === b)}>
                  {b}
                </button>
              ))}
            </div>
          </Card>

          {/* tiles */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {tile('Total Students', stats.total)}
            {tile('In Center', stats.inC, C_IN)}
            {tile('Out Center', stats.outC, C_OUT)}
            {tile('Male', stats.male, '#2a78d6')}
            {tile('Female', stats.female, '#e87ba4')}
          </div>

          {/* batch-wise chart */}
          <Card className="border-none shadow-sm">
            <h3 className="font-bold text-neutral-900 mb-1">Students by Batch</h3>
            <p className="text-xs text-neutral-500 mb-3">Batch-wise in-center / out-center student count</p>
            {stats.batchData.length === 0 ? (
              <EmptyState title="No students yet" description="Add your first student from the Students section." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.batchData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS_INK }} label={axisLabelX('Batch')} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_INK }} label={axisLabelY('Students')} />
                  <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: '#f6f8fa' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="In Center" fill={C_IN} radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="In Center" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                  </Bar>
                  <Bar dataKey="Out Center" fill={C_OUT} radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="Out Center" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* month-wise chart */}
          <Card className="border-none shadow-sm">
            <h3 className="font-bold text-neutral-900 mb-1">Admissions by Month</h3>
            <p className="text-xs text-neutral-500 mb-3">Month-wise student add count (growth)</p>
            {stats.monthData.length === 0 ? (
              <EmptyState title="No data yet" description="Month-wise growth will appear here once students are added." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.monthData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS_INK }} label={axisLabelX('Month')} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_INK }} label={axisLabelY('Students')} />
                  <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: '#f6f8fa' }} />
                  <Bar dataKey="count" fill="#4a3aa7" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="count" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* exam growth */}
          <Card className="border-none shadow-sm">
            <h3 className="font-bold text-neutral-900 mb-1">Exam Growth — Average % per Exam</h3>
            <p className="text-xs text-neutral-500 mb-3">
              Class average % of every exam in date order — see how much growth happened ({exams.length} exams)
            </p>
            {examGrowth.length === 0 ? (
              <EmptyState
                title="No exam data yet"
                description="Create exams and enter marks in Digital Exams — growth will appear here."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={examGrowth} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS_INK }} label={axisLabelX('Exam (date order)')} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: AXIS_INK }} label={axisLabelY('Average %')} />
                  <Tooltip formatter={(v) => `${v ?? 0}%`} cursor={{ fill: '#f6f8fa' }} />
                  <Bar dataKey="Average %" fill="#eb6834" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList
                      dataKey="Average %"
                      position="top"
                      fontSize={12}
                      fill={AXIS_INK}
                      formatter={(v: unknown) => (Number(v) > 0 ? `${v}%` : '')}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}
    </PageWrapper>
  );
};

export default DigitalDashboard;
