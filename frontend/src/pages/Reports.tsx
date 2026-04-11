import React, { useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import {
  getReportsDashboard,
  getReportsAttendance,
  getReportsExams,
  getReportsSkills,
} from '../services/reports.service';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899'];

export const Reports: React.FC = () => {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [att, setAtt] = useState<Record<string, unknown> | null>(null);
  const [ex, setEx] = useState<Record<string, unknown> | null>(null);
  const [skills, setSkills] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const iso = (d: Date) => d.toISOString().split('T')[0];
    return { from: iso(from), to: iso(to) };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      const year = String(new Date().getFullYear());
      try {
        const [d, a, e, s] = await Promise.allSettled([
          getReportsDashboard(),
          getReportsAttendance({ from: range.from, to: range.to }),
          getReportsExams({ academicYear: year }),
          getReportsSkills(),
        ]);
        if (!alive) return;
        if (d.status === 'fulfilled') setDash(d.value as Record<string, unknown>);
        if (a.status === 'fulfilled') setAtt(a.value as Record<string, unknown>);
        if (e.status === 'fulfilled') setEx(e.value as Record<string, unknown>);
        if (s.status === 'fulfilled') setSkills(s.value as Record<string, unknown>);
        if (d.status === 'rejected' && a.status === 'rejected') {
          setError('Some report endpoints failed. Check permissions and query parameters.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [range.from, range.to]);

  const programData = ((dash?.programBreakdown as Array<{ name?: string; studentCount?: number }>) ?? []).map(
    (p) => ({
      name: p.name ?? 'Program',
      value: p.studentCount ?? 0,
    }),
  );

  const centerAtt = ((dash?.centerBreakdown as Array<{ name?: string; attendanceRate?: number }>) ?? []).map(
    (c) => ({
      name: c.name ?? 'Center',
      attendance: c.attendanceRate ?? 0,
    }),
  );

  if (loading) {
    return (
      <PageWrapper title="Analytics & Reports">
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Analytics & Reports">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="min-h-[320px]">
          <h2 className="text-lg font-semibold mb-2">Program distribution (dashboard)</h2>
          {programData.length === 0 ? (
            <p className="text-sm text-neutral-500">No data.</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={programData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label
                  >
                    {programData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v ?? 0} students`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="min-h-[320px]">
          <h2 className="text-lg font-semibold mb-2">Center attendance % (dashboard)</h2>
          {centerAtt.length === 0 ? (
            <p className="text-sm text-neutral-500">No data.</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={centerAtt} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => `${v ?? 0}%`} />
                  <Bar dataKey="attendance" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-2">Attendance analytics API</h2>
          <pre className="text-xs overflow-auto max-h-64 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
            {JSON.stringify(att, null, 2)}
          </pre>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold mb-2">Exam analytics API</h2>
          <pre className="text-xs overflow-auto max-h-64 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
            {JSON.stringify(ex, null, 2)}
          </pre>
        </Card>
        <Card className="md:col-span-2">
          <h2 className="text-lg font-semibold mb-2">Skills report API</h2>
          <pre className="text-xs overflow-auto max-h-64 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
            {JSON.stringify(skills, null, 2)}
          </pre>
        </Card>
      </div>
    </PageWrapper>
  );
};
