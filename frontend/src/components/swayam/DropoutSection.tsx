import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Eye, Edit2, Trash2, Plus, X, ArrowRightLeft, Undo2 } from 'lucide-react';
import {
  createDropout,
  updateDropout,
  reenrollDropout,
  updateReenrolled,
  revertReenrolled,
  deleteSwayamStudent,
  type DropoutStudent,
  type DropoutListResponse,
  type DropoutPayload,
  type SwayamLocation,
} from '../../services/swayam.service';
import type { CenterSummary } from '../../types';

const C_DROP = '#e34948';
const C_RE = '#008300';
const C_IN = '#2a78d6';
const C_OUT = '#eb6834';

type SubTab = 'drop' | 're';

type Props = {
  data: DropoutListResponse | null;
  loading: boolean;
  centers: CenterSummary[];
  onReload: () => Promise<void> | void;
};

const inputCls =
  'w-full h-11 rounded-lg border border-neutral-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'text-xs uppercase tracking-wide text-neutral-600 font-medium mb-1 block';

const genderShort = (g: string) => (g === 'male' ? 'M' : g === 'female' ? 'F' : g ? 'O' : '');

export const DropoutSection: React.FC<Props> = ({ data, loading, centers, onReload }) => {
  const [subTab, setSubTab] = useState<SubTab>('drop');

  // dropout form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [dropStd, setDropStd] = useState('');
  const [dropYear, setDropYear] = useState('');
  const [animator, setAnimator] = useState('');
  const [reason, setReason] = useState('');
  const [locationType, setLocationType] = useState<SwayamLocation>('in');
  const [centerId, setCenterId] = useState('');
  const [area, setArea] = useState('');

  // re-enroll form state
  const [reTarget, setReTarget] = useState<DropoutStudent | null>(null);
  const [reEditing, setReEditing] = useState<DropoutStudent | null>(null);
  const [reSchool, setReSchool] = useState('');
  const [reYear, setReYear] = useState('');
  const [reStd, setReStd] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<DropoutStudent | null>(null);

  const dropouts = data?.dropouts ?? [];
  const reenrolled = data?.reenrolled ?? [];
  const counts = data?.counts ?? { dropouts: 0, reenrolled: 0, dropoutIn: 0, dropoutOut: 0 };

  const resetDropForm = () => {
    setEditingId(null);
    setFullName('');
    setAge('');
    setGender('');
    setPhone('');
    setAadhar('');
    setDropStd('');
    setDropYear('');
    setAnimator('');
    setReason('');
    setLocationType('in');
    setCenterId('');
    setArea('');
    setError(null);
  };

  const openAddForm = () => {
    resetDropForm();
    setSuccess(null);
    setShowForm(true);
  };

  const startEditDropout = (s: DropoutStudent) => {
    setEditingId(s.id);
    setFullName(s.fullName);
    setAge(s.age != null ? String(s.age) : '');
    setGender(s.gender || '');
    setPhone(s.phone || '');
    setAadhar(s.aadharNumber || '');
    setDropStd(s.dropoutStd || '');
    setDropYear(s.dropoutYear != null ? String(s.dropoutYear) : '');
    setAnimator(s.animatorName || '');
    setReason(s.reason || '');
    setLocationType(s.locationType);
    setCenterId(s.locationType === 'in' ? s.centerId : '');
    setArea(s.area || '');
    setError(null);
    setSuccess(null);
    setShowForm(true);
    setSubTab('drop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitDropout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const ageNum = Number(age);
    const yearNum = Number(dropYear);
    if (fullName.trim().length < 2) return setError('Child full name is required.');
    if (!Number.isFinite(ageNum) || ageNum < 3 || ageNum > 60) return setError('Valid age is required (3–60).');
    if (!gender) return setError('Gender select kara (Male / Female / Other) — required.');
    if (!dropStd.trim()) return setError('Dropout std is required (e.g. 9th).');
    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) return setError('Valid dropout year is required (e.g. 2025).');
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) return setError('Phone must be exactly 10 digits.');
    if (aadhar.trim() && !/^\d{12}$/.test(aadhar.trim())) return setError('Aadhar must be exactly 12 digits.');
    if (locationType === 'in' && !centerId) return setError('Please select a center.');
    if (locationType === 'out' && !area.trim()) return setError('Area name is required for out-center.');

    const payload: DropoutPayload = {
      fullName: fullName.trim(),
      age: ageNum,
      gender,
      phone: phone.trim(),
      aadharNumber: aadhar.trim(),
      dropoutStd: dropStd.trim(),
      dropoutYear: yearNum,
      animatorName: animator.trim(),
      reason: reason.trim(),
      locationType,
      centerId: locationType === 'in' ? centerId : undefined,
      area: locationType === 'out' ? area.trim() : undefined,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDropout(editingId, payload);
        setSuccess('Dropout student updated ✅');
      } else {
        await createDropout(payload);
        setSuccess('Dropout student added ✅');
      }
      resetDropForm();
      setShowForm(false);
      await onReload();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: DropoutStudent) => {
    if (!window.confirm(`Delete ${s.fullName}? List ani counts madhun nighel.`)) return;
    try {
      await deleteSwayamStudent(s.id);
      setSuccess('Deleted ✅');
      await onReload();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Delete failed.');
    }
  };

  const handleBackToDropout = async (s: DropoutStudent) => {
    if (!window.confirm(`${s.fullName} la parat Dropout list madhe pathvaych? (Re-enroll details clear hotil.)`)) return;
    try {
      await revertReenrolled(s.id);
      setSuccess(`${s.fullName} → Dropout list madhe parat gela ↩`);
      await onReload();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Back to dropout failed.');
    }
  };

  const startReenroll = (s: DropoutStudent) => {
    setReTarget(s);
    setReEditing(null);
    setReSchool('');
    setReYear('');
    setReStd('');
    setError(null);
    setSuccess(null);
    setSubTab('re');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditReenroll = (s: DropoutStudent) => {
    setReEditing(s);
    setReTarget(null);
    setReSchool(s.reenrollSchool || '');
    setReYear(s.reenrollYear != null ? String(s.reenrollYear) : '');
    setReStd(s.reenrollStd || '');
    setError(null);
    setSuccess(null);
    setSubTab('re');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelReenroll = () => {
    setReTarget(null);
    setReEditing(null);
    setReSchool('');
    setReYear('');
    setReStd('');
    setError(null);
  };

  const submitReenroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const yearNum = Number(reYear);
    if (reSchool.trim().length < 2) return setError('Re-enrolled school / college name is required.');
    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) return setError('Valid re-enrolled year is required (e.g. 2026).');
    if (!reStd.trim()) return setError('Re-enrolled std is required (e.g. 10th).');

    const body = { school: reSchool.trim(), year: yearNum, std: reStd.trim() };
    setSaving(true);
    try {
      if (reEditing) {
        await updateReenrolled(reEditing.id, body);
        setSuccess('Re-enrolled details updated ✅');
      } else if (reTarget) {
        await reenrollDropout(reTarget.id, body);
        setSuccess(`${reTarget.fullName} re-enrolled ✅ (dropout list madhun migrate zala)`);
      }
      cancelReenroll();
      await onReload();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Save failed. Try again.');
    } finally {
      setSaving(false);
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

  const actionBtns = (s: DropoutStudent, isRe: boolean) => (
    <div className="flex items-center justify-center gap-1">
      <Button variant="ghost" size="sm" className="px-2" title="View full details" onClick={() => setViewRow(s)}>
        <Eye size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="px-2"
        title="Edit"
        onClick={() => (isRe ? startEditReenroll(s) : startEditDropout(s))}
      >
        <Edit2 size={16} />
      </Button>
      {!isRe && (
        <Button
          variant="ghost"
          size="sm"
          className="px-2 text-green-700 hover:bg-green-50"
          title="Re-enroll this child"
          onClick={() => startReenroll(s)}
        >
          <ArrowRightLeft size={16} />
        </Button>
      )}
      {isRe && (
        <button
          type="button"
          onClick={() => void handleBackToDropout(s)}
          title="Back to Dropout — parat dropout list madhe pathva"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          <Undo2 size={14} /> Back to Dropout
        </button>
      )}
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
  );

  if (loading && !data) return <LoadingSpinner />;

  const isReView = viewRow ? viewRow.reenrollSchool !== '' || viewRow.reenrollYear != null : false;

  return (
    <div className="flex flex-col gap-4">
      {/* Details modal */}
      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setViewRow(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">{viewRow.fullName}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isReView ? 'Re-enrolled student — full details' : 'Dropout student — full details'}
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
                ['Gender', viewRow.gender ? viewRow.gender.charAt(0).toUpperCase() + viewRow.gender.slice(1) : '—'],
                ['Phone No', viewRow.phone || '—'],
                ['Aadhar No', viewRow.aadharNumber || '—'],
                ['Dropout Std', viewRow.dropoutStd || '—'],
                ['Dropout Year', viewRow.dropoutYear != null ? String(viewRow.dropoutYear) : '—'],
                ['Animator', viewRow.animatorName || '—'],
                [
                  'Location',
                  viewRow.locationType === 'out'
                    ? `Out of Center — ${viewRow.area || '—'}`
                    : `In Center — ${viewRow.centerName || '—'}`,
                ],
                ['Reason', viewRow.reason || '—'],
                ...(isReView
                  ? ([
                      ['Re-enrolled School/College', viewRow.reenrollSchool || '—'],
                      ['Re-enrolled Year', viewRow.reenrollYear != null ? String(viewRow.reenrollYear) : '—'],
                      ['Re-enrolled Std', viewRow.reenrollStd || '—'],
                    ] as Array<[string, string]>)
                  : []),
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <div className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">{k}</div>
                  <div className="font-medium text-neutral-900 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 py-3 border-t border-neutral-100 bg-neutral-50">
              <Button variant="primary" size="sm" onClick={() => setViewRow(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            subTab === 'drop'
              ? 'bg-red-50 text-red-800 border border-red-200 shadow-sm'
              : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
          }`}
          onClick={() => setSubTab('drop')}
        >
          Dropout Students ({counts.dropouts})
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            subTab === 're'
              ? 'bg-green-50 text-green-800 border border-green-200 shadow-sm'
              : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
          }`}
          onClick={() => setSubTab('re')}
        >
          Re-enrolled ({counts.reenrolled})
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">{success}</div>
      )}

      {/* ------------------------- DROPOUT SUB-TAB ------------------------- */}
      {subTab === 'drop' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tile('Total Dropout', counts.dropouts, C_DROP)}
            {tile('In Center', counts.dropoutIn, C_IN)}
            {tile('Out of Center', counts.dropoutOut, C_OUT)}
            {tile('Re-enrolled', counts.reenrolled, C_RE)}
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => (showForm ? setShowForm(false) : openAddForm())}>
              {showForm ? 'Cancel' : (<><Plus size={16} className="mr-1" /> Add Dropout Student</>)}
            </Button>
          </div>

          {showForm && (
            <Card className="border-none shadow-sm">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Dropout Student' : 'Add Dropout Student'}
              </h3>
              <form onSubmit={submitDropout} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Child Full Name *</label>
                  <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Child full name" required />
                </div>
                <div>
                  <label className={labelCls}>Age *</label>
                  <input className={inputCls} type="number" min={3} max={60} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 15" required />
                </div>
                <div>
                  <label className={labelCls}>Gender *</label>
                  <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)} required>
                    <option value="">Select gender…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Phone No</label>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone number" />
                </div>
                <div>
                  <label className={labelCls}>Dropout Std *</label>
                  <input className={inputCls} value={dropStd} onChange={(e) => setDropStd(e.target.value)} placeholder="e.g. 9th — kontya std la dropout zala" required />
                </div>
                <div>
                  <label className={labelCls}>Dropout Year *</label>
                  <input className={inputCls} type="number" min={2000} max={2100} value={dropYear} onChange={(e) => setDropYear(e.target.value)} placeholder="e.g. 2025" required />
                </div>
                <div>
                  <label className={labelCls}>Aadhar Card Number (optional)</label>
                  <input className={inputCls} value={aadhar} onChange={(e) => setAadhar(e.target.value)} placeholder="12-digit Aadhar number" />
                </div>
                <div>
                  <label className={labelCls}>Animator Name</label>
                  <input className={inputCls} value={animator} onChange={(e) => setAnimator(e.target.value)} placeholder="Kontya animator kadun list ali" />
                </div>

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

                <div className="md:col-span-2">
                  <label className={labelCls}>Reason</label>
                  <textarea
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Dropout hoṇyacha reason…"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={() => { resetDropForm(); setShowForm(false); }}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" isLoading={saving}>
                    {editingId ? 'Update' : 'Submit'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {dropouts.length === 0 ? (
            <EmptyState
              title="No dropout students yet"
              description='"Add Dropout Student" madhun pahila record add kara.'
            />
          ) : (
            <Card className="border-none shadow-sm" noPadding>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr className="text-left text-neutral-600 border-b border-neutral-200">
                      <th className="py-2.5 px-3 font-medium">Child</th>
                      <th className="py-2.5 px-3 font-medium text-center">Dropout Std</th>
                      <th className="py-2.5 px-3 font-medium text-center">Year</th>
                      <th className="py-2.5 px-3 font-medium">Animator</th>
                      <th className="py-2.5 px-3 font-medium">Center / Area</th>
                      <th className="py-2.5 px-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dropouts.map((s, i) => (
                      <tr key={s.id} className={`border-b border-neutral-100 hover:bg-neutral-50 ${i % 2 ? 'bg-neutral-50/50' : ''}`}>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-neutral-900">{s.fullName}</div>
                          <div className="text-xs text-neutral-500">
                            {s.age != null ? `${s.age} yrs` : ''}
                            {s.gender ? ` · ${genderShort(s.gender)}` : ''}
                            {s.phone ? ` · ${s.phone}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                            {s.dropoutStd || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-neutral-700">{s.dropoutYear ?? '—'}</td>
                        <td className="py-2.5 px-3 text-neutral-700">{s.animatorName || '—'}</td>
                        <td className="py-2.5 px-3">
                          {s.locationType === 'out' ? (
                            <span className="text-orange-600 font-medium">Out · {s.area || '—'}</span>
                          ) : (
                            <span className="text-neutral-700">{s.centerName || '—'}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">{actionBtns(s, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ----------------------- RE-ENROLLED SUB-TAB ----------------------- */}
      {subTab === 're' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {tile('Re-enrolled', counts.reenrolled, C_RE)}
            {tile('Still Dropout', counts.dropouts, C_DROP)}
            {tile('Total Tracked', counts.dropouts + counts.reenrolled)}
          </div>

          {/* re-enroll form */}
          {(reTarget || reEditing) ? (
            <Card className="border-none shadow-sm">
              <h3 className="text-lg font-semibold mb-1">
                {reEditing ? `Edit Re-enrolled — ${reEditing.fullName}` : `Re-enroll — ${reTarget?.fullName}`}
              </h3>
              <p className="text-xs text-neutral-500 mb-4">
                {reEditing
                  ? 'Re-enrolled details update kara.'
                  : 'Submit kelyavar ha child dropout list madhun re-enrolled list madhe migrate hoil.'}
              </p>
              <form onSubmit={submitReenroll} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Re-enrolled School / College *</label>
                  <input className={inputCls} value={reSchool} onChange={(e) => setReSchool(e.target.value)} placeholder="School / college name" required />
                </div>
                <div>
                  <label className={labelCls}>Re-enrolled Year *</label>
                  <input className={inputCls} type="number" min={2000} max={2100} value={reYear} onChange={(e) => setReYear(e.target.value)} placeholder="e.g. 2026" required />
                </div>
                <div>
                  <label className={labelCls}>Re-enrolled Std *</label>
                  <input className={inputCls} value={reStd} onChange={(e) => setReStd(e.target.value)} placeholder="e.g. 10th" required />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={cancelReenroll}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" isLoading={saving}>
                    {reEditing ? 'Update' : 'Re-enroll Student'}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="border-none shadow-sm">
              <h3 className="font-semibold text-neutral-900 mb-1">Select dropout student to re-enroll</h3>
              <p className="text-xs text-neutral-500 mb-3">
                Dropout list madhla child school/college madhe parat gela asel tar ithun re-enroll kara.
              </p>
              {dropouts.length === 0 ? (
                <p className="text-sm text-neutral-400">Dropout list rikami ahe — sagli mule re-enrolled ahet 🎉</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {dropouts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-neutral-200 bg-neutral-50">
                      <div>
                        <span className="font-medium text-neutral-900">{s.fullName}</span>
                        <span className="text-xs text-neutral-500 ml-2">
                          {s.dropoutStd || '—'} · {s.dropoutYear ?? '—'}
                        </span>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => startReenroll(s)}>
                        <ArrowRightLeft size={14} className="mr-1" /> Re-enroll
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {reenrolled.length === 0 ? (
            <EmptyState title="No re-enrolled students yet" description="Dropout student re-enroll kela ki ithe disel." />
          ) : (
            <Card className="border-none shadow-sm" noPadding>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr className="text-left text-neutral-600 border-b border-neutral-200">
                      <th className="py-2.5 px-3 font-medium">Child</th>
                      <th className="py-2.5 px-3 font-medium">Re-enrolled School / College</th>
                      <th className="py-2.5 px-3 font-medium text-center">Re-Std</th>
                      <th className="py-2.5 px-3 font-medium text-center">Re-Year</th>
                      <th className="py-2.5 px-3 font-medium text-center">Dropout Std/Year</th>
                      <th className="py-2.5 px-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reenrolled.map((s, i) => (
                      <tr key={s.id} className={`border-b border-neutral-100 hover:bg-neutral-50 ${i % 2 ? 'bg-neutral-50/50' : ''}`}>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-neutral-900">{s.fullName}</div>
                          <div className="text-xs text-neutral-500">
                            {s.age != null ? `${s.age} yrs` : ''}
                            {s.gender ? ` · ${genderShort(s.gender)}` : ''}
                            {s.phone ? ` · ${s.phone}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-neutral-700">{s.reenrollSchool || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                            {s.reenrollStd || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-neutral-700">{s.reenrollYear ?? '—'}</td>
                        <td className="py-2.5 px-3 text-center text-neutral-500">
                          {s.dropoutStd || '—'} · {s.dropoutYear ?? '—'}
                        </td>
                        <td className="py-2.5 px-3">{actionBtns(s, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DropoutSection;
