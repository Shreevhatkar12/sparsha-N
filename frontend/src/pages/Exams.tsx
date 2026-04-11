import React, { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import { listExams, getExamComparison, type ListExamsQuery } from '../services/exams.service';
import { useAuthStore } from '../store/useAuthStore';

type ExamRow = Record<string, unknown>;

export const Exams: React.FC = () => {
  const selectedCenterId = useAuthStore((s) => s.selectedCenterId);
  const isAdmin = useAuthStore((s) => s.currentUser?.role === 'admin');

  const [exams, setExams] = useState<ExamRow[]>([]);
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ListExamsQuery = {
        academicYear,
        ...(!isAdmin && selectedCenterId ? { centerId: selectedCenterId } : {}),
      };
      const res = (await listExams(params)) as { exams?: ExamRow[] };
      setExams(res.exams ?? []);
    } catch {
      setError('Failed to load exams.');
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when year / scope changes
  }, [academicYear, selectedCenterId, isAdmin]);

  const loadComparison = async () => {
    setError(null);
    try {
      const q: Record<string, string | undefined> = { academicYear };
      if (!isAdmin && selectedCenterId) q.centerId = selectedCenterId;
      const c = await getExamComparison(q);
      setComparison(c as Record<string, unknown>);
    } catch {
      setError('Could not load exam comparison (academic year may be missing data).');
    }
  };

  useEffect(() => {
    void loadComparison();
  }, [academicYear, selectedCenterId, isAdmin]);

  return (
    <PageWrapper title="Exam Tracker">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="text-xs font-medium text-neutral-600">Academic year</label>
          <input
            className="mt-1 block rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void loadExams()}>
          Refresh list
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => void loadComparison()}>
          Refresh comparison
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : exams.length === 0 ? (
        <EmptyState title="No exams" description="Create exams for this academic year in the backend or admin tools." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Exams</h2>
            <ul className="space-y-2 text-sm">
              {exams.map((ex) => (
                <li key={String(ex.id)} className="flex justify-between border-b border-neutral-100 py-2">
                  <span>
                    {String(ex.examType ?? '')} · {String(ex.academicYear ?? '')}
                  </span>
                  <span className="text-neutral-500">
                    {String((ex as { completionPercentage?: number }).completionPercentage ?? 0)}% complete
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold mb-2">Baseline vs endline (API)</h2>
            <pre className="text-xs overflow-auto max-h-[360px] bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              {JSON.stringify(comparison, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
};
