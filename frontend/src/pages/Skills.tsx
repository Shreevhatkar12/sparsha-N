import React, { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import { getStudents } from '../services/students.service';
import { getSkillsByStudent } from '../services/skills.service';
import type { Student } from '../types';

export const Skills: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [skillsPayload, setSkillsPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
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
        const data = await getSkillsByStudent(selectedId);
        if (alive) setSkillsPayload(data);
      } catch {
        if (alive) {
          setSkillsPayload(null);
          setError('Skill records are not available for this deployment (backend route or schema).');
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
      <PageWrapper title="Skills">
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Skill Development Tracking">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-3">Student</h2>
          {students.length === 0 ? (
            <EmptyState title="No students" description="Add students before logging skills." />
          ) : (
            <select
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
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
          )}
        </Card>
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-lg font-semibold mb-2">Records from API</h2>
            {detailLoading ? (
              <LoadingSpinner label="Loading skills…" />
            ) : (
              <pre className="text-xs overflow-auto max-h-[480px] bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                {JSON.stringify(skillsPayload, null, 2)}
              </pre>
            )}
            <p className="text-xs text-neutral-500 mt-3">
              When the backend exposes a stable skill model, this view can be replaced with sliders and save actions.
            </p>
            <Button variant="secondary" className="mt-4" type="button" disabled>
              Save (pending API contract)
            </Button>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};
