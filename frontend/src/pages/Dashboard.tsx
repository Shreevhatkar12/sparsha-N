import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Users, BookOpen, Star, AlertCircle, PlusCircle } from 'lucide-react';
import { getDashboardPending, getReportsDashboard, type DashboardPendingCounts } from '../services/reports.service';

export const Dashboard: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const navigate = useNavigate();

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [pendingDetail, setPendingDetail] = useState<DashboardPendingCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [d, p] = await Promise.all([getReportsDashboard(), getDashboardPending()]);
        if (alive) {
          setData(d);
          setPendingDetail(p);
        }
      } catch {
        if (alive) setError('Failed to load dashboard.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pending = (data?.pendingItems as Record<string, number> | undefined) ?? {};

  if (loading) {
    return (
      <PageWrapper title="Dashboard">
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Dashboard">
        <ErrorMessage message={error} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Dashboard Overview"
      actions={
        <Button variant="primary" size="sm" className="hidden sm:flex" onClick={() => navigate('/students/new')}>
          <PlusCircle size={16} className="mr-2" />
          Add Student
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-primary">
              <Users size={20} />
            </div>
            <span className="text-neutral-500 font-medium text-sm">Total Students</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{Number(data?.totalStudents ?? 0)}</p>
        </Card>
        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <BookOpen size={20} />
            </div>
            <span className="text-neutral-500 font-medium text-sm">Centers</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{Number(data?.totalCenters ?? 0)}</p>
        </Card>
        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg text-success">
              <AlertCircle size={20} />
            </div>
            <span className="text-neutral-500 font-medium text-sm">Attendance (30d)</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{Number(data?.overallAttendanceRate ?? 0)}%</p>
        </Card>
        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg text-warning">
              <Star size={20} />
            </div>
            <span className="text-neutral-500 font-medium text-sm">Pending items</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900">
            {(pending.incompleteSessions ?? 0) +
              (pending.missingExamScores ?? 0) +
              (pending.pendingFormSubmissions ?? 0)}
          </p>
        </Card>
      </div>

      {pendingDetail && (
        <Card className="mb-6 border-brand-100 bg-brand-50/40">
          <h3 className="font-semibold text-neutral-900 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Pending tasks
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <button
              type="button"
              className="text-left rounded-lg border border-neutral-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
              onClick={() => navigate('/attendance')}
            >
              <p className="text-neutral-500 text-xs uppercase tracking-wide">Attendance (7d)</p>
              <p className="text-2xl font-bold text-brand-800">{pendingDetail.missingAttendance}</p>
              <p className="text-neutral-600 mt-1">Sessions with incomplete rolls</p>
            </button>
            <button
              type="button"
              className="text-left rounded-lg border border-neutral-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
              onClick={() => navigate('/exams')}
            >
              <p className="text-neutral-500 text-xs uppercase tracking-wide">Exams</p>
              <p className="text-2xl font-bold text-brand-800">{pendingDetail.incompleteExams}</p>
              <p className="text-neutral-600 mt-1">Exams missing scores</p>
            </button>
            <button
              type="button"
              className="text-left rounded-lg border border-neutral-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
              onClick={() => navigate('/forms')}
            >
              <p className="text-neutral-500 text-xs uppercase tracking-wide">Forms</p>
              <p className="text-2xl font-bold text-brand-800">{pendingDetail.pendingForms}</p>
              <p className="text-neutral-600 mt-1">Template gaps by center</p>
            </button>
          </div>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <h3 className="font-semibold text-neutral-900 mb-4">Center breakdown</h3>
          <ul className="space-y-2 text-sm">
            {((data?.centerBreakdown as Array<Record<string, unknown>>) ?? []).map((c) => (
              <li key={String(c.centerId)} className="flex justify-between border-b border-neutral-100 py-2">
                <span>{String(c.name)}</span>
                <span className="text-neutral-500">
                  {String(c.studentCount)} students · {String(c.attendanceRate)}% att.
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PageWrapper>
  );
};
