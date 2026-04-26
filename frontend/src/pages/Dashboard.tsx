import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Users, BookOpen, Star, AlertCircle, PlusCircle, Trash2 } from 'lucide-react';
import { getDashboardPending, getReportsDashboard, type DashboardPendingCounts } from '../services/reports.service';

export const Dashboard: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const navigate = useNavigate();

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [pendingDetail, setPendingDetail] = useState<DashboardPendingCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Center State
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [centerName, setCenterName] = useState('');
  const [centerLocation, setCenterLocation] = useState('');
  const [addingCenter, setAddingCenter] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, p] = await Promise.all([getReportsDashboard(), getDashboardPending()]);
      setData(d);
      setPendingDetail(p);
    } catch {
      setError('Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const handleAddCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCenter(true);
    try {
      const m = await import('../services/centers.service');
      await m.createCenter({ name: centerName, location: centerLocation });
      setShowCenterModal(false);
      setCenterName('');
      setCenterLocation('');
      void fetchDashboardData();
    } catch (err) {
      alert('Failed to add center. Please check your permissions.');
    } finally {
      setAddingCenter(false);
    }
  };

  const pending = (data?.pendingItems as Record<string, number> | undefined) ?? {};

  return (
    <PageWrapper
      title="Dashboard Overview"
      actions={
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="secondary" size="sm" className="hidden sm:flex" onClick={() => setShowCenterModal(true)}>
              <PlusCircle size={16} className="mr-2" />
              Add Center
            </Button>
          )}
          <Button variant="primary" size="sm" className="hidden sm:flex" onClick={() => navigate('/students/new')}>
            <PlusCircle size={16} className="mr-2" />
            Add Student
          </Button>
        </div>
      }
    >
      {showCenterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <Card className="w-full max-w-md bg-white p-6 shadow-xl relative z-50">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Add New Center</h3>
            <form onSubmit={handleAddCenter} className="flex flex-col gap-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium mb-1 block">Center Name</label>
                <input
                  className="w-full h-11 rounded-lg border border-neutral-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium mb-1 block">Location</label>
                <input
                  className="w-full h-11 rounded-lg border border-neutral-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={centerLocation}
                  onChange={(e) => setCenterLocation(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="ghost" type="button" onClick={() => setShowCenterModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" isLoading={addingCenter}>Save Center</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
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
                  <li key={String(c.centerId)} className="flex items-center justify-between border-b border-neutral-100 py-2">
                    <span>{String(c.name)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-500">
                        {String(c.studentCount)} students · {String(c.attendanceRate)}% att.
                      </span>
                      <button
                        title="Remove Center"
                        className="text-danger hover:text-red-700 transition-colors p-1"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete ${String(c.name)}? This action cannot be undone and will fail if there are active students in the center.`)) {
                            try {
                              const m = await import('../services/centers.service');
                              await m.deleteCenter(String(c.centerId));
                              void fetchDashboardData();
                            } catch (err: any) {
                              alert(err.response?.data?.message || 'Failed to delete center.');
                            }
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </PageWrapper>
  );
};

