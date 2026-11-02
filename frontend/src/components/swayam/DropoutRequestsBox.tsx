import React, { useCallback, useEffect, useState } from 'react';
import {
  acceptDropoutRequest,
  declineDropoutRequest,
  listDropoutRequests,
  type DropoutRequestRow,
} from '../../services/swayam.service';

// Right-aligned "Teacher Requests" box on the Dropout page. Click to open
// the list; Accept moves the student to the dropout list, Decline sends
// the student back to the teacher's center (nothing changes for them).
export const DropoutRequestsBox: React.FC<{ onChanged: () => Promise<void> | void }> = ({ onChanged }) => {
  const [rows, setRows] = useState<DropoutRequestRow[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await listDropoutRequests()).requests);
      setError(null);
    } catch {
      setError('Could not load teacher requests. Please refresh.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, kind: 'accept' | 'decline') => {
    setBusyId(id);
    setError(null);
    try {
      if (kind === 'accept') await acceptDropoutRequest(id);
      else await declineDropoutRequest(id);
      await load();
      await onChanged();
    } catch {
      setError(kind === 'accept' ? 'Could not accept the request.' : 'Could not decline the request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-4 flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
      >
        Teacher Requests
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{rows.length}</span>
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {open && (
        <div className="mt-2 w-full max-w-3xl rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">No pending requests.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-400">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Center</th>
                  <th className="py-2 pr-3">Std</th>
                  <th className="py-2 pr-3">Requested by</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} className="border-t border-neutral-100">
                    <td className="py-2 pr-3 font-semibold text-neutral-800">{r.studentName}</td>
                    <td className="py-2 pr-3">{r.centerName}</td>
                    <td className="py-2 pr-3">{r.standard}</td>
                    <td className="py-2 pr-3">{r.teacherName}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={busyId === r.studentId}
                        onClick={() => void act(r.studentId, 'accept')}
                        className="mr-2 rounded-md bg-green-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.studentId}
                        onClick={() => void act(r.studentId, 'decline')}
                        className="rounded-md border border-red-300 px-3 py-1 text-xs font-bold text-red-600 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
