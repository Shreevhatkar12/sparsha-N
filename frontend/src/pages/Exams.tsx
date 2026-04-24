import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import {
  createExam,
  getExamById,
  getExamComparison,
  listExams,
  upsertExamScores,
  type ListExamsQuery,
} from '../services/exams.service';
import { listCenters, listPrograms } from '../services/centers.service';
import { useAuthStore } from '../store/useAuthStore';
import type { CenterSummary, ProgramSummary } from '../types';
import type { ExamType } from '../types';

const SUBJECTS = ['english', 'science', 'maths'] as const;
type SubjectKey = (typeof SUBJECTS)[number];

type GridRow = Record<SubjectKey, string> & { remarks: string };

export const Exams: React.FC = () => {
  const selectedCenterId = useAuthStore((s) => s.selectedCenterId);
  const isAdmin = useAuthStore((s) => ['super_admin', 'tech_admin', 'center_admin'].includes(s.currentUser?.role || ''));

  const [centers, setCenters] = useState<CenterSummary[]>([]);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [centerId, setCenterId] = useState('');
  const [programId, setProgramId] = useState('');
  const [examType, setExamType] = useState<ExamType>('baseline');
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`);
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [examId, setExamId] = useState<string | null>(null);
  const [examLabel, setExamLabel] = useState('');
  const [grid, setGrid] = useState<Record<string, GridRow>>({});
  const [studentOrder, setStudentOrder] = useState<Array<{ id: string; fullName: string }>>([]);

  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setListLoading(true);
      try {
        const [c, p] = await Promise.all([listCenters(), listPrograms()]);
        if (!alive) return;
        setCenters(c);
        setPrograms(Array.isArray(p) ? p : []);
        const firstCenter = (!isAdmin && selectedCenterId ? selectedCenterId : c[0]?.id) ?? '';
        setCenterId(firstCenter);
        setProgramId(p[0]?.id ?? '');
      } catch {
        if (alive) setError('Failed to load centers or programs.');
      } finally {
        if (alive) setListLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin, selectedCenterId]);

  useEffect(() => {
    if (programs.length > 0 && !programs.some((p) => p.id === programId)) {
      setProgramId(programs[0].id);
    }
  }, [programs, programId]);

  const loadComparison = useCallback(async () => {
    setError(null);
    try {
      const q: Record<string, string | undefined> = { academicYearId: academicYear };
      if (!isAdmin && centerId) q.centerId = centerId;
      if (programId) q.programId = programId;
      const c = await getExamComparison(q);
      setComparison(c as Record<string, unknown>);
    } catch {
      setError('Could not load exam comparison.');
    }
  }, [academicYear, centerId, programId, isAdmin]);

  useEffect(() => {
    void loadComparison();
  }, [loadComparison]);

  const hydrateGrid = useCallback(
    (rows: Array<{ student: { id: string; fullName: string }; scores: Array<{ subject: string; marks: unknown; remarks?: string | null }> }>) => {
      const next: Record<string, GridRow> = {};
      const order: Array<{ id: string; fullName: string }> = [];
      for (const row of rows) {
        order.push({ id: row.student.id, fullName: row.student.fullName });
        const g: GridRow = {
          english: '',
          science: '',
          maths: '',
          remarks: '',
        };
        for (const sc of row.scores) {
          const sub = sc.subject.toLowerCase() as SubjectKey;
          if (sub === 'english' || sub === 'science' || sub === 'maths') {
            g[sub] = sc.marks != null && sc.marks !== '' ? String(sc.marks) : '';
          }
          if (sc.remarks && !g.remarks) g.remarks = sc.remarks;
        }
        next[row.student.id] = g;
      }
      setStudentOrder(order);
      setGrid(next);
    },
    [],
  );

  const loadWorkspace = async (id: string) => {
    setWorkspaceLoading(true);
    setError(null);
    try {
      const res = (await getExamById(id)) as {
        exam: { id: string; academicYear?: string; examType?: string };
        students: Array<{
          student: { id: string; fullName: string };
          scores: Array<{ subject: string; marks: unknown; remarks?: string | null }>;
        }>;
      };
      setExamId(res.exam.id);
      setExamLabel(`${res.exam.examType ?? ''} · ${res.exam.academicYear ?? ''}`);
      hydrateGrid(res.students);
    } catch {
      setError('Could not load exam workspace.');
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const prepareExam = async () => {
    if (!centerId || !programId) {
      setError('Select center and program.');
      return;
    }
    setError(null);
    const body = {
      centerId,
      programId,
      examType,
      academicYear,
      examDate,
    };
    try {
      try {
        const res = (await createExam(body)) as {
          exam?: { id: string; examType?: string; academicYear?: string };
        };
        if (res.exam?.id) {
          setExamLabel(`${res.exam.examType ?? examType} · ${res.exam.academicYear ?? academicYear}`);
          await loadWorkspace(res.exam.id);
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          const d = err.response.data as { exam?: { id: string; examType?: string; academicYear?: string } };
          if (d.exam?.id) {
            setExamLabel(`${d.exam.examType ?? examType} · ${d.exam.academicYear ?? academicYear}`);
            await loadWorkspace(d.exam.id);
            return;
          }
        }
        throw err;
      }
    } catch {
      setError('Could not open exam. Check permissions and inputs.');
    }
  };

  const pickFromList = async () => {
    if (!centerId || !programId) return;
    setWorkspaceLoading(true);
    setError(null);
    try {
      const params: ListExamsQuery = {
        centerId,
        programId,
        examType,
        academicYearId: academicYear,
      };
      const res = (await listExams(params)) as { exams?: Array<{ id: string }> };
      const first = res.exams?.[0];
      if (first?.id) await loadWorkspace(first.id);
      else setError('No exam found for these filters. Use Prepare exam to create one.');
    } catch {
      setError('Failed to list exams.');
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const updateCell = (studentId: string, key: keyof GridRow, value: string) => {
    setGrid((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] ?? {
          english: '',
          science: '',
          maths: '',
          remarks: '',
        }),
        [key]: value,
      },
    }));
  };

  const submitScores = async () => {
    if (!examId) return;
    const scores: Array<{
      studentId: string;
      subject: string;
      marks: number;
      maxMarks: number;
      remarks?: string;
    }> = [];

    for (const { id: studentId } of studentOrder) {
      const g = grid[studentId];
      if (!g) continue;
      for (const sub of SUBJECTS) {
        const raw = (g[sub] ?? '').trim();
        if (raw === '') continue;
        const n = Number(raw);
        if (Number.isNaN(n) || n < 0 || n > 50) {
          setError(`Marks must be 0–50 for ${sub}.`);
          return;
        }
        scores.push({
          studentId,
          subject: sub,
          marks: n,
          maxMarks: 50,
          ...(sub === 'english' && g.remarks.trim() ? { remarks: g.remarks.trim() } : {}),
        });
      }
    }

    if (scores.length === 0) {
      setError('Enter at least one score.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await upsertExamScores(examId, { scores });
      await loadWorkspace(examId);
      await loadComparison();
    } catch {
      setError('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const rowIncomplete = (studentId: string) => {
    const g = grid[studentId];
    if (!g) return true;
    return SUBJECTS.some((s) => (g[s] ?? '').trim() === '');
  };

  if (listLoading) {
    return (
      <PageWrapper title="Exams">
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Exams">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Exam setup</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-neutral-600">Center</label>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Program</label>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Exam type</label>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white"
              value={examType}
              onChange={(e) => setExamType(e.target.value as ExamType)}
            >
              <option value="baseline">Baseline</option>
              <option value="endline">Endline</option>
            </select>
          </div>
          <Input label="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
          <Input label="Exam date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" onClick={() => void prepareExam()} disabled={workspaceLoading}>
            {workspaceLoading ? 'Loading…' : 'Prepare exam'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void pickFromList()} disabled={workspaceLoading}>
            Load from list
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadComparison()}>
            Refresh comparison
          </Button>
        </div>
        {examId && (
          <p className="text-sm text-neutral-600 mt-3">
            Active: <span className="font-medium text-neutral-900">{examLabel}</span> ({examId.slice(0, 8)}…)
          </p>
        )}
      </Card>

      {workspaceLoading ? (
        <LoadingSpinner />
      ) : !examId ? (
        <EmptyState
          title="No exam workspace"
          description="Choose center, program, and type, then click Prepare exam (or Load from list)."
        />
      ) : (
        <Card className="mb-6 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Marks (0–50)</h2>
            <Button type="button" variant="primary" isLoading={saving} onClick={() => void submitScores()}>
              Save all scores
            </Button>
          </div>
          <table className="w-full text-sm min-w-[720px]">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="border-b border-neutral-200 text-left text-neutral-600">
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-2 font-medium">English</th>
                <th className="py-2 pr-2 font-medium">Science</th>
                <th className="py-2 pr-2 font-medium">Maths</th>
                <th className="py-2 pr-2 font-medium min-w-[140px]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {studentOrder.map((s, idx) => {
                const g = grid[s.id] ?? {
                  english: '',
                  science: '',
                  maths: '',
                  remarks: '',
                };
                const incomplete = rowIncomplete(s.id);
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-neutral-100 ${idx % 2 === 1 ? 'bg-neutral-50/80' : ''} ${
                      incomplete ? 'bg-amber-50' : ''
                    } hover:bg-brand-50/60`}
                  >
                    <td className="py-2 pr-3 font-medium text-neutral-900 whitespace-nowrap">{s.fullName}</td>
                    {SUBJECTS.map((sub) => (
                      <td key={sub} className="py-1 pr-1">
                        <input
                          className="w-20 rounded border border-neutral-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                          inputMode="numeric"
                          value={g[sub]}
                          onChange={(e) => updateCell(s.id, sub, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="py-1 pr-1">
                      <input
                        className="w-full min-w-[120px] rounded border border-neutral-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500"
                        value={g.remarks}
                        onChange={(e) => updateCell(s.id, 'remarks', e.target.value)}
                        placeholder="Optional"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-neutral-500 mt-3">
            Rows with any empty subject are highlighted. Remarks are stored on the English score row.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold mb-4">Baseline vs Endline Comparison</h2>
        {!comparison || (!(comparison as any).perSubject?.length && !(comparison as any).perStudent?.length) ? (
          <div className="p-8 text-center border border-dashed border-neutral-200 rounded-xl bg-neutral-50">
            <p className="text-neutral-500 font-medium">No comparison data available.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm border-b pb-2 mb-3 font-semibold text-neutral-800">Subject Performance Flow</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {((comparison as any).perSubject || []).map((sub: any) => (
                  <div key={sub.subject} className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-2 h-full ${sub.growth > 0 ? 'bg-success-400' : sub.growth < 0 ? 'bg-danger-400' : 'bg-neutral-300'}`}></div>
                    <p className="capitalize font-semibold text-neutral-900 mb-3">{sub.subject}</p>
                    <div className="flex items-center justify-between text-sm bg-neutral-50 p-2 rounded mb-1">
                      <span className="text-neutral-600">Baseline Avg:</span>
                      <span className="font-medium text-neutral-900">{sub.baselineAvg?.toFixed(1) || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm bg-neutral-50 p-2 rounded mb-1">
                      <span className="text-neutral-600">Endline Avg:</span>
                      <span className="font-medium text-neutral-900">{sub.endlineAvg?.toFixed(1) || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold mt-3 pt-2 border-t border-neutral-100">
                      <span>Growth:</span>
                      <span className={sub.growth > 0 ? "text-success-600" : sub.growth < 0 ? "text-danger-600" : "text-neutral-600"}>
                        {sub.growth > 0 ? '+' : ''}{sub.growth?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
};
