import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import { Eye, Edit2, Trash2, Plus, X, Search } from 'lucide-react';
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
import { listCenters } from '../services/centers.service';
import {
  listSwayamStudents,
  createSwayamStudent,
  updateSwayamStudent,
  deleteSwayamStudent,
  type SwayamStudent,
  type SwayamStudentPayload,
  type SwayamLocation,
} from '../services/swayam.service';
import type { CenterSummary } from '../types';

// Same colour system as the rest of the app.
const CAT_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const C_IN = '#008300';
const C_OUT = '#eb6834';
const AXIS_INK = '#6b7280';
const GRID_INK = '#eef1f4';
const CHART_MARGIN = { top: 12, right: 16, bottom: 28, left: 8 };
const hideZero = (v: unknown) => (Number(v) > 0 ? String(v) : '');

const STD_CHOICES = ['11th', '12th', 'Other'];
const STREAM_CHOICES = ['Science', 'Commerce', 'Arts', 'Other'];
const OUT_CENTER_NAME = 'Out of Center';

type Tab = 'dashboard' | 'add' | 'students';

export const SwayamPanel: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');

  const [students, setStudents] = useState<SwayamStudent[]>([]);
  const [programName, setProgramName] = useState('Swayam 2');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [centers, setCenters] = useState<CenterSummary[]>([]);

  // form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [stdChoice, setStdChoice] = useState('11th');
  const [stdCustom, setStdCustom] = useState('');
  const [prevMarks, setPrevMarks] = useState('');
  const [prevSchool, setPrevSchool] = useState('');
  const [phone, setPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [gender, setGender] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [streamChoice, setStreamChoice] = useState('');
  const [streamCustom, setStreamCustom] = useState('');
  const [locationType, setLocationType] = useState<SwayamLocation>('in');
  const [centerId, setCenterId] = useState('');
  const [area, setArea] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // list state
  const [search, setSearch] = useState('');
  const [viewStudent, setViewStudent] = useState<SwayamStudent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSwayamStudents();
      setStudents(res.students || []);
      setProgramName(res.programName || 'Swayam 2');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load Swayam students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    listCenters()
      .then((res) =>
        setCenters(
          (Array.isArray(res) ? res : []).filter(
            (c: CenterSummary) => (c.name || '').toLowerCase() !== OUT_CENTER_NAME.toLowerCase(),
          ),
        ),
      )
      .catch(console.error);
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setFullName('');
    setAge('');
    setStdChoice('11th');
    setStdCustom('');
    setPrevMarks('');
    setPrevSchool('');
    setPhone('');
    setGuardianName('');
    setGender('');
    setAadhar('');
    setStreamChoice('');
    setStreamCustom('');
    setLocationType('in');
    setCenterId('');
    setArea('');
    setFormError(null);
  };

  const startEdit = (s: SwayamStudent) => {
    setEditingId(s.id);
    setFullName(s.fullName);
    setAge(s.age != null ? String(s.age) : '');
    if (s.standard === '11th' || s.standard === '12th') {
      setStdChoice(s.standard);
      setStdCustom('');
    } else {
      setStdChoice('Other');
      setStdCustom(s.standard);
    }
    const match = STREAM_CHOICES.find(
      (x) => x !== 'Other' && x.toLowerCase() === (s.stream || '').toLowerCase(),
    );
    if (match) {
      setStreamChoice(match);
      setStreamCustom('');
    } else if (s.stream) {
      setStreamChoice('Other');
      setStreamCustom(s.stream);
    } else {
      setStreamChoice('');
      setStreamCustom('');
    }
    setPrevMarks(s.prevMarks || '');
    setPrevSchool(s.collegeName || '');
    setPhone(s.phone || '');
    setGuardianName(s.guardianName || '');
    setGender(s.gender || '');
    setAadhar(s.aadharNumber || '');
    setLocationType(s.locationType);
    setCenterId(s.locationType === 'in' ? s.centerId : '');
    setArea(s.area || '');
    setFormError(null);
    setFormSuccess(null);
    setTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (s: SwayamStudent) => {
    if (!window.confirm(`Delete ${s.fullName}? Student list ani reports madhun nighel.`)) return;
    try {
      await deleteSwayamStudent(s.id);
      setFormSuccess('Student deleted ✅');
      if (editingId === s.id) resetForm();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Delete failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const currentStd = stdChoice === 'Other' ? stdCustom.trim() : stdChoice;
    const stream = streamChoice === 'Other' ? streamCustom.trim() : streamChoice;
    const ageNum = Number(age);

    if (fullName.trim().length < 2) return setFormError('Full name is required.');
    if (!Number.isFinite(ageNum) || ageNum < 3 || ageNum > 60) return setFormError('Valid age is required (3–60).');
    if (!currentStd) return setFormError('Current std / course is required (Other → type the course name).');
    if (streamChoice === 'Other' && !stream) return setFormError('Stream madhe "Other" nivadla — course/stream type kara.');
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) return setFormError('Phone number must be exactly 10 digits.');
    if (aadhar.trim() && !/^\d{12}$/.test(aadhar.trim())) return setFormError('Aadhar number must be exactly 12 digits.');
    if (locationType === 'in' && !centerId) return setFormError('Please select a center.');
    if (locationType === 'out' && !area.trim()) return setFormError('Out center nivadla — area name takaych.');

    const payload: SwayamStudentPayload = {
      fullName: fullName.trim(),
      age: ageNum,
      currentStd,
      prevMarks: prevMarks.trim(),
      prevSchool: prevSchool.trim(),
      phone: phone.trim(),
      guardianName: guardianName.trim(),
      gender,
      aadharNumber: aadhar.trim(),
      stream,
      locationType,
      centerId: locationType === 'in' ? centerId : undefined,
      area: locationType === 'out' ? area.trim() : undefined,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateSwayamStudent(editingId, payload);
        setFormSuccess('Student updated ✅');
      } else {
        await createSwayamStudent(payload);
        setFormSuccess('Student added ✅ (enrollment date auto-saved)');
      }
      resetForm();
      await load();
      setTab('students');
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---- dashboard stats ------------------------------------------------
  const stats = useMemo(() => {
    const total = students.length;
    let c11 = 0,
      c12 = 0,
      other = 0,
      inC = 0,
      outC = 0;
    const byStd = new Map<string, number>();
    const byStream = new Map<string, number>();
    const byYear = new Map<string, number>();
    for (const s of students) {
      const std = s.standard || '—';
      byStd.set(std, (byStd.get(std) ?? 0) + 1);
      if (std === '11th') c11++;
      else if (std === '12th') c12++;
      else other++;
      const st = s.stream || '—';
      byStream.set(st, (byStream.get(st) ?? 0) + 1);
      if (s.locationType === 'out') outC++;
      else inC++;
      const y = s.enrollmentDate ? String(new Date(s.enrollmentDate).getFullYear()) : '—';
      byYear.set(y, (byYear.get(y) ?? 0) + 1);
    }
    const stdRank = (v: string) => (v === '11th' ? 0 : v === '12th' ? 1 : 2);
    const stdData = Array.from(byStd.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => stdRank(a.name) - stdRank(b.name) || a.name.localeCompare(b.name));
    const streamData = Array.from(byStream.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const yearData = Array.from(byYear.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { total, c11, c12, other, inC, outC, stdData, streamData, yearData };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.collegeName || '').toLowerCase().includes(q) ||
        (s.standard || '').toLowerCase().includes(q) ||
        (s.stream || '').toLowerCase().includes(q),
    );
  }, [students, search]);

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

  return (
    <PageWrapper
      title={`${programName} — Coordinator Panel`}
      actions={
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setFormSuccess(null); setTab('add'); }}>
          <Plus size={16} className="mr-1" /> Add Student
        </Button>
      }
    >
      {/* View details modal */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setViewStudent(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">{viewStudent.fullName}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">{programName} student — full details</p>
              </div>
              <button
                onClick={() => setViewStudent(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ['Age', viewStudent.age != null ? `${viewStudent.age} yrs` : '—'],
                ['Gender', viewStudent.gender ? viewStudent.gender.charAt(0).toUpperCase() + viewStudent.gender.slice(1) : '—'],
                ['Aadhar No', viewStudent.aadharNumber || '—'],
                ['Current Std / Course', viewStudent.standard || '—'],
                ['Stream', viewStudent.stream || '—'],
                ['Previous Marks / %', viewStudent.prevMarks || '—'],
                ['School / College', viewStudent.collegeName || '—'],
                ['Phone No', viewStudent.phone || '—'],
                ['Guardian Name', viewStudent.guardianName || '—'],
                [
                  'Location',
                  viewStudent.locationType === 'out'
                    ? `Out of Center — ${viewStudent.area || '—'}`
                    : `In Center — ${viewStudent.centerName || '—'}`,
                ],
                [
                  'Enrollment Date',
                  viewStudent.enrollmentDate ? new Date(viewStudent.enrollmentDate).toLocaleDateString() : '—',
                ],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">{k}</div>
                  <div className="font-medium text-neutral-900 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 py-3 border-t border-neutral-100 bg-neutral-50">
              <Button variant="secondary" size="sm" onClick={() => { const s = viewStudent; setViewStudent(null); if (s) startEdit(s); }}>
                <Edit2 size={14} className="mr-1" /> Edit
              </Button>
              <Button variant="primary" size="sm" onClick={() => setViewStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(
          [
            ['dashboard', 'Dashboard'],
            ['add', editingId ? 'Edit Student' : 'Add Student'],
            ['students', `Students (${students.length})`],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-brand-50 text-brand-800 border border-brand-200 shadow-sm'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}
      {formSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {formSuccess}
        </div>
      )}

      {loading && students.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* ------------------------------ DASHBOARD ------------------------------ */}
          {tab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {tile('Total Students', stats.total)}
                {tile('11th Std', stats.c11, CAT_COLORS[0])}
                {tile('12th Std', stats.c12, CAT_COLORS[1])}
                {tile('Other Courses', stats.other, CAT_COLORS[6])}
                {tile('In Center', stats.inC, C_IN)}
                {tile('Out of Center', stats.outC, C_OUT)}
              </div>

              <Card className="border-none shadow-sm">
                <h3 className="font-bold text-neutral-900 mb-1">Students by Std / Course</h3>
                <p className="text-xs text-neutral-500 mb-3">11th, 12th ani course-wise student count</p>
                {stats.stdData.length === 0 ? (
                  <EmptyState title="No students yet" description="Add Student form madhun pahila student add kara." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.stdData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: AXIS_INK }}
                        tickLine={false}
                        label={{ value: 'Std / Course', position: 'insideBottom', offset: -12, fill: AXIS_INK, fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: AXIS_INK }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Students', angle: -90, position: 'insideLeft', fill: AXIS_INK, fontSize: 12 }}
                      />
                      <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: '#f6f8fa' }} />
                      <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]} maxBarSize={64}>
                        {stats.stdData.map((_, i) => (
                          <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                        ))}
                        <LabelList dataKey="count" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm">
                  <h3 className="font-bold text-neutral-900 mb-1">Students by Stream</h3>
                  <p className="text-xs text-neutral-500 mb-3">Science / Commerce / Arts / other courses</p>
                  {stats.streamData.length === 0 ? (
                    <EmptyState title="No data" />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={stats.streamData} margin={CHART_MARGIN}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: AXIS_INK }}
                          tickLine={false}
                          label={{ value: 'Stream', position: 'insideBottom', offset: -12, fill: AXIS_INK, fontSize: 12 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: AXIS_INK }}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'Students', angle: -90, position: 'insideLeft', fill: AXIS_INK, fontSize: 12 }}
                        />
                        <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: '#f6f8fa' }} />
                        <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]} maxBarSize={56}>
                          {stats.streamData.map((_, i) => (
                            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                          ))}
                          <LabelList dataKey="count" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <h3 className="font-bold text-neutral-900 mb-1">Enrollment by Year</h3>
                  <p className="text-xs text-neutral-500 mb-3">Kontya varshi kiti students add zale</p>
                  {stats.yearData.length === 0 ? (
                    <EmptyState title="No data" />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={stats.yearData} margin={CHART_MARGIN}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: AXIS_INK }}
                          tickLine={false}
                          label={{ value: 'Year', position: 'insideBottom', offset: -12, fill: AXIS_INK, fontSize: 12 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: AXIS_INK }}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'Students', angle: -90, position: 'insideLeft', fill: AXIS_INK, fontSize: 12 }}
                        />
                        <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: '#f6f8fa' }} />
                        <Bar dataKey="count" name="Students" fill={CAT_COLORS[2]} radius={[4, 4, 0, 0]} maxBarSize={56}>
                          <LabelList dataKey="count" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ------------------------------ ADD / EDIT FORM ------------------------------ */}
          {tab === 'add' && (
            <Card className="mb-6">
              <h2 className="text-lg font-semibold mb-1">
                {editingId ? 'Edit Student' : 'Register New Student (11th / 12th / Course)'}
              </h2>
              <p className="text-xs text-neutral-500 mb-4">
                Enrollment date automatic save hoto. * fields required ahet.
              </p>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Student full name" required />
                </div>
                <div>
                  <label className={labelCls}>Age *</label>
                  <input className={inputCls} type="number" min={3} max={60} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 16" required />
                </div>

                <div>
                  <label className={labelCls}>Gender</label>
                  <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select gender…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Aadhar Card Number</label>
                  <input className={inputCls} value={aadhar} onChange={(e) => setAadhar(e.target.value)} placeholder="12-digit Aadhar number" />
                </div>

                <div>
                  <label className={labelCls}>Current Std *</label>
                  <select className={inputCls} value={stdChoice} onChange={(e) => setStdChoice(e.target.value)}>
                    {STD_CHOICES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {stdChoice === 'Other' ? (
                  <div>
                    <label className={labelCls}>Course Name *</label>
                    <input className={inputCls} value={stdCustom} onChange={(e) => setStdCustom(e.target.value)} placeholder="e.g. ITI, Diploma, D.Ed" />
                  </div>
                ) : (
                  <div>
                    <label className={labelCls}>Previous Year Marks / %</label>
                    <input className={inputCls} value={prevMarks} onChange={(e) => setPrevMarks(e.target.value)} placeholder="e.g. 78% or 390/500" />
                  </div>
                )}
                {stdChoice === 'Other' && (
                  <div>
                    <label className={labelCls}>Previous Year Marks / %</label>
                    <input className={inputCls} value={prevMarks} onChange={(e) => setPrevMarks(e.target.value)} placeholder="e.g. 78% or 390/500" />
                  </div>
                )}

                <div>
                  <label className={labelCls}>School / College Name</label>
                  <input className={inputCls} value={prevSchool} onChange={(e) => setPrevSchool(e.target.value)} placeholder="Current school / college name" />
                </div>
                <div>
                  <label className={labelCls}>Phone No</label>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone number" />
                </div>
                <div>
                  <label className={labelCls}>Guardian Name</label>
                  <input className={inputCls} value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Parent / guardian name" />
                </div>

                <div>
                  <label className={labelCls}>Stream</label>
                  <select className={inputCls} value={streamChoice} onChange={(e) => setStreamChoice(e.target.value)}>
                    <option value="">Select stream…</option>
                    {STREAM_CHOICES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {streamChoice === 'Other' && (
                  <div>
                    <label className={labelCls}>Stream / Course Type *</label>
                    <input className={inputCls} value={streamCustom} onChange={(e) => setStreamCustom(e.target.value)} placeholder="Type exactly what it is" />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className={labelCls}>In Center / Out Center *</label>
                  <div className="flex gap-2 mb-3">
                    {(
                      [
                        ['in', 'In Center'],
                        ['out', 'Out Center'],
                      ] as Array<[SwayamLocation, string]>
                    ).map(([val, lbl]) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setLocationType(val)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                          locationType === val
                            ? val === 'in'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  {locationType === 'in' ? (
                    <div>
                      <label className={labelCls}>Select Center *</label>
                      <select className={inputCls} value={centerId} onChange={(e) => setCenterId(e.target.value)}>
                        <option value="">Select center…</option>
                        {centers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className={labelCls}>Area Name *</label>
                      <input className={inputCls} value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Bhim Nagar, Kamla Nagar…" />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  {editingId && (
                    <Button variant="secondary" type="button" onClick={() => { resetForm(); setTab('students'); }}>
                      Cancel Edit
                    </Button>
                  )}
                  <Button variant="primary" type="submit" isLoading={saving}>
                    {editingId ? 'Update Student' : 'Submit'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ------------------------------ STUDENTS LIST ------------------------------ */}
          {tab === 'students' && (
            <Card className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="relative w-full md:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-neutral-400" />
                  </div>
                  <input
                    className="block w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Search name / school / std / stream…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span className="text-sm text-neutral-500">
                  {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                </span>
              </div>

              {filteredStudents.length === 0 ? (
                <EmptyState
                  title="No students found"
                  description="Add Student form madhun 11th/12th student add kara."
                  action={
                    <Button variant="primary" onClick={() => { resetForm(); setTab('add'); }}>
                      <Plus size={16} className="mr-1" /> Add Student
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                      <tr className="text-left text-neutral-600 border-b border-neutral-200">
                        <th className="py-2.5 px-3 font-medium">Student</th>
                        <th className="py-2.5 px-3 font-medium text-center">Std / Course</th>
                        <th className="py-2.5 px-3 font-medium text-center">Stream</th>
                        <th className="py-2.5 px-3 font-medium">School / College</th>
                        <th className="py-2.5 px-3 font-medium">Center / Area</th>
                        <th className="py-2.5 px-3 font-medium text-center">Enrolled</th>
                        <th className="py-2.5 px-3 font-medium text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, i) => (
                        <tr key={s.id} className={`border-b border-neutral-100 hover:bg-neutral-50 ${i % 2 ? 'bg-neutral-50/50' : ''}`}>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-neutral-900">{s.fullName}</div>
                            <div className="text-xs text-neutral-500">
                              {s.age != null ? `${s.age} yrs` : ''}
                              {s.gender ? ` · ${s.gender === 'male' ? 'M' : s.gender === 'female' ? 'F' : 'O'}` : ''}
                              {s.phone ? ` · ${s.phone}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100">
                              {s.standard || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-neutral-700">{s.stream || '—'}</td>
                          <td className="py-2.5 px-3 text-neutral-700">{s.collegeName || '—'}</td>
                          <td className="py-2.5 px-3">
                            {s.locationType === 'out' ? (
                              <span className="text-orange-600 font-medium">Out · {s.area || '—'}</span>
                            ) : (
                              <span className="text-neutral-700">{s.centerName || '—'}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-neutral-500">
                            {s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" className="px-2" title="View full details" onClick={() => setViewStudent(s)}>
                                <Eye size={16} />
                              </Button>
                              <Button variant="ghost" size="sm" className="px-2" title="Edit" onClick={() => startEdit(s)}>
                                <Edit2 size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-2 text-danger hover:bg-danger/10"
                                title="Delete"
                                onClick={() => void handleDelete(s)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </PageWrapper>
  );
};

export default SwayamPanel;
