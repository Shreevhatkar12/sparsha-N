import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Eye, Edit2, Trash2, Plus, X, Search } from 'lucide-react';
import {
  listDigitalStudents,
  createDigitalStudent,
  updateDigitalStudent,
  deleteDigitalStudent,
  getDigitalMeta,
  getDigitalStandards,
  getDigitalPickStudents,
  type DigitalRow,
  type DigitalListResponse,
  type DigitalMeta,
  type DigitalPickStudent,
  type DigitalKind,
} from '../services/digital.service';

const KIND_STYLE: Record<DigitalKind, string> = {
  in: 'bg-green-50 text-green-700 border-green-100',
  out: 'bg-blue-50 text-blue-700 border-blue-100',
};
const KIND_LABEL: Record<DigitalKind, string> = { in: 'In Center', out: 'Out Center' };

const genderShort = (g: string) => (g === 'male' ? 'M' : g === 'female' ? 'F' : g ? 'O' : '');
const genderFull = (g: string) => (g ? g.charAt(0).toUpperCase() + g.slice(1) : '—');

// Digital Literacy (computer class) students:
//  • In Center  — existing app student linked by SAME id (no duplicate).
//  • Out Center — brand-new student id, auto-counted in admin totals.
export const DigitalStudentsPage: React.FC = () => {
  const [data, setData] = useState<DigitalListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | DigitalKind>('');

  // form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DigitalRow | null>(null);
  const [mode, setMode] = useState<DigitalKind>('in');
  const [batch, setBatch] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // in-center cascade
  const [meta, setMeta] = useState<DigitalMeta | null>(null);
  const [programId, setProgramId] = useState('');
  const [centerId, setCenterId] = useState('');
  const [standards, setStandards] = useState<string[]>([]);
  const [standard, setStandard] = useState('');
  const [pickList, setPickList] = useState<DigitalPickStudent[]>([]);
  const [pickId, setPickId] = useState('');

  // out-center fields
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [contact, setContact] = useState('');
  const [stdCourse, setStdCourse] = useState('');
  const [age, setAge] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [area, setArea] = useState('');

  const [viewRow, setViewRow] = useState<DigitalRow | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await listDigitalStudents());
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load Digital Literacy students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    getDigitalMeta().then(setMeta).catch(console.error);
  }, [load]);

  // cascade: program+center → standards
  useEffect(() => {
    setStandards([]);
    setStandard('');
    setPickList([]);
    setPickId('');
    if (programId && centerId) {
      getDigitalStandards(programId, centerId)
        .then((r) => setStandards(r.standards))
        .catch(console.error);
    }
  }, [programId, centerId]);

  // cascade: standard → students
  useEffect(() => {
    setPickList([]);
    setPickId('');
    if (programId && centerId && standard) {
      getDigitalPickStudents(programId, centerId, standard)
        .then((r) => setPickList(r.students))
        .catch(console.error);
    }
  }, [programId, centerId, standard]);

  const counts = data?.counts ?? { total: 0, inC: 0, outC: 0, male: 0, female: 0 };
  const batches = data?.batches ?? [];

  const visibleRows = useMemo(() => {
    let rows = data?.students ?? [];
    if (kindFilter) rows = rows.filter((r) => r.kind === kindFilter);
    if (batchFilter) rows = rows.filter((r) => (r.batch || '') === batchFilter);
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.fullName, r.batch, r.stdCourse, r.centerName, r.programName, r.area, r.phone]
        .some((x) => (x || '').toLowerCase().includes(q)),
    );
  }, [data, kindFilter, batchFilter, search]);

  const selectedPick = pickList.find((p) => p.id === pickId) || null;

  const resetForm = () => {
    setEditing(null);
    setMode('in');
    setBatch('');
    setProgramId('');
    setCenterId('');
    setStandard('');
    setStandards([]);
    setPickList([]);
    setPickId('');
    setFullName('');
    setGender('');
    setContact('');
    setStdCourse('');
    setAge('');
    setAadhar('');
    setArea('');
    setFormError(null);
  };

  const openAddForm = () => {
    resetForm();
    setFormSuccess(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = (r: DigitalRow) => {
    resetForm();
    setEditing(r);
    setMode(r.kind);
    setBatch(r.batch || '');
    if (r.kind === 'out') {
      setFullName(r.fullName);
      setGender(r.gender || '');
      setContact(r.phone || '');
      setStdCourse(r.stdCourse || '');
      setAge(r.age != null ? String(r.age) : '');
      setAadhar(r.aadharNumber || '');
      setArea(r.area || '');
    }
    setFormSuccess(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!batch.trim()) return setFormError('Batch no is required (e.g. Batch 1).');

    try {
      setSaving(true);
      if (mode === 'in') {
        if (!editing && !pickId) {
          setSaving(false);
          return setFormError('Student select kara (Program → Center → Std → Student).');
        }
        if (editing) {
          await updateDigitalStudent(editing.id, { mode: 'in', studentId: editing.studentId, batch: batch.trim() });
          setFormSuccess('Batch updated ✅');
        } else {
          await createDigitalStudent({ mode: 'in', studentId: pickId, batch: batch.trim() });
          setFormSuccess('Existing student Digital Literacy madhe add zala ✅ (same id — no duplicate)');
        }
      } else {
        const ageNum = Number(age);
        if (fullName.trim().length < 2) {
          setSaving(false);
          return setFormError('Full name is required.');
        }
        if (!Number.isFinite(ageNum) || ageNum < 3 || ageNum > 80) {
          setSaving(false);
          return setFormError('Valid age is required (3–80).');
        }
        if (!stdCourse.trim()) {
          setSaving(false);
          return setFormError('Std / course name is required.');
        }
        if (contact.trim() && !/^\d{10}$/.test(contact.trim())) {
          setSaving(false);
          return setFormError('Contact number must be exactly 10 digits.');
        }
        if (aadhar.trim() && !/^\d{12}$/.test(aadhar.trim())) {
          setSaving(false);
          return setFormError('Aadhar number must be exactly 12 digits.');
        }
        const payload = {
          mode: 'out' as const,
          fullName: fullName.trim(),
          age: ageNum,
          gender,
          contact: contact.trim(),
          stdCourse: stdCourse.trim(),
          aadharNumber: aadhar.trim(),
          area: area.trim(),
          batch: batch.trim(),
        };
        if (editing) {
          await updateDigitalStudent(editing.id, payload);
          setFormSuccess('Student updated ✅');
        } else {
          await createDigitalStudent(payload);
          setFormSuccess('New out-center student added ✅ (admin total madhe count hoil)');
        }
      }
      resetForm();
      setShowForm(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: DigitalRow) => {
    const msg =
      r.kind === 'in'
        ? `${r.fullName} la Digital Literacy list madhun kadhaych? (Original student record safe rahil.)`
        : `Delete ${r.fullName}? List ani reports madhun nighel.`;
    if (!window.confirm(msg)) return;
    try {
      await deleteDigitalStudent(r.id, r.kind);
      setFormSuccess('Removed ✅');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Delete failed.');
    }
  };

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

  const chipCls = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
      active
        ? 'bg-brand-500 text-white border-brand-500'
        : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
    }`;

  return (
    <PageWrapper
      title="Digital Literacy — Students"
      actions={
        <Button variant="primary" size="sm" onClick={openAddForm}>
          <Plus size={16} className="mr-1" /> Add Student
        </Button>
      }
    >
      {/* detail modal */}
      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setViewRow(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">{viewRow.fullName}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Digital Literacy — {KIND_LABEL[viewRow.kind]} student
                </p>
              </div>
              <button
                onClick={() => setViewRow(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ['Type', KIND_LABEL[viewRow.kind]],
                ['Batch', viewRow.batch || '—'],
                ['Age', viewRow.age != null ? `${viewRow.age} yrs` : '—'],
                ['Gender', genderFull(viewRow.gender)],
                ['Contact No', viewRow.phone || '—'],
                ['Std / Course', viewRow.stdCourse || '—'],
                ['Aadhar No', viewRow.aadharNumber || '—'],
                ['Program', viewRow.programName || '—'],
                [
                  viewRow.kind === 'out' ? 'Area Name' : 'Center',
                  viewRow.kind === 'out' ? viewRow.area || '—' : viewRow.centerName || '—',
                ],
                ['Added On', viewRow.createdAt ? new Date(viewRow.createdAt).toLocaleDateString() : '—'],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">{k}</div>
                  <div className="font-medium text-neutral-900 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 py-3 border-t border-neutral-100 bg-neutral-50">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const r = viewRow;
                  setViewRow(null);
                  if (r) startEdit(r);
                }}
              >
                <Edit2 size={14} className="mr-1" /> Edit
              </Button>
              <Button variant="primary" size="sm" onClick={() => setViewRow(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>
      )}
      {formSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {formSuccess}
        </div>
      )}

      {loading && !data ? (
        <LoadingSpinner />
      ) : (
        <div className="flex flex-col gap-4">
          {/* overview tiles */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {tile('Total Students', counts.total)}
            {tile('In Center', counts.inC, '#008300')}
            {tile('Out Center', counts.outC, '#2a78d6')}
            {tile('Male', counts.male, '#2a78d6')}
            {tile('Female', counts.female, '#e87ba4')}
          </div>

          {/* add / edit form */}
          {showForm && (
            <Card className="border-none shadow-sm">
              <h2 className="text-lg font-semibold mb-1">
                {editing ? `Edit — ${editing.fullName}` : 'Add Digital Literacy Student'}
              </h2>
              <p className="text-xs text-neutral-500 mb-4">
                In Center = existing student select (same id, duplicate nahi). Out Center = complete new
                student (admin total madhe count hoto).
              </p>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* mode toggle — green In / blue Out */}
              {!editing && (
                <div className="flex gap-2 mb-4">
                  {(
                    [
                      ['in', 'In Center', 'bg-green-600 border-green-600'],
                      ['out', 'Out Center', 'bg-blue-600 border-blue-600'],
                    ] as Array<[DigitalKind, string, string]>
                  ).map(([val, lbl, activeCls]) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setMode(val)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                        mode === val
                          ? `${activeCls} text-white`
                          : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mode === 'in' ? (
                  <>
                    {editing ? (
                      <div className="md:col-span-2 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-900">
                        <b>{editing.fullName}</b> — {editing.stdCourse || '—'} · {editing.programName} ·{' '}
                        {editing.centerName}. (In-center student — fakta batch change karta yeto; original
                        record tyachya program madhe ahe.)
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className={labelCls}>1. Program *</label>
                          <select className={inputCls} value={programId} onChange={(e) => setProgramId(e.target.value)}>
                            <option value="">Select program…</option>
                            {(meta?.programs ?? []).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>2. Center *</label>
                          <select className={inputCls} value={centerId} onChange={(e) => setCenterId(e.target.value)} disabled={!programId}>
                            <option value="">{programId ? 'Select center…' : 'Adhi program select kara'}</option>
                            {(meta?.centers ?? []).map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>3. Std *</label>
                          <select className={inputCls} value={standard} onChange={(e) => setStandard(e.target.value)} disabled={!centerId}>
                            <option value="">
                              {centerId
                                ? standards.length
                                  ? 'Select std…'
                                  : 'Ya program + center madhe students nahit'
                                : 'Adhi center select kara'}
                            </option>
                            {standards.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>4. Student *</label>
                          <select className={inputCls} value={pickId} onChange={(e) => setPickId(e.target.value)} disabled={!standard}>
                            <option value="">{standard ? 'Select student…' : 'Adhi std select kara'}</option>
                            {pickList.map((p) => (
                              <option key={p.id} value={p.id} disabled={p.alreadyAdded}>
                                {p.fullName}
                                {p.gender ? ` (${genderShort(p.gender)})` : ''}
                                {p.alreadyAdded ? ' — already added' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedPick && (
                          <div className="md:col-span-2 p-3 bg-green-50 border border-green-100 rounded-lg text-sm">
                            <div className="font-semibold text-green-900 mb-1">
                              Auto-filled details — {selectedPick.fullName}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-neutral-700">
                              <span><b>Std:</b> {selectedPick.standard || '—'}</span>
                              <span><b>Gender:</b> {genderFull(selectedPick.gender)}</span>
                              <span><b>Phone:</b> {selectedPick.phone || '—'}</span>
                              <span><b>Guardian:</b> {selectedPick.guardianName || '—'}</span>
                            </div>
                            <div className="text-[11px] text-green-700 mt-1.5">
                              ✔ Same student id use hoil — duplicate record create honar nahi.
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className={labelCls}>Full Name *</label>
                      <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Student full name" />
                    </div>
                    <div>
                      <label className={labelCls}>Age *</label>
                      <input className={inputCls} type="number" min={3} max={80} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 16" />
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
                      <label className={labelCls}>Contact No</label>
                      <input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="10-digit contact number" />
                    </div>
                    <div>
                      <label className={labelCls}>Std / Course Name *</label>
                      <input className={inputCls} value={stdCourse} onChange={(e) => setStdCourse(e.target.value)} placeholder="e.g. 9th, MS-CIT, Basic Computer" />
                    </div>
                    <div>
                      <label className={labelCls}>Aadhar Card No</label>
                      <input className={inputCls} value={aadhar} onChange={(e) => setAadhar(e.target.value)} placeholder="12-digit Aadhar (asel tr)" />
                    </div>
                    <div>
                      <label className={labelCls}>Area Name</label>
                      <input className={inputCls} value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Bhim Nagar, Kamla Nagar…" />
                    </div>
                  </>
                )}

                <div>
                  <label className={labelCls}>Batch No *</label>
                  <input className={inputCls} value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. Batch 1" />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <Button variant="secondary" type="button" onClick={() => { resetForm(); setShowForm(false); }}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" isLoading={saving}>
                    {editing ? 'Update' : 'Submit'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* filters + list */}
          <Card className="border-none shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-neutral-400" />
                </div>
                <input
                  className="block w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Search by name / batch / area / center…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="text-sm text-neutral-500">
                {visibleRows.length} student{visibleRows.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 items-center mb-4">
              <span className="text-xs font-semibold text-neutral-500 uppercase mr-1">Filter:</span>
              <button type="button" onClick={() => { setKindFilter(''); setBatchFilter(''); }} className={chipCls(kindFilter === '' && batchFilter === '')}>
                All
              </button>
              <button type="button" onClick={() => setKindFilter(kindFilter === 'in' ? '' : 'in')} className={chipCls(kindFilter === 'in')}>
                In Center
              </button>
              <button type="button" onClick={() => setKindFilter(kindFilter === 'out' ? '' : 'out')} className={chipCls(kindFilter === 'out')}>
                Out Center
              </button>
              {batches.length > 0 && <span className="text-neutral-300">|</span>}
              {batches.map((b) => (
                <button key={b} type="button" onClick={() => setBatchFilter(batchFilter === b ? '' : b)} className={chipCls(batchFilter === b)}>
                  {b}
                </button>
              ))}
            </div>

            {visibleRows.length === 0 ? (
              <EmptyState
                title="No students found"
                description="Add Student madhun in-center kimva out-center student add kara."
                action={
                  <Button variant="primary" onClick={openAddForm}>
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
                      <th className="py-2.5 px-3 font-medium text-center">Type</th>
                      <th className="py-2.5 px-3 font-medium text-center">Batch</th>
                      <th className="py-2.5 px-3 font-medium text-center">Std / Course</th>
                      <th className="py-2.5 px-3 font-medium">Center / Area</th>
                      <th className="py-2.5 px-3 font-medium">Program</th>
                      <th className="py-2.5 px-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r, i) => (
                      <tr key={r.id} className={`border-b border-neutral-100 hover:bg-neutral-50 ${i % 2 ? 'bg-neutral-50/50' : ''}`}>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-neutral-900">{r.fullName}</div>
                          <div className="text-xs text-neutral-500">
                            {r.age != null ? `${r.age} yrs` : ''}
                            {r.gender ? ` · ${genderShort(r.gender)}` : ''}
                            {r.phone ? ` · ${r.phone}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${KIND_STYLE[r.kind]}`}>
                            {KIND_LABEL[r.kind]}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-neutral-700">{r.batch || '—'}</td>
                        <td className="py-2.5 px-3 text-center text-neutral-700">{r.stdCourse || '—'}</td>
                        <td className="py-2.5 px-3 text-neutral-700">
                          {r.kind === 'out' ? (
                            <span className="text-blue-700 font-medium">{r.area || 'Out of Center'}</span>
                          ) : (
                            r.centerName || '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-700">{r.programName || '—'}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="px-2" title="View full details" onClick={() => setViewRow(r)}>
                              <Eye size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" className="px-2" title="Edit" onClick={() => startEdit(r)}>
                              <Edit2 size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2 text-danger hover:bg-danger/10"
                              title={r.kind === 'in' ? 'Remove from Digital Literacy' : 'Delete'}
                              onClick={() => void handleDelete(r)}
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
        </div>
      )}
    </PageWrapper>
  );
};

export default DigitalStudentsPage;
