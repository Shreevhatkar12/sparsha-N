import React, { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuthStore } from '../store/useAuthStore';
import { HeartPulse, Stethoscope, CalendarDays } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getSehatDashboard, type SehatDashboardData } from '../services/sehat.service';

const AXIS_INK = '#6b7280';
const GRID_INK = '#eef1f4';
const CHART_MARGIN = { top: 12, right: 16, bottom: 28, left: 8 };

export const SehatDashboard: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [data, setData] = useState<SehatDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getSehatDashboard();
        if (alive) setData(res);
      } catch {
        if (alive) setError('Failed to load the Sehat dashboard.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '');

  if (loading)
    return (
      <PageWrapper title="Sehat — Dashboard">
        <LoadingSpinner />
      </PageWrapper>
    );

  return (
    <PageWrapper title="Sehat — Dashboard">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Header card */}
      <Card className="mb-6 !p-5 bg-gradient-to-r from-brand-50/70 to-white">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
            <HeartPulse size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              {currentUser?.name || currentUser?.email || 'Sehat Coordinator'}
            </h2>
            <p className="text-xs text-neutral-500">
              Sehat (Health) Program — health camps for students & parents
            </p>
          </div>
        </div>
      </Card>

      {/* Count tiles */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total Health Camps', value: data.counts.totalCamps, cls: 'text-brand-700' },
            { label: 'Student Camps', value: data.counts.studentCamps, cls: 'text-blue-700' },
            { label: 'Students Participated', value: data.counts.studentsParticipated, cls: 'text-blue-700' },
            { label: 'Parent Camps', value: data.counts.parentCamps, cls: 'text-purple-700' },
            { label: 'Parents Participated', value: data.counts.parentsParticipated, cls: 'text-purple-700' },
          ].map((t) => (
            <div key={t.label} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${t.cls}`}>{t.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500 mt-1">{t.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Camps by type chart */}
      <Card className="mb-6">
        <h3 className="text-base font-semibold text-neutral-900 mb-1 flex items-center gap-2">
          <Stethoscope size={18} className="text-brand-600" /> Camps & Participation by Type
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          How many camps of each type were held, and how many people participated.
        </p>
        {!data || data.byType.length === 0 ? (
          <EmptyState title="No camps yet" description="Create your first health camp to see the chart." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byType} margin={CHART_MARGIN}>
                <CartesianGrid stroke={GRID_INK} vertical={false} />
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 11, fill: AXIS_INK }}
                  interval={0}
                  label={axisLabelX('Camp type')}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: AXIS_INK }}
                  label={axisLabelY('Count')}
                />
                <Tooltip />
                <Legend verticalAlign="top" height={28} />
                <Bar dataKey="camps" name="Camps" fill="#c2410c" radius={[4, 4, 0, 0]} maxBarSize={42} />
                <Bar dataKey="participated" name="Participated" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Recent camps */}
      <Card>
        <h3 className="text-base font-semibold text-neutral-900 mb-3 flex items-center gap-2">
          <CalendarDays size={18} className="text-brand-600" /> Recent Health Camps
        </h3>
        {!data || data.recent.length === 0 ? (
          <EmptyState title="Nothing yet" description="Recent camps will appear here." />
        ) : (
          <div className="space-y-2">
            {data.recent.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap justify-between items-center gap-2 p-3 rounded-lg border border-neutral-100 bg-neutral-50/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-neutral-900 truncate">{c.campType}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                      c.audience === 'parent'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {c.audience === 'parent' ? 'Parents' : 'Students'}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 flex items-center gap-3">
                  <span>{c.hospital}</span>
                  <span>{fmtDate(c.date)}</span>
                  <span className="font-semibold text-success-600">{c.participated} participated</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
};
