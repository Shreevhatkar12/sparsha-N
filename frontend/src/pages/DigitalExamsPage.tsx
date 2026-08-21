import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Plus, Trash2, Edit2, ArrowLeft, Save, UserX } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts';
import {
  listDigitalStudents,
  listDigitalExams,
  createDigitalExam,
  updateDigitalExam,
  deleteDigitalExam,
  type DigitalRow,
  type DLExam,
  type DLExamMark,
} from '../services/digital.service';

const AXIS_INK = '#6b7280';
const GRID_INK = '#eef1f4';
const CHART_MARGIN = { top: 12, right: 16, bottom: 34, left: 8 };
const hideZero = (v: unknown) => (Number(v) > 0 ? String(v) : '');
const C_IN = '#008300';
const C_OUT = '#2a78d6';

// Same grade system as the rest of the app.
const gradeOf = (pct: number) => (pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'E');
const GRADES = ['A', 'B', 'C', 'D', 'E'] as const;
const GRADE_COLORS: Record<string, string> = {
  A: '#008300',
  B: '#1baf7a',
  C: '#eda100',
  D: '#eb6834',
  E: '#e34948',
};
const GRADE_BADGE: Record<string, string> = {
  A: 'bg-green-50 text-green-700 border-green-100',
  B: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  C: 'bg-amber-50 text-amber-700 border-amber-100',
  D: 'bg-orange-50 text-orange-700 border-orange-100',
  E: 'bg-red-50 text-red-700 border-red-100',
};

const genderShort = (g: string) => (g === 'male' ? 'M' : g === 'female' ? 'F' : g ? 'O' : '');
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString() : '—');

type MarksDraft = Record<string, { score: string; absent: boolean }>;

// Digital Literacy exam panel — create exams, batch-wise marks entry with
// an Absent toggle, exam list + delete, and a Result & Report sub-section.
export const DigitalExamsPage: React.FC = () => {
  const [exams, setExams] = useState<DLExam[]>([]);
  const [students, setStudents] = useState<DigitalRow[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [tab, setTab] = useState<'exams' | 'report'>('exams');

  // create / edit exam form
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<DLExam | null>(null);
  const [exName, setExName] = useState('');
  const [exDate, setExDate] = useState('');
  const [exTopic, setExTopic] = useState('');
  const [exSubject, setExSubject] = useState('');
  const [exTotal, setExTotal] = useState('');
  const [exBatch, setExBatch] = useState('');
  const [exBatchCustom, setExBatchCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // marks entry
  const [activeExam, setActiveExam] = useState<DLExam | null>(null);
  const [marksDraft, setMarksDraft] = useState<MarksDraft>({});
  const [savingMarks, setSavingMarks] = useState(false);

  // report
  const [reportExamId, setReportExamId] = useState('');

  const load = useCallback(async () => {
    try {
      const [ex, st] = await Promise.all([listDigitalExams(), listDigitalStudents()]);
      setExams(ex.exams);
      setStudents(st.students);
      setBatches(st.batches);
      setError(null);
      return ex.exams;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load exams.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const batchStudents = useCallback(
    (batch: string) => students.filter((s) => (s.batch || '') === batch),
    [students],
  );

  const enteredCount = (exam: DLExam) => {
    const rows = batchStudents(exam.batch);
    let entered = 0;
    for (const r of rows) {
      const m = exam.marks[r.studentId];
      if (m && (m.absent || m.score != null)) entered++;
    }
    return { entered, total: rows.length };
  };

  // ---- create / edit exam ------------------------------------------------

  const resetForm = () => {
    setEditingExam(null);
    setExName('');
    setExDate('');
    setExTopic('');
    setExSubject('');
    setExTotal('');
    setExBatch('');
    setExBatchCustom('');
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setSuccess(null);
    setShowForm(true);
    setActiveExam(null);
    setTab('exams');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditExam = (e: DLExam) => {
    resetForm();
    setEditingExam(e);
    setExName(e.name);
    setExDate(e.date ? e.date.slice(0, 10) : '');
    setExTopic(e.topic);
    setExSubject(e.subject);
    setExTotal(String(e.totalMarks));
    if (batches.includes(e.batch)) {
      setExBatch(e.batch);
    } else {
      setExBatch('__custom__');
      setExBatchCustom(e.batch);
    }
    setShowForm(true);
    setActiveExam(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExamSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    const batch = exBatch === '__custom__' ? exBatchCustom.trim() : exBatch;
    const total = Number(exTotal);
    if (exName.trim().length < 2) return setFormError('Exam name is required.');
    if (!exDate) return setFormError('Exam date is required.');
    if (!exSubject.trim()) return setFormError('Subject is required.');
    if (!batch) return setFormError('Please select a batch (or type a custom one).');
    if (!Number.isInteger(total) || total < 1 || total > 1000)
      return setFormError('Total marks must be between 1 and 1000 (e.g. 50).');

    setSaving(true);
    try {
      if (editingExam) {
        await updateDigitalExam(editingExam.id, {
          name: exName.trim(),
          date: exDate,
          topic: exTopic.trim(),
          subject: exSubject.trim(),
          batch,
          totalMarks: total,
        });
        setSuccess('Exam updated ✅');
        resetForm();
        setShowForm(false);
        await load();
      } else {
        const res = await createDigitalExam({
          name: exName.trim(),
          date: exDate,
          topic: exTopic.trim(),
          subject: exSubject.trim(),
          batch,
          totalMarks: total,
          marks: {},
        });
        setSuccess('Exam created ✅ — now enter the marks.');
        resetForm();
        setShowForm(false);
        const fresh = await load();
        const created = fresh.find((x) => x.id === res.id);
        if (created) openMarks(created);
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExam = async (e: DLExam) => {
    if (!window.confirm(`Delete exam "${e.name}"? Its marks will be deleted too.`)) return;
    try {
      await deleteDigitalExam(e.id);
      setSuccess('Exam deleted ✅');
      if (activeExam?.id === e.id) setActiveExam(null);
      if (reportExamId === e.id) setReportExamId('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Delete failed.');
    }
  };

  // ---- marks entry -------------------------------------------------------

  const openMarks = (exam: DLExam) => {
    setShowForm(false);
    setActiveExam(exam);
    const draft: MarksDraft = {};
    for (const s of students.filter((x) => (x.batch || '') === exam.batch)) {
      const m = exam.marks[s.studentId];
      draft[s.studentId] = {
        score: m && m.score != null ? String(m.score) : '',
        absent: m ? m.absent : false,
      };
    }
    setMarksDraft(draft);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setScore = (studentId: string, score: string) => {
    setMarksDraft((prev) => ({
      ...prev,
      [studentId]: { score, absent: false },
    }));
  };

  const toggleAbsent = (studentId: string) => {
    setMarksDraft((prev) => {
      const cur = prev[studentId] ?? { score: '', absent: false };
      return { ...prev, [studentId]: { score: cur.absent ? cur.score : '', absent: !cur.absent } };
    });
  };

  const handleSaveMarks = async () => {
    if (!activeExam) return;
    const total = activeExam.totalMarks;
    const marks: Record<string, DLExamMark> = {};
    for (const [sid, m] of Object.entries(marksDraft)) {
      if (m.absent) {
        marks[sid] = { score: null, absent: true };
      } else if (m.score.trim() !== '') {
        const n = Number(m.score);
        if (!Number.isFinite(n) || n < 0 || n > total) {
          setError(`Marks must be between 0 and ${total}.`);
          return;
        }
        marks[sid] = { score: n, absent: false };
      }
    }
    setSavingMarks(true);
    setError(null);
    try {
      await updateDigitalExam(activeExam.id, { marks });
      setSuccess('Marks saved ✅');
      const fresh = await load();
      const updated = fresh.find((x) => x.id === activeExam.id);
      if (updated) setActiveExam(updated);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Marks save failed.');
    } finally {
      setSavingMarks(false);
    }
  };

  // ---- report ------------------------------------------------------------

  const reportExam = exams.find((e) => e.id === (reportExamId || exams[0]?.id)) || null;

  const report = useMemo(() => {
    if (!reportExam) return null;
    const rows = batchStudents(reportExam.batch).map((s) => {
      const m = reportExam.marks[s.studentId];
      const absent = m ? m.absent : false;
      const score = m && m.score != null ? m.score : null;
      const pct = score != null && reportExam.totalMarks > 0 ? (score / reportExam.totalMarks) * 100 : null;
      return { s, absent, score, pct, grade: pct != null ? gradeOf(pct) : null };
    });
    const appeared = rows.filter((r) => r.pct != null);
    const absent = rows.filter((r) => r.absent);
    const notEntered = rows.length - appeared.length - absent.length;
    const avg = appeared.length ? appeared.reduce((a, r) => a + (r.pct ?? 0), 0) / appeared.length : 0;
    const highest = appeared.length ? Math.max(...appeared.map((r) => r.pct ?? 0)) : 0;
    const lowest = appeared.length ? Math.min(...appeared.map((r) => r.pct ?? 0)) : 0;
    const gradeData = GRADES.map((g) => ({
      grade: g,
      Students: appeared.filter((r) => r.grade === g).length,
    }));
    const side = (kind: 'in' | 'out') => {
      const k = appeared.filter((r) => r.s.kind === kind);
      return {
        avg: k.length ? Math.round(k.reduce((a, r) => a + (r.pct ?? 0), 0) / k.length) : 0,
        count: k.length,
      };
    };
    const inSide = side('in');
    const outSide = side('out');
    const inOutData = [
      { name: 'In Center', 'Average %': inSide.avg },
      { name: 'Out Center', 'Average %': outSide.avg },
    ];
    return { rows, appeared, absentCount: absent.length, notEntered, avg, highest, lowest, gradeData, inSide, outSide, inOutData };
  }, [reportExam, batchStudents]);

  // ---- UI helpers --------------------------------------------------------

  const tile = (label: string, value: React.ReactNode, color?: string) => (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-center">
      <div className="text-2xl font-black" style={{ color: color || '#111827' }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  );

  const inputCls =
    'w-full h-11 rounded-lg border border-neutral-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelCls = 'text-xs uppercase tracking-wide text-neutral-600 font-medium mb-1 block';

  const xAxisLabel = (text: string) => ({
    value: text,
    position: 'insideBottom' as const,
    offset: -4,
    fontSize: 12,
    fill: AXIS_INK,
  });
  const yAxisLabel = (text: string) => ({
    value: text,
    angle: -90,
    position: 'insideLeft' as const,
    fontSize: 12,
    fill: AXIS_INK,
  });

  const kindBadge = (kind: 'in' | 'out') => (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${
        kind === 'in'
          ? 'bg-green-50 text-green-700 border-green-100'
          : 'bg-blue-50 text-blue-700 border-blue-100'
      }`}
    >
      {kind === 'in' ? 'In Center' : 'Out Center'}
    </span>
  );

  return (
    <PageWrapper
      title="Digital Exams"
      actions={
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus size={16} className="mr-1" /> Create Exam
        </Button>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {success}
        </div>
      )}

      {loading && exams.length === 0 && students.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <div className="flex flex-col gap-4">
          {/* sub-tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setTab('exams'); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                tab === 'exams'
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
              }`}
            >
              Exams ({exams.length})
            </button>
            <button
              type="button"
              onClick={() => { setTab('report'); setShowForm(false); setActiveExam(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                tab === 'report'
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
              }`}
            >
              Exam Result &amp; Report
            </button>
          </div>

          {tab === 'exams' ? (
            <>
              {/* create / edit form */}
              {showForm && (
                <Card className="border-none shadow-sm">
                  <h2 className="text-lg font-semibold mb-1">{editingExam ? 'Edit Exam' : 'Create Exam'}</h2>
                  <p className="text-xs text-neutral-500 mb-4">
                    After creating the exam, all students of that batch (in + out center) appear in marks entry.
                  </p>
                  {formError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                      {formError}
                    </div>
                  )}
                  <form onSubmit={handleExamSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Exam Name *</label>
                      <input className={inputCls} value={exName} onChange={(e) => setExName(e.target.value)} placeholder="e.g. Unit Test 1" />
                    </div>
                    <div>
                      <label className={labelCls}>Exam Date *</label>
                      <input className={inputCls} type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Topic / Session</label>
                      <input className={inputCls} value={exTopic} onChange={(e) => setExTopic(e.target.value)} placeholder="e.g. MS Word basics" />
                    </div>
                    <div>
                      <label className={labelCls}>Subject *</label>
                      <input className={inputCls} value={exSubject} onChange={(e) => setExSubject(e.target.value)} placeholder="e.g. Computer Basics" />
                    </div>
                    <div>
                      <label className={labelCls}>Total Marks *</label>
                      <input className={inputCls} type="number" min={1} max={1000} value={exTotal} onChange={(e) => setExTotal(e.target.value)} placeholder="e.g. 50" />
                    </div>
                    <div>
                      <label className={labelCls}>Batch No *</label>
                      <select className={inputCls} value={exBatch} onChange={(e) => setExBatch(e.target.value)}>
                        <option value="">Select batch…</option>
                        {batches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                        <option value="__custom__">Other (type manually)</option>
                      </select>
                    </div>
                    {exBatch === '__custom__' && (
                      <div>
                        <label className={labelCls}>Custom Batch *</label>
                        <input className={inputCls} value={exBatchCustom} onChange={(e) => setExBatchCustom(e.target.value)} placeholder="e.g. Batch 3" />
                      </div>
                    )}
                    <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                      <Button variant="secondary" type="button" onClick={() => { resetForm(); setShowForm(false); }}>
                        Cancel
                      </Button>
                      <Button variant="primary" type="submit" isLoading={saving}>
                        {editingExam ? 'Update Exam' : 'Create Exam'}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* marks entry */}
              {activeExam && (
                <Card className="border-none shadow-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="px-2" onClick={() => setActiveExam(null)} title="Back to exam list">
                        <ArrowLeft size={18} />
                      </Button>
                      <h2 className="text-lg font-semibold">Marks Entry — {activeExam.name}</h2>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                      {activeExam.batch}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mb-4">
                    {fmtDate(activeExam.date)} · {activeExam.subject}
                    {activeExam.topic ? ` · ${activeExam.topic}` : ''} · Total Marks: <b>{activeExam.totalMarks}</b>
                  </p>

                  {batchStudents(activeExam.batch).length === 0 ? (
                    <EmptyState
                      title="No students in this batch"
                      description={`Add students to "${activeExam.batch}" from the Students section first.`}
                    />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-neutral-50">
                            <tr className="text-left text-neutral-600 border-b border-neutral-200">
                              <th className="py-2.5 px-3 font-medium">Student</th>
                              <th className="py-2.5 px-3 font-medium text-center">Type</th>
                              <th className="py-2.5 px-3 font-medium text-center">Std / Course</th>
                              <th className="py-2.5 px-3 font-medium text-center">Marks (out of {activeExam.totalMarks})</th>
                              <th className="py-2.5 px-3 font-medium text-center">Absent</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batchStudents(activeExam.batch).map((s, i) => {
                              const d = marksDraft[s.studentId] ?? { score: '', absent: false };
                              return (
                                <tr key={s.studentId} className={`border-b border-neutral-100 ${i % 2 ? 'bg-neutral-50/50' : ''}`}>
                                  <td className="py-2 px-3">
                                    <div className="font-medium text-neutral-900">{s.fullName}</div>
                                    <div className="text-xs text-neutral-500">
                                      {s.gender ? `${genderShort(s.gender)} · ` : ''}
                                      {s.batch}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center">{kindBadge(s.kind)}</td>
                                  <td className="py-2 px-3 text-center text-neutral-700">{s.stdCourse || '—'}</td>
                                  <td className="py-2 px-3 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      max={activeExam.totalMarks}
                                      value={d.score}
                                      disabled={d.absent}
                                      onChange={(e) => setScore(s.studentId, e.target.value)}
                                      className={`w-24 h-10 rounded-lg border px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                                        d.absent ? 'bg-neutral-100 border-neutral-200 text-neutral-400' : 'bg-white border-neutral-300'
                                      }`}
                                      placeholder="—"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => toggleAbsent(s.studentId)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                        d.absent
                                          ? 'bg-red-600 text-white border-red-600'
                                          : 'bg-white text-neutral-600 border-neutral-300 hover:border-red-400'
                                      }`}
                                      title="Mark as absent"
                                    >
                                      <UserX size={14} /> {d.absent ? 'Absent' : 'Mark Absent'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button variant="primary" onClick={() => void handleSaveMarks()} isLoading={savingMarks}>
                          <Save size={16} className="mr-1" /> Save Marks
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {/* exam list */}
              {!activeExam && (
                <Card className="border-none shadow-sm">
                  <h3 className="font-bold text-neutral-900 mb-4">Created Exams</h3>
                  {exams.length === 0 ? (
                    <EmptyState
                      title="No exams yet"
                      description="Use the Create Exam button to create your first exam."
                      action={
                        <Button variant="primary" onClick={openCreate}>
                          <Plus size={16} className="mr-1" /> Create Exam
                        </Button>
                      }
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-neutral-50">
                          <tr className="text-left text-neutral-600 border-b border-neutral-200">
                            <th className="py-2.5 px-3 font-medium">Exam</th>
                            <th className="py-2.5 px-3 font-medium text-center">Date</th>
                            <th className="py-2.5 px-3 font-medium text-center">Subject</th>
                            <th className="py-2.5 px-3 font-medium text-center">Batch</th>
                            <th className="py-2.5 px-3 font-medium text-center">Total Marks</th>
                            <th className="py-2.5 px-3 font-medium text-center">Marks Entered</th>
                            <th className="py-2.5 px-3 font-medium text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exams.map((e, i) => {
                            const ec = enteredCount(e);
                            return (
                              <tr key={e.id} className={`border-b border-neutral-100 hover:bg-neutral-50 ${i % 2 ? 'bg-neutral-50/50' : ''}`}>
                                <td className="py-2.5 px-3">
                                  <div className="font-medium text-neutral-900">{e.name}</div>
                                  {e.topic && <div className="text-xs text-neutral-500">{e.topic}</div>}
                                </td>
                                <td className="py-2.5 px-3 text-center text-neutral-700">{fmtDate(e.date)}</td>
                                <td className="py-2.5 px-3 text-center text-neutral-700">{e.subject || '—'}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100">
                                    {e.batch}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center text-neutral-700">{e.totalMarks}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`text-xs font-bold ${ec.entered === ec.total && ec.total > 0 ? 'text-green-700' : 'text-neutral-600'}`}>
                                    {ec.entered} / {ec.total}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    <Button variant="secondary" size="sm" className="text-xs" onClick={() => openMarks(e)}>
                                      Enter Marks
                                    </Button>
                                    <Button variant="ghost" size="sm" className="px-2" title="Edit exam details" onClick={() => openEditExam(e)}>
                                      <Edit2 size={16} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="px-2 text-danger hover:bg-danger/10"
                                      title="Delete exam"
                                      onClick={() => void handleDeleteExam(e)}
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}
            </>
          ) : (
            /* ------------------------- RESULT & REPORT ------------------------- */
            <>
              {exams.length === 0 ? (
                <Card className="border-none shadow-sm">
                  <EmptyState title="No exams yet" description="First create an exam and enter marks from the Exams tab." />
                </Card>
              ) : (
                <>
                  <Card className="border-none shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-neutral-500 uppercase">Select Exam:</span>
                      <select
                        className="h-10 rounded-lg border border-neutral-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={reportExam?.id || ''}
                        onChange={(e) => setReportExamId(e.target.value)}
                      >
                        {exams.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} — {e.batch} ({fmtDate(e.date)})
                          </option>
                        ))}
                      </select>
                      {reportExam && (
                        <span className="text-xs text-neutral-500">
                          Subject: <b>{reportExam.subject}</b>
                          {reportExam.topic ? <> · Topic: <b>{reportExam.topic}</b></> : null} · Total Marks:{' '}
                          <b>{reportExam.totalMarks}</b>
                        </span>
                      )}
                    </div>
                  </Card>

                  {reportExam && report && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        {tile('Students', report.rows.length)}
                        {tile('Appeared', report.appeared.length, '#008300')}
                        {tile('Absent', report.absentCount, '#e34948')}
                        {tile('Not Entered', report.notEntered, '#eda100')}
                        {tile('Average %', `${Math.round(report.avg)}%`, '#2a78d6')}
                        {tile('Highest %', `${Math.round(report.highest)}%`, '#4a3aa7')}
                      </div>

                      {/* grade distribution */}
                      <Card className="border-none shadow-sm">
                        <h3 className="font-bold text-neutral-900 mb-1">Grade Distribution</h3>
                        <p className="text-xs text-neutral-500 mb-3">
                          A = 80%+ · B = 60–79% · C = 50–59% · D = 40–49% · E = &lt;40%
                        </p>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={report.gradeData} margin={CHART_MARGIN}>
                            <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                            <XAxis dataKey="grade" tick={{ fontSize: 12, fill: AXIS_INK }} label={xAxisLabel('Grade')} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_INK }} label={yAxisLabel('Students')} />
                            <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: '#f6f8fa' }} />
                            <Bar dataKey="Students" radius={[4, 4, 0, 0]} maxBarSize={56}>
                              {report.gradeData.map((g) => (
                                <Cell key={g.grade} fill={GRADE_COLORS[g.grade]} />
                              ))}
                              <LabelList dataKey="Students" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>

                      {/* in vs out comparison */}
                      <Card className="border-none shadow-sm">
                        <h3 className="font-bold text-neutral-900 mb-1">In Center vs Out Center</h3>
                        <p className="text-xs text-neutral-500 mb-3">
                          Average % comparison of in-center vs out-center students for this exam
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={report.inOutData} margin={CHART_MARGIN}>
                              <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS_INK }} label={xAxisLabel('Student Type')} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: AXIS_INK }} label={yAxisLabel('Average %')} />
                              <Tooltip formatter={(v) => `${v ?? 0}%`} cursor={{ fill: '#f6f8fa' }} />
                              <Bar dataKey="Average %" radius={[4, 4, 0, 0]} maxBarSize={56}>
                                <Cell fill={C_IN} />
                                <Cell fill={C_OUT} />
                                <LabelList dataKey="Average %" position="top" fontSize={12} fill={AXIS_INK} formatter={(v: unknown) => (Number(v) > 0 ? `${v}%` : '')} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-center">
                              <div className="text-2xl font-black text-green-700">{report.inSide.avg}%</div>
                              <div className="text-[10px] uppercase tracking-wide text-green-700 font-bold">In Center Avg</div>
                              <div className="text-xs text-neutral-500 mt-1">{report.inSide.count} appeared</div>
                            </div>
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                              <div className="text-2xl font-black text-blue-700">{report.outSide.avg}%</div>
                              <div className="text-[10px] uppercase tracking-wide text-blue-700 font-bold">Out Center Avg</div>
                              <div className="text-xs text-neutral-500 mt-1">{report.outSide.count} appeared</div>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* student-wise table */}
                      <Card className="border-none shadow-sm">
                        <h3 className="font-bold text-neutral-900 mb-4">Student-wise Result</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-neutral-50">
                              <tr className="text-left text-neutral-600 border-b border-neutral-200">
                                <th className="py-2.5 px-3 font-medium">Student</th>
                                <th className="py-2.5 px-3 font-medium text-center">Type</th>
                                <th className="py-2.5 px-3 font-medium text-center">Marks</th>
                                <th className="py-2.5 px-3 font-medium text-center">%</th>
                                <th className="py-2.5 px-3 font-medium text-center">Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.rows.map((r, i) => (
                                <tr key={r.s.studentId} className={`border-b border-neutral-100 ${i % 2 ? 'bg-neutral-50/50' : ''}`}>
                                  <td className="py-2.5 px-3">
                                    <div className="font-medium text-neutral-900">{r.s.fullName}</div>
                                    <div className="text-xs text-neutral-500">{r.s.batch}</div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">{kindBadge(r.s.kind)}</td>
                                  <td className="py-2.5 px-3 text-center text-neutral-700">
                                    {r.absent ? (
                                      <span className="text-red-600 font-bold text-xs">ABSENT</span>
                                    ) : r.score != null ? (
                                      `${r.score} / ${reportExam.totalMarks}`
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-neutral-700">
                                    {r.pct != null ? `${Math.round(r.pct)}%` : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {r.grade ? (
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black border ${GRADE_BADGE[r.grade]}`}>
                                        {r.grade}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </PageWrapper>
  );
};

export default DigitalExamsPage;
