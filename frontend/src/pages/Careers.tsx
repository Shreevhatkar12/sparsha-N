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
              ) : Array.isArray(careers) && careers.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {careers.map((career: any, i: number) => (
                    <div key={i} className="p-4 bg-white border border-neutral-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary/80 rounded-l-xl group-hover:bg-primary transition-colors"></div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <h3 className="font-semibold text-neutral-900 text-base">{career.careerGoal || career.stage || career.title || 'Career Update'}</h3>
                          {career.industry && <p className="text-xs font-semibold text-primary uppercase tracking-wide mt-0.5">{career.industry}</p>}
                          <p className="text-sm text-neutral-600 mt-2">{career.notes || career.description || 'No detailed notes provided.'}</p>
                          {career.milestones && Array.isArray(career.milestones) && career.milestones.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {career.milestones.map((ms: string, idx: number) => (
                                <span key={idx} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded border border-neutral-200">
                                  {ms}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0 whitespace-nowrap">
                          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                            {career.date ? new Date(career.date).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50">
                  <p className="text-neutral-600 font-medium">No career records found.</p>
                  <p className="text-sm text-neutral-400 mt-1">This student has not started any career tracking yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
};
