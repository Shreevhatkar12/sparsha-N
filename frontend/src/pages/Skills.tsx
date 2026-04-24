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
            ) : Array.isArray(skillsPayload) && skillsPayload.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-2">
                {skillsPayload.map((skill: any, i: number) => (
                  <div key={i} className="p-4 bg-white border border-neutral-200 rounded-xl shadow-sm hover:border-primary/50 transition-colors group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-neutral-800 capitalize">{skill.skill?.name || skill.skillName || skill.name || 'Skill Area'}</span>
                      <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shadow-sm">Level {skill.level || 0} / 5</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden border border-neutral-200/50">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-700 ease-out group-hover:opacity-90" 
                        style={{ width: `${Math.min(100, Math.max(0, (skill.level || 0) * 20))}%` }}
                      ></div>
                    </div>
                    {skill.remarks && <p className="text-xs text-neutral-500 mt-3 p-2 bg-neutral-50 border border-neutral-100 rounded-md">{skill.remarks}</p>}
                  </div>
                ))}
              </div>
            ) : (
               <div className="py-10 flex flex-col items-center justify-center text-center border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50 hover:bg-neutral-100/50 transition-colors">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <h3 className="font-medium text-neutral-700">No skill assessments</h3>
                  <p className="text-sm text-neutral-500 mt-1 max-w-sm">No skill data has been recorded for this student yet.</p>
               </div>
            )}
            <p className="text-xs text-neutral-400 mt-4 px-2 italic text-center">
              * Active editing and saving skills capabilities will be enabled once backend endpoints are finalized.
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
