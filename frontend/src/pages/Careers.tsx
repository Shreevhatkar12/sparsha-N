import React, { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import { getStudents } from '../services/students.service';
import { getCareersByStudent } from '../services/career.service';
import type { Student } from '../types';

export const Careers: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [careers, setCareers] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getStudents({ limit: 200 });
        if (!alive) return;
        setStudents(res.students);
        if (res.students[0]) setSelectedId(res.students[0].id);
      } catch {
        if (alive) setError('Failed to load students.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    (async () => {
      setDetailLoading(true);
      setError(null);
      try {
        const data = await getCareersByStudent(selectedId);
        if (alive) setCareers(data);
      } catch {
        if (alive) {
          setCareers(null);
          setError('Career records are not available for this deployment (backend route or schema).');
        }
      } finally {
        if (alive) setDetailLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId]);

  if (loading) {
    return (
      <PageWrapper title="Career Tracking">
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Career Tracking">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}
      <Card>
        {students.length === 0 ? (
          <EmptyState title="No students" description="Add students to attach career records." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-600">Student</label>
              <select
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                value={selectedId}
                onChange={(e) => {
                  setError(null);
                  setSelectedId(e.target.value);
                }}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-2">API payload</h2>
              {detailLoading ? (
                <LoadingSpinner label="Loading careers…" />
              ) : (
                <pre className="text-xs overflow-auto max-h-[400px] bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  {JSON.stringify(careers, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
};
