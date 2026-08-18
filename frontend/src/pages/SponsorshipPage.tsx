import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Eye, Edit2, Trash2, Plus, X, Search, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  listSponsorships,
  createSponsorship,
  updateSponsorship,
  markSponsorshipDone,
  revertSponsorship,
  deleteSwayamStudent,
  type SponsorshipStudent,
  type SponsorshipListResponse,
  type SponsorshipPayload,
  type SupportType,
} from '../services/swayam.service';

const TYPE_STYLE: Record<SupportType, string> = {
  sponsorship: 'bg-blue-50 text-blue-700 border-blue-100',
  scholarship: 'bg-violet-50 text-violet-700 border-violet-100',
};
const TYPE_LABEL: Record<SupportType, string> = {
  sponsorship: 'Sponsorship',
  scholarship: 'Scholarship',
};

const genderShort = (g: string) => (g === 'male' ? 'M' : g === 'female' ? 'F' : g ? 'O' : '');
const genderFull = (g: string) => (g ? g.charAt(0).toUpperCase() + g.slice(1) : '—');

// Sponsorship / Scholarship student tracking for the Swayam coordinator.
// Pending list → "Done" migrates the SAME record to the Done list (and
// "Revert" brings it back) — one identity, never counted twice.
export const SponsorshipPage: React.FC = () => {
  const [data, setData] = useState<SponsorshipListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'done'>('pending');

  // filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | SupportType>('');

  // form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [stream, setStream] = useState('');
  const [stdCourse, setStdCourse] = useState('');
  const [supportType, setSupportType] = useState<SupportType>('sponsorship');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [viewRow, setViewRow] = useState<SponsorshipStudent | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await listSponsorships());
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load sponsorship students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = data?.counts ?? {
    total: 0,
    pending: 0,
    done: 0,
    sponsorship: 0,
    scholarship: 0,
    male: 0,
    female: 0,
  };

  const visibleRows = useMemo(() => {
    const src = tab === 'pending' ? data?.pending ?? [] : data?.done ?? [];
    const byType = typeFilter ? src.filter((r) => r.supportType === typeFilter) : src;
    const q = search.trim().toLowerCase();
    if (!q) return byType;
    return byType.filter((r) =>
      [r.fullName, r.schoolName, r.stdCourse, r.stream, r.area, r.phone]
        .some((x) => (x || '').toLowerCase().includes(q)),
    );
  }, [data, tab, typeFilter, search]);

  const resetForm = () => {
    setEditingId(null);
    setFullName('');
    setAge('');
    setGender('');
    setPhone('');
    setArea('');
    setSchoolName('');
    setStream('');
    setStdCourse('');
    setSupportType('sponsorship');
    setFormError(null);
  };

  const openAddForm = () => {
    resetForm();
    setFormSuccess(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = (r: SponsorshipStudent) => {
    setEditingId(r.id);
    setFullName(r.fullName);
    setAge(r.age != null ? String(r.age) : '');
    setGender(r.gender || '');
    setPhone(r.phone || '');
    setArea(r.area || '');
    setSchoolName(r.schoolName || '');
    setStream(r.stream || '');
    setStdCourse(r.stdCourse || '');
    setSupportType(r.supportType);
    setFormError(null);
    setFormSuccess(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const ageNum = Number(age);
    if (fullName.trim().length < 2) return setFormError('Full name is required.');
    if (!Number.isFinite(ageNum) || ageNum < 3 || ageNum > 60) return setFormError('Valid age is required (3–60).');
    if (!stdCourse.trim()) return setFormError('Std / course is required (e.g. 8th, 10th, B.Com).');
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) return setFormError('Phone number must be exactly 10 digits.');

    const payload: SponsorshipPayload = {
      fullName: fullName.trim(),
      age: ageNum,
      gender,
      phone: phone.trim(),
      area: area.trim(),
      schoolName: schoolName.trim(),
      stream: stream.trim(),
      stdCourse: stdCourse.trim(),
      supportType,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateSponsorship(editingId, payload);
        setFormSuccess('Student updated ✅');
      } else {
        await createSponsorship(payload);
        setFormSuccess('Student added to Pending list ✅');
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

  const handleDone = async (r: SponsorshipStudent) => {
    if (!window.confirm(`${r.fullName} la ${TYPE_LABEL[r.supportType]} milali? Record Done list madhe jail.`)) return;
    try {
      await markSponsorshipDone(r.id);
      setFormSuccess(`${r.fullName} → Done list ✅`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not mark as done.');
    }
  };

  const handleRevert = async (r: SponsorshipStudent) => {
    if (!window.confirm(`${r.fullName} la parat Pending list madhe pathvaych?`)) return;
    try {
      await revertSponsorship(r.id);
      setFormSuccess(`${r.fullName} → Pending list ↩`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not revert.');
    }
  };

  const handleDelete = async (r: SponsorshipStudent) => {
    if (!window.confirm(`Delete ${r.fullName}? List ani reports madhun nighel.`)) return;
    try {
      await deleteSwayamStudent(r.id);
      setFormSuccess('Student deleted ✅');
      if (editingId === r.id) {
        resetForm();
        setShowForm(false);
      }
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
      title="Sponsorship / Scholarship"
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
                  {TYPE_LABEL[viewRow.supportType]} student — full details
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
                ['Age', viewRow.age != null ? `${viewRow.age} yrs` : '—'],
                ['Gender', genderFull(viewRow.gender)],
                ['Mobile No', viewRow.phone || '—'],
                ['Area Name', viewRow.area || '—'],
                ['School / College', viewRow.schoolName || '—'],
                ['Std / Course', viewRow.stdCourse || '—'],
                ['Stream', viewRow.stream || '—'],
                ['Type', TYPE_LABEL[viewRow.supportType]],
                ['Status', viewRow.status === 'done' ? 'Done ✅' : 'Pending ⏳'],
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
            {tile('Pending', counts.pending, '#eda100')}
            {tile('Done', counts.done, '#008300')}
            {tile('Sponsorship', counts.sponsorship, '#2a78d6')}
            {tile('Scholarship', counts.scholarship, '#4a3aa7')}
          </div>

          {/* add / edit form */}
          {showForm && (
            <Card className="border-none shadow-sm">
              <h2 className="text-lg font-semibold mb-1">
                {editingId ? 'Edit Student' : 'Add Student — Need Sponsorship / Scholarship'}
              </h2>
              <p className="text-xs text-neutral-500 mb-4">
                Navin student Pending list madhe add hoto. * fields required ahet.
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
                  <input className={inputCls} type="number" min={3} max={60} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 14" required />
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
                  <label className={labelCls}>Mobile No</label>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
                </div>

                <div>
                  <label className={labelCls}>Area Name</label>
                  <input className={inputCls} value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Bhim Nagar, Kamla Nagar…" />
                </div>

                <div>
                  <label className={labelCls}>School / College Name</label>
                  <input className={inputCls} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="School or college name" />
                </div>
                <div>
                  <label className={labelCls}>Stream</label>
                  <input className={inputCls} value={stream} onChange={(e) => setStream(e.target.value)} placeholder="e.g. Science, Commerce, Arts (asel tr)" />
                </div>

                <div>
                  <label className={labelCls}>Std / Course *</label>
                  <input className={inputCls} value={stdCourse} onChange={(e) => setStdCourse(e.target.value)} placeholder="Std number kimva course name (e.g. 8th, B.Com)" />
                </div>

                <div>
                  <label className={labelCls}>Type — Sponsorship / Scholarship *</label>
                  <select
                    className={inputCls}
                    value={supportType}
                    onChange={(e) => setSupportType(e.target.value === 'scholarship' ? 'scholarship' : 'sponsorship')}
                  >
                    <option value="sponsorship">Sponsorship</option>
                    <option value="scholarship">Scholarship</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <Button variant="secondary" type="button" onClick={() => { resetForm(); setShowForm(false); }}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" isLoading={saving}>
                    {editingId ? 'Update Student' : 'Submit'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* pending / done sub-sections */}
          <Card className="border-none shadow-sm">
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setTab('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  tab === 'pending'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:border-amber-400'
                }`}
              >
                Pending ({counts.pending})
              </button>
              <button
                type="button"
                onClick={() => setTab('done')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  tab === 'done'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:border-green-500'
                }`}
              >
                Done ({counts.done})
              </button>
            </div>

            {/* filters */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-neutral-400" />
                </div>
                <input
                  className="block w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Search by name / school / area…"
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
              <button type="button" onClick={() => setTypeFilter('')} className={chipCls(typeFilter === '')}>
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter(typeFilter === 'sponsorship' ? '' : 'sponsorship')}
                className={chipCls(typeFilter === 'sponsorship')}
              >
                Sponsorship
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter(typeFilter === 'scholarship' ? '' : 'scholarship')}
                className={chipCls(typeFilter === 'scholarship')}
              >
                Scholarship
              </button>
            </div>

            {visibleRows.length === 0 ? (
              <EmptyState
                title={tab === 'pending' ? 'No pending students' : 'No done students yet'}
                description={
                  tab === 'pending'
                    ? 'Add Student madhun sponsorship / scholarship chi garaj aslela student add kara.'
                    : 'Pending list madhlya student la "Done" kel ki to ikde disel.'
                }
                action={
                  tab === 'pending' ? (
                    <Button variant="primary" onClick={openAddForm}>
                      <Plus size={16} className="mr-1" /> Add Student
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr className="text-left text-neutral-600 border-b border-neutral-200">
                      <th className="py-2.5 px-3 font-medium">Student</th>
                      <th className="py-2.5 px-3 font-medium text-center">Type</th>
                      <th className="py-2.5 px-3 font-medium text-center">Std / Course</th>
                      <th className="py-2.5 px-3 font-medium">School / College</th>
                      <th className="py-2.5 px-3 font-medium">Area</th>
                      <th className="py-2.5 px-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`border-b border-neutral-100 hover:bg-neutral-50 ${i % 2 ? 'bg-neutral-50/50' : ''}`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-neutral-900">{r.fullName}</div>
                          <div className="text-xs text-neutral-500">
                            {r.age != null ? `${r.age} yrs` : ''}
                            {r.gender ? ` · ${genderShort(r.gender)}` : ''}
                            {r.phone ? ` · ${r.phone}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${TYPE_STYLE[r.supportType]}`}>
                            {TYPE_LABEL[r.supportType]}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-neutral-700">{r.stdCourse || '—'}</td>
                        <td className="py-2.5 px-3 text-neutral-700">{r.schoolName || '—'}</td>
                        <td className="py-2.5 px-3 text-neutral-700">{r.area || '—'}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <Button variant="ghost" size="sm" className="px-2" title="View full details" onClick={() => setViewRow(r)}>
                              <Eye size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" className="px-2" title="Edit" onClick={() => startEdit(r)}>
                              <Edit2 size={16} />
                            </Button>
                            {tab === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleDone(r)}
                                  title="Sponsorship / scholarship milali — Done list madhe pathva"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
                                >
                                  <CheckCircle2 size={14} /> Done
                                </button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="px-2 text-danger hover:bg-danger/10"
                                  title="Delete"
                                  onClick={() => void handleDelete(r)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleRevert(r)}
                                title="Parat Pending list madhe pathva"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                              >
                                <RotateCcw size={14} /> Revert
                              </button>
                            )}
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

export default SponsorshipPage;
