import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import {
  listSehatCamps,
  createSehatCamp,
  updateSehatCamp,
  deleteSehatCamp,
  getSehatCampRoster,
  type SehatCamp,
  type SehatCounts,
  type SehatRecord,
  type CampRosterResponse,
  type CampAudience,
} from '../services/sehat.service';
import { listCenters, listPrograms } from '../services/centers.service';
import type { CenterSummary, ProgramSummary } from '../types';
import {
  HeartPulse,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Stethoscope,
  Users,
} from 'lucide-react';

const CAMP_TYPES = [
  'General Checkup',
  'ENT Checkup',
  'Special Eye Checkup',
  'Dental Checkup',
  'Blood - Hemoglobin Checkup',
];

type ViewMode = 'list' | 'form' | 'fill';

const ynSelect = (
  value: string | undefined,
  onChange: (v: string) => void,
  danger = true,
) => (
  <select
    className={`w-16 rounded border px-1 py-1 text-xs bg-white ${
      value === 'yes'
        ? danger
          ? 'border-danger-300 text-danger-700 font-semibold'
          : 'border-success-300 text-success-700 font-semibold'
        : 'border-neutral-300 text-neutral-600'
    }`}
    value={value === 'yes' ? 'yes' : 'no'}
    onChange={(e) => onChange(e.target.value)}
  >
    <option value="no">No</option>
    <option value="yes">Yes</option>
  </select>
);

export const SehatCampsPage: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('list');
  const [camps, setCamps] = useState<SehatCamp[]>([]);
  const [counts, setCounts] = useState<SehatCounts | null>(null);
  const [centers, setCenters] = useState<CenterSummary[]>([]);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- create / edit-setup form state ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hospital, setHospital] = useState('');
  const [doctors, setDoctors] = useState<string[]>(['']);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');
  const [area, setArea] = useState('');
  const [selCenters, setSelCenters] = useState<string[]>([]);
  const [selPrograms, setSelPrograms] = useState<string[]>([]);
  const [audience, setAudience] = useState<CampAudience>('student');
  const [campType, setCampType] = useState(CAMP_TYPES[0]);
  const [customType, setCustomType] = useState('');
  const [savingForm, setSavingForm] = useState(false);

  // ---- fill view state ----
  const [roster, setRoster] = useState<CampRosterResponse | null>(null);
  const [records, setRecords] = useState<Record<string, SehatRecord>>({});
  const [stdFilter, setStdFilter] = useState<string[]>([]);
  const [centerFilter, setCenterFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [savingRecords, setSavingRecords] = useState(false);
  const [fillLoading, setFillLoading] = useState(false);

  const resolvedType = campType === '__other__' ? customType.trim() : campType;

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, c, p] = await Promise.all([
        listSehatCamps(),
        listCenters(),
        listPrograms(),
      ]);
      setCamps(res.camps);
      setCounts(res.counts);
      setCenters(c);
      setPrograms(Array.isArray(p) ? p : []);
    } catch {
      setError('Failed to load health camps.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const resetForm = () => {
    setEditingId(null);
    setHospital('');
    setDoctors(['']);
    setDate(new Date().toISOString().slice(0, 10));
    setTime('');
    setArea('');
    setSelCenters([]);
    setSelPrograms([]);
    setAudience('student');
    setCampType(CAMP_TYPES[0]);
    setCustomType('');
  };

  const openCreate = () => {
    resetForm();
    setError(null);
    setMode('form');
  };

  const openEdit = (camp: SehatCamp) => {
    setEditingId(camp.id);
    setHospital(camp.hospital);
    setDoctors(camp.doctors.length ? camp.doctors : ['']);
    setDate(camp.date ? camp.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setTime(camp.time || '');
    setArea(camp.area || '');
    setSelCenters(camp.centerIds);
    setSelPrograms(camp.programIds);
    setAudience(camp.audience === 'parent' ? 'parent' : 'student');
    if (CAMP_TYPES.includes(camp.campType)) {
      setCampType(camp.campType);
      setCustomType('');
    } else {
      setCampType('__other__');
      setCustomType(camp.campType);
    }
    setError(null);
    setMode('form');
  };

  const openFill = async (id: string) => {
    setFillLoading(true);
    setError(null);
    setMode('fill');
    try {
      const res = await getSehatCampRoster(id);
      setRoster(res);
      setRecords(res.records || {});
      setStdFilter([]);
      setCenterFilter([]);
      setSearch('');
    } catch {
      setError('Could not open this health camp.');
      setMode('list');
    } finally {
      setFillLoading(false);
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const docs = doctors.map((d) => d.trim()).filter(Boolean);
    if (!hospital.trim()) return setError('Hospital name is required.');
    if (docs.length === 0) return setError('Add at least one doctor name.');
    if (selCenters.length === 0) return setError('Select at least one center.');
    if (selPrograms.length === 0) return setError('Select at least one program.');
    if (!resolvedType) return setError('Select or type the camp type.');
    setSavingForm(true);
    setError(null);
    try {
      const payload = {
        hospital: hospital.trim(),
        doctors: docs,
        date,
        time: time.trim(),
        area: area.trim(),
        centerIds: selCenters,
        programIds: selPrograms,
        audience,
        campType: resolvedType,
      };
      if (editingId) {
        await updateSehatCamp(editingId, payload);
        await loadList();
        setMode('list');
      } else {
        const res = await createSehatCamp(payload);
        await loadList();
        await openFill(res.id); // go straight to the fill screen
      }
      resetForm();
    } catch {
      setError('Failed to save the health camp. Check the inputs.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async (camp: SehatCamp) => {
    const ok = window.confirm(
      `Delete this ${camp.campType} camp (${camp.date ? camp.date.slice(0, 10) : ''})?\nAll its records will be permanently deleted.`,
    );
    if (!ok) return;
    try {
      await deleteSehatCamp(camp.id);
      await loadList();
    } catch {
      setError('Failed to delete the health camp.');
    }
  };

  // ---- fill helpers ----
  const setRec = (sid: string, patch: Partial<SehatRecord>) => {
    setRecords((prev) => ({ ...prev, [sid]: { ...prev[sid], ...patch } }));
  };

  const saveRecords = async () => {
    if (!roster) return;
    setSavingRecords(true);
    setError(null);
    try {
      await updateSehatCamp(roster.camp.id, { records });
      await loadList();
      await openFill(roster.camp.id);
    } catch {
      setError('Failed to save records.');
    } finally {
      setSavingRecords(false);
    }
  };

  const rosterStandards = useMemo(() => {
    if (!roster) return [];
    const seen: string[] = [];
    for (const s of roster.students) {
      const std = (s.standard || '').trim();
      if (std && !seen.includes(std)) seen.push(std);
    }
    return seen;
  }, [roster]);

  const rosterCenters = useMemo(() => {
    if (!roster) return [] as Array<{ id: string; name: string }>;
    const seen = new Map<string, string>();
    for (const s of roster.students) {
      if (s.center?.id && !seen.has(s.center.id)) seen.set(s.center.id, s.center.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [roster]);

  const visibleStudents = useMemo(() => {
    if (!roster) return [];
    const q = search.trim().toLowerCase();
    return roster.students.filter((s) => {
      if (stdFilter.length && !stdFilter.includes((s.standard || '').trim())) return false;
      if (centerFilter.length && !centerFilter.includes(s.center?.id || '')) return false;
      if (q && !s.fullName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [roster, stdFilter, centerFilter, search]);

  const isParentCamp = roster?.camp.audience === 'parent';
  const fillType = roster?.camp.campType || '';

  // Which columns does this camp type need?
  const typeCols: Array<{ key: string; label: string }> = useMemo(() => {
    if (isParentCamp) {
      return [
        { key: 'height', label: 'Height' },
        { key: 'weight', label: 'Weight' },
        { key: 'age', label: 'Age' },
        { key: 'handgrip', label: 'Handgrip' },
        { key: 'bp', label: 'BP' },
      ];
    }
    switch (fillType) {
      case 'General Checkup':
        return [
          { key: 'height', label: 'Height' },
          { key: 'weight', label: 'Weight' },
          { key: 'eye', label: 'Eye Issue' },
          { key: 'nose', label: 'Nose Issue' },
          { key: 'mouth', label: 'Mouth Issue' },
          { key: 'medicine', label: 'Medicine Given' },
        ];
      case 'ENT Checkup':
        return [
          { key: 'ear', label: 'Ear Issue' },
          { key: 'nose', label: 'Nose Issue' },
          { key: 'throat', label: 'Throat Issue' },
        ];
      case 'Special Eye Checkup':
        return [
          { key: 'rightEye', label: 'Right Eye No.' },
          { key: 'leftEye', label: 'Left Eye No.' },
          { key: 'specs', label: 'Specs Given / Advised' },
        ];
      case 'Dental Checkup':
        return [{ key: 'teeth', label: 'Teeth Problem' }];
      case 'Blood - Hemoglobin Checkup':
        return [
          { key: 'hb', label: 'Hemoglobin Count' },
          { key: 'medicine', label: 'Medicine Given' },
        ];
      default:
        return [
          { key: 'problem', label: 'Problem Found' },
          { key: 'medicine', label: 'Medicine Given' },
        ];
    }
  }, [isParentCamp, fillType]);

  const YN_KEYS = ['eye', 'nose', 'mouth', 'ear', 'throat', 'teeth', 'specs', 'medicine', 'problem'];

  const renderFieldCell = (sid: string, key: string, rec: SehatRecord) => {
    if (key === 'handgrip') {
      return (
        <select
          className="w-24 rounded border border-neutral-300 px-1 py-1 text-xs bg-white"
          value={rec.handgrip || ''}
          onChange={(e) => setRec(sid, { handgrip: e.target.value })}
        >
          <option value="">—</option>
          <option value="issue">Issue</option>
          <option value="normal">Normal</option>
          <option value="strong">Strong</option>
        </select>
      );
    }
    if (YN_KEYS.includes(key)) {
      const positive = key === 'medicine' || key === 'specs';
      return ynSelect(
        (rec as Record<string, string | boolean | undefined>)[key] as string | undefined,
        (v) => setRec(sid, { [key]: v } as Partial<SehatRecord>),
        !positive,
      );
    }
    return (
      <input
        className="w-20 rounded border border-neutral-300 px-2 py-1 text-xs"
        value={((rec as Record<string, string | boolean | undefined>)[key] as string) || ''}
        onChange={(e) => setRec(sid, { [key]: e.target.value } as Partial<SehatRecord>)}
      />
    );
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '');

  // ============================ RENDER ============================

  if (loading && mode === 'list')
    return (
      <PageWrapper title="Sehat — Health Camps">
        <LoadingSpinner />
      </PageWrapper>
    );

  return (
    <PageWrapper title="Sehat — Health Camps">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* ======================= LIST ======================= */}
      {mode === 'list' && (
        <>
          {/* Count tiles */}
          {counts && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'Total Camps', value: counts.totalCamps, cls: 'text-brand-700' },
                { label: 'Student Camps', value: counts.studentCamps, cls: 'text-blue-700' },
                { label: 'Students Participated', value: counts.studentsParticipated, cls: 'text-blue-700' },
                { label: 'Parent Camps', value: counts.parentCamps, cls: 'text-purple-700' },
                { label: 'Parents Participated', value: counts.parentsParticipated, cls: 'text-purple-700' },
              ].map((t) => (
                <div key={t.label} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4 text-center">
                  <p className={`text-2xl font-bold ${t.cls}`}>{t.value}</p>
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500 mt-1">{t.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <HeartPulse size={20} className="text-brand-600" /> Health Camps
            </h2>
            <Button type="button" variant="primary" onClick={openCreate}>
              <Plus size={16} className="mr-1" /> Create Health Camp
            </Button>
          </div>

          {camps.length === 0 ? (
            <EmptyState
              title="No health camps yet"
              description='Click "Create Health Camp" to record your first camp.'
            />
          ) : (
            <div className="space-y-3">
              {camps.map((c) => (
                <Card key={c.id} className="!p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-neutral-900">{c.campType}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                            c.audience === 'parent'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {c.audience === 'parent' ? 'Parents' : 'Students'}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
                          {fmtDate(c.date)}{c.time ? ` · ${c.time}` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 truncate">
                        {c.hospital}
                        {c.doctors.length > 0 && ` · Dr. ${c.doctors.join(', Dr. ')}`}
                        {c.area && ` · ${c.area}`}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(c.centerNames || []).map((n) => (
                          <span key={n} className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                            {n}
                          </span>
                        ))}
                        {(c.programNames || []).map((n) => (
                          <span key={n} className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-50 text-neutral-500 border border-neutral-200">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right mr-2">
                        <p className="text-sm font-bold text-success-600">{c.participated} present</p>
                        <p className="text-[11px] text-neutral-400">{c.absent} absent</p>
                      </div>
                      <Button type="button" variant="secondary" size="sm" onClick={() => void openFill(c.id)} title="Open & fill / view records">
                        <Eye size={14} className="mr-1" /> Open
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(c)} title="Edit camp setup">
                        <Pencil size={14} />
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete(c)} title="Delete camp">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ======================= CREATE / EDIT FORM ======================= */}
      {mode === 'form' && (
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <Stethoscope size={20} className="text-brand-600" />
              {editingId ? 'Edit Health Camp Setup' : 'Create Health Camp'}
            </h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => { resetForm(); setMode('list'); }}>
              Back to list
            </Button>
          </div>

          <form onSubmit={submitForm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Hospital Name *" value={hospital} onChange={(e) => setHospital(e.target.value)} required />
            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">Doctor Name(s) *</label>
              <div className="space-y-2 mt-1.5">
                {doctors.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="flex-1 h-10 rounded-lg border border-neutral-300 px-3 text-sm"
                      value={d}
                      onChange={(e) =>
                        setDoctors((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                      }
                      placeholder={`Doctor ${i + 1} name`}
                    />
                    {doctors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDoctors((prev) => prev.filter((_, j) => j !== i))}
                        className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDoctors((prev) => [...prev, ''])}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800"
                >
                  <Plus size={14} /> Add doctor
                </button>
              </div>
            </div>
            <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <Input label="Area Name" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Bhim Nagar area" />

            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">Camp For *</label>
              <div className="flex gap-2 mt-1.5">
                {(['student', 'parent'] as CampAudience[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAudience(a)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      audience === a
                        ? a === 'parent'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
                    }`}
                  >
                    <Users size={14} className="inline mr-1" />
                    {a === 'parent' ? 'Parents Camp' : 'Students Camp'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">Camp Type *</label>
              <select
                className="mt-1.5 w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm bg-white"
                value={campType}
                onChange={(e) => setCampType(e.target.value)}
              >
                {CAMP_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="__other__">Other (type a name)</option>
              </select>
              {campType === '__other__' && (
                <input
                  className="mt-2 w-full h-10 rounded-lg border border-neutral-300 px-3 text-sm"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="Type the camp name (e.g. Skin Checkup)"
                />
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">
                Centers * (multi-select)
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 border border-neutral-200 p-3 rounded-lg max-h-36 overflow-y-auto">
                {centers.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 text-brand-600"
                      checked={selCenters.includes(c.id)}
                      onChange={() =>
                        setSelCenters((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                        )
                      }
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">
                Programs * (multi-select)
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 border border-neutral-200 p-3 rounded-lg max-h-36 overflow-y-auto">
                {programs.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 text-brand-600"
                      checked={selPrograms.includes(p.id)}
                      onChange={() =>
                        setSelPrograms((prev) =>
                          prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                        )
                      }
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 italic">
                Students of the selected centers + programs will appear in the fill list.
              </p>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" isLoading={savingForm}>
                {editingId ? 'Update Camp Setup' : 'Create Camp & Open Fill Sheet'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ======================= FILL / VIEW ======================= */}
      {mode === 'fill' &&
        (fillLoading || !roster ? (
          <LoadingSpinner />
        ) : (
          <>
            <Card className="mb-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                    <HeartPulse size={20} className="text-brand-600" />
                    {roster.camp.campType}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        isParentCamp
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {isParentCamp ? 'Parents' : 'Students'}
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    {roster.camp.hospital} · Dr. {roster.camp.doctors.join(', Dr. ')} ·{' '}
                    {fmtDate(roster.camp.date)}
                    {roster.camp.time ? ` · ${roster.camp.time}` : ''}
                    {roster.camp.area ? ` · ${roster.camp.area}` : ''}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {(roster.camp.centerNames || []).join(', ')} · {(roster.camp.programNames || []).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setMode('list'); void loadList(); }}>
                    Back to list
                  </Button>
                  <Button type="button" variant="primary" isLoading={savingRecords} onClick={() => void saveRecords()}>
                    Save All Records
                  </Button>
                </div>
              </div>

              {/* Standard filter + search */}
              <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase">Standard:</span>
                <button
                  type="button"
                  onClick={() => setStdFilter([])}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    stdFilter.length === 0
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-neutral-600 border-neutral-300'
                  }`}
                >
                  All
                </button>
                {rosterStandards.map((std) => (
                  <button
                    key={std}
                    type="button"
                    onClick={() =>
                      setStdFilter((prev) =>
                        prev.includes(std) ? prev.filter((x) => x !== std) : [...prev, std],
                      )
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${
                      stdFilter.includes(std)
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-neutral-600 border-neutral-300'
                    }`}
                  >
                    {std}
                  </button>
                ))}
                <input
                  className="ml-auto w-52 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                  placeholder="Search student name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Center filter — same style as the standard filter */}
              {rosterCenters.length > 1 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500 uppercase">Center:</span>
                  <button
                    type="button"
                    onClick={() => setCenterFilter([])}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      centerFilter.length === 0
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-neutral-600 border-neutral-300'
                    }`}
                  >
                    All
                  </button>
                  {rosterCenters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setCenterFilter((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                        )
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        centerFilter.includes(c.id)
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-neutral-600 border-neutral-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="overflow-x-auto">
              <p className="text-sm font-medium text-neutral-700 mb-3">
                {isParentCamp ? 'Parents checkup entry' : 'Students checkup entry'} (
                {visibleStudents.length} of {roster.students.length})
              </p>
              {visibleStudents.length === 0 ? (
                <EmptyState title="No students" description="No students match the selected centers, programs and filters." />
              ) : (
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-neutral-600">
                      <th className="py-2 pr-2 font-medium">Student</th>
                      <th className="py-2 pr-2 font-medium w-14">Std</th>
                      {isParentCamp && <th className="py-2 pr-2 font-medium">Parent Name</th>}
                      <th className="py-2 pr-2 font-medium w-16 text-center">Absent</th>
                      {typeCols.map((col) => (
                        <th key={col.key} className="py-2 pr-2 font-medium">{col.label}</th>
                      ))}
                      <th className="py-2 pr-2 font-medium min-w-[130px]">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((s, idx) => {
                      const rec = records[s.id] || {};
                      const absent = rec.absent === true;
                      return (
                        <tr
                          key={s.id}
                          className={`border-b border-neutral-100 ${idx % 2 === 1 ? 'bg-neutral-50/70' : ''} ${absent ? 'bg-neutral-100/70 opacity-70' : ''}`}
                        >
                          <td className="py-2 pr-2 font-medium text-neutral-900 whitespace-nowrap">
                            {s.fullName}
                            <span className="block text-[10px] text-neutral-400 font-normal">
                              {s.center?.name}
                            </span>
                          </td>
                          <td className="py-2 pr-2 text-xs capitalize">{s.standard || '-'}</td>
                          {isParentCamp && (
                            <td className="py-1 pr-2">
                              {!absent ? (
                                <input
                                  className="w-32 rounded border border-neutral-300 px-2 py-1 text-xs"
                                  value={rec.parentName || ''}
                                  onChange={(e) => setRec(s.id, { parentName: e.target.value })}
                                  placeholder="Mother / Father name"
                                />
                              ) : (
                                <span className="text-xs text-neutral-400">—</span>
                              )}
                            </td>
                          )}
                          <td className="py-1 pr-1 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-brand-600 rounded border-neutral-300"
                              checked={absent}
                              onChange={(e) => setRec(s.id, { absent: e.target.checked })}
                            />
                          </td>
                          {typeCols.map((col) => (
                            <td key={col.key} className="py-1 pr-2">
                              {absent ? (
                                <span className="text-xs text-neutral-400">Absent</span>
                              ) : (
                                renderFieldCell(s.id, col.key, rec)
                              )}
                            </td>
                          ))}
                          <td className="py-1 pr-1">
                            {absent ? (
                              <span className="text-xs text-neutral-400">—</span>
                            ) : (
                              <input
                                className="w-full min-w-[110px] rounded border border-neutral-300 px-2 py-1 text-xs"
                                value={rec.remark || ''}
                                onChange={(e) => setRec(s.id, { remark: e.target.value })}
                                placeholder="Optional"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <p className="text-xs text-neutral-500 mt-3">
                Tick "Absent" for students who did not attend — their fields are hidden.
                Yes/No fields default to No; set Yes only where an issue was found. Click
                "Save All Records" when done.
              </p>
            </Card>
          </>
        ))}
    </PageWrapper>
  );
};
