import React, { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuthStore } from '../store/useAuthStore';
import { listCenters, listPrograms } from '../services/centers.service';
import {
  createAttendanceSession,
  getAttendanceSessionById,
  updateAttendanceSessionRecords,
} from '../services/attendance.service';
import type { CenterSummary, ProgramSummary } from '../types';

type Row = {
  recordId: string;
  studentId: string;
  name: string;
  status: 'present' | 'absent' | 'late' | null;
};

export const Attendance: React.FC = () => {
  const selectedCenterId = useAuthStore((s) => s.selectedCenterId);
  const isAdmin = useAuthStore((s) => s.currentUser?.role === 'admin');

  const [centers, setCenters] = useState<CenterSummary[]>([]);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [centerId, setCenterId] = useState('');
  const [programId, setProgramId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [boot, setBoot] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, p] = await Promise.all([listCenters(), listPrograms()]);
        if (!alive) return;
        setCenters(c);
        setPrograms(p);
        const defaultCenter = isAdmin ? (c[0]?.id ?? '') : selectedCenterId ?? c[0]?.id ?? '';
        setCenterId(defaultCenter);
        setProgramId(p[0]?.id ?? '');
      } catch {
        if (alive) setError('Could not load centers or programs.');
      } finally {
        if (alive) setBoot(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin, selectedCenterId]);

  const loadSession = async () => {
    if (!centerId || !programId) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await createAttendanceSession({
        centerId,
        programId,
        sessionDate: date,
      })) as { created?: boolean; session?: { id: string } };
      const sid = res.session?.id;
      if (!sid) throw new Error('No session id');
      setSessionId(sid);
      await refreshRows(sid);
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number; data?: { session?: { id: string } } } };
      if (ax.response?.status === 409 && ax.response.data?.session?.id) {
        const sid = ax.response.data.session.id;
        setSessionId(sid);
        await refreshRows(sid);
      } else {
        setError('Could not create or load session for this date.');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshRows = async (sid: string) => {
    const full = (await getAttendanceSessionById(sid)) as {
      records?: Array<{ student?: { id: string; fullName: string }; record?: { id: string; status: string | null } }>;
    };
    setRows(
      (full.records ?? []).map((r) => ({
        recordId: r.record?.id ?? '',
        studentId: r.student?.id ?? '',
        name: r.student?.fullName ?? 'Student',
        status: (r.record?.status as Row['status']) ?? null,
      })),
    );
  };

  const cycle = (s: Row['status']): Row['status'] => {
    if (s === null || s === 'present') return 'absent';
    if (s === 'absent') return 'late';
    return 'present';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const records = rows
        .filter((r) => r.recordId)
        .map((r) => ({
          recordId: r.recordId,
          status: (r.status ?? 'present') as 'present' | 'absent' | 'late',
        }));
      await updateAttendanceSessionRecords(sessionId, { records });
      await refreshRows(sessionId);
    } catch {
      setError('Failed to save attendance.');
    } finally {
      setLoading(false);
    }
  };

  if (boot) return <PageWrapper title="Attendance"><LoadingSpinner /></PageWrapper>;

  return (
    <PageWrapper title="Mark Attendance">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Session</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-600">Center</label>
                <select
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  value={centerId}
                  onChange={(e) => setCenterId(e.target.value)}
                  disabled={!isAdmin}
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-600">Program</label>
                <select
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
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
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
              <Button type="button" variant="secondary" onClick={() => void loadSession()} isLoading={loading}>
                Load session
              </Button>
            </div>
          </Card>

          {sessionId && (
            <Card>
              <form onSubmit={handleSave} className="space-y-4">
                <h2 className="text-lg font-semibold">Students</h2>
                <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100">
                  {rows.length === 0 ? (
                    <p className="p-4 text-sm text-neutral-500">No records for this session.</p>
                  ) : (
                    rows.map((r, i) => (
                      <div key={r.recordId || r.studentId} className="flex items-center justify-between p-3 gap-3">
                        <div>
                          <p className="font-medium text-neutral-900">{r.name}</p>
                          <p className="text-xs text-neutral-500">{r.status ?? 'Pending'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setRows((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, status: cycle(x.status) } : x)),
                            )
                          }
                          className="shrink-0"
                        >
                          <Badge variant={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : 'danger'}>
                            {r.status === null || r.status === undefined
                              ? 'PENDING'
                              : r.status.toUpperCase()}
                          </Badge>
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" isLoading={loading} disabled={!rows.length}>
                    Save marks
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
        <Card>
          <h2 className="text-lg font-semibold mb-2">How it works</h2>
          <p className="text-sm text-neutral-600">
            Pick center, program, and date, then load the session. Toggle each student&apos;s status and save. If a
            session already exists for that day, it opens instead of creating a duplicate.
          </p>
        </Card>
      </div>
    </PageWrapper>
  );
};
