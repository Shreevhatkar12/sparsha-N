import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Legend,
} from 'recharts';
import { listCenters } from '../services/centers.service';
import {
  listSwayamStudents,
  createSwayamStudent,
  updateSwayamStudent,
  deleteSwayamStudent,
  listDropouts,
  listSponsorships,
  type SwayamStudent,
  type SwayamStudentPayload,
  type SwayamLocation,
  type DropoutStudent,
  type DropoutListResponse,
  type SponsorshipListResponse,
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

// Academic year runs June–May: Aug 2026 → "2026-27".
const ayLabel = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
const currentAcademicYear = () => {
  const d = new Date();
  const y = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
  return ayLabel(y);
};
const ACADEMIC_YEARS = (() => {
  const d = new Date();
  const cur = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
  const list: string[] = [];
  for (let y = cur + 1; y >= 2020; y--) list.push(ayLabel(y));
  return list;
})();

type Category = '11th' | '12th' | 'Other Course' | 'Dropout' | 'Re-enrolled';
const CATEGORY_FILTERS: Category[] = ['11th', '12th', 'Other Course', 'Dropout', 'Re-enrolled'];
const CATEGORY_STYLE: Record<Category, string> = {
  '11th': 'bg-brand-50 text-brand-700 border-brand-100',
  '12th': 'bg-blue-50 text-blue-700 border-blue-100',
  'Other Course': 'bg-violet-50 text-violet-700 border-violet-100',
  Dropout: 'bg-red-50 text-red-700 border-red-100',
  'Re-enrolled': 'bg-green-50 text-green-700 border-green-100',
};

type ListRow = {
  key: string;
  kind: 'swayam' | 'dropout' | 'reenrolled';
  category: Category;
  s?: SwayamStudent;
  d?: DropoutStudent;
};

const genderShort = (g: string) => (g === 'male' ? 'M' : g === 'female' ? 'F' : g ? 'O' : '');

export const SwayamPanel: React.FC<{ mode?: 'dashboard' | 'students' }> = ({ mode = 'students' }) => {
  const navigate = useNavigate();

  const [students, setStudents] = useState<SwayamStudent[]>([]);
  const [programName, setProgramName] = useState('Swayam 2');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [centers, setCenters] = useState<CenterSummary[]>([]);
  const [dropoutData, setDropoutData] = useState<DropoutListResponse | null>(null);
  const [sponsorData, setSponsorData] = useState<SponsorshipListResponse | null>(null);

  // form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [stdChoice, setStdChoice] = useState('11th');
  const [stdCustom, setStdCustom] = useState('');
  const [acadYear, setAcadYear] = useState(currentAcademicYear());
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
  const [catFilters, setCatFilters] = useState<Category[]>([]);
  const [viewStudent, setViewStudent] = useState<SwayamStudent | null>(null);
  const [viewDrop, setViewDrop] = useState<DropoutStudent | null>(null);

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

  const loadDropouts = useCallback(async () => {
    try {
      const res = await listDropouts();
      setDropoutData(res);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    void loadDropouts();
    listSponsorships().then(setSponsorData).catch(console.error);
  }, [loadDropouts]);

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
    setAcadYear(currentAcademicYear());
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

  const openAddForm = () => {
    resetForm();
    setFormSuccess(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setAcadYear(s.academicYear || currentAcademicYear());
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
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (s: SwayamStudent) => {
    if (!window.confirm(`Delete ${s.fullName}? Student list ani reports madhun nighel.`)) return;
    try {
      await deleteSwayamStudent(s.id);
      setFormSuccess('Student deleted ✅');
      if (editingId === s.id) {
        resetForm();
        setShowForm(false);
      }
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
    if (!gender) return setFormError('Gender select kara (Male / Female / Other) — required.');
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
      academicYear: acadYear,
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
      setShowForm(false);
      await load();
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
      outC = 0,
      male = 0,
      female = 0;
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
      if (s.gender === 'male') male++;
      else if (s.gender === 'female') female++;
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
    return { total, c11, c12, other, inC, outC, male, female, stdData, streamData, yearData };
  }, [students]);

  // Dropout & re-enrolled counts by year for the dashboard overview chart.
  const dropYearData = useMemo(() => {
    const drops = dropoutData?.dropouts ?? [];
    const res = dropoutData?.reenrolled ?? [];
    const map = new Map<string, { d: number; r: number }>();
    const bump = (year: number | null, key: 'd' | 'r') => {
      if (year == null) return;
      const k = String(year);
      const cur = map.get(k) ?? { d: 0, r: 0 };
      cur[key]++;
      map.set(k, cur);
    };
    for (const d of drops) bump(d.dropoutYear, 'd');
    for (const r of res) {
      bump(r.dropoutYear, 'd');
      bump(r.reenrollYear, 'r');
    }
    return Array.from(map.entries())
      .map(([year, v]) => ({ year, Dropout: v.d, 'Re-enrolled': v.r }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [dropoutData]);

  // Sponsorship vs Scholarship — pending/done split for the dashboard chart.
  const sponsorChartData = useMemo(() => {
    if (!sponsorData) return [];
    const count = (rows: Array<{ supportType: string }>, t: string) =>
      rows.filter((x) => x.supportType === t).length;
    return [
      {
        name: 'Sponsorship',
        Pending: count(sponsorData.pending, 'sponsorship'),
        Done: count(sponsorData.done, 'sponsorship'),
      },
      {
        name: 'Scholarship',
        Pending: count(sponsorData.pending, 'scholarship'),
        Done: count(sponsorData.done, 'scholarship'),
      },
    ];
  }, [sponsorData]);

  // ---- combined student list (swayam + dropout + re-enrolled) --------
  const filteredRows = useMemo(() => {
    const rows: ListRow[] = [];
    for (const s of students) {
      rows.push({
        key: `s-${s.id}`,
        kind: 'swayam',
        category: s.standard === '11th' ? '11th' : s.standard === '12th' ? '12th' : 'Other Course',
        s,
      });
    }
    for (const d of dropoutData?.dropouts ?? []) {
      rows.push({ key: `d-${d.id}`, kind: 'dropout', category: 'Dropout', d });
    }
    for (const d of dropoutData?.reenrolled ?? []) {
      rows.push({ key: `r-${d.id}`, kind: 'reenrolled', category: 'Re-enrolled', d });
    }

    const active = catFilters.length ? rows.filter((r) => catFilters.includes(r.category)) : rows;

    const q = search.trim().toLowerCase();
    if (!q) return active;
    return active.filter((r) => {
      const hay = r.s
        ? [r.s.fullName, r.s.collegeName, r.s.standard, r.s.academicYear, r.s.stream, r.s.centerName, r.s.area]
        : r.d
          ? [r.d.fullName, r.d.dropoutStd, r.d.reenrollSchool, r.d.animatorName, r.d.centerName, r.d.area]
          : [];
      return hay.some((x) => (x || '').toLowerCase().includes(q));
    });
  }, [students, dropoutData, catFilters, search]);

  const toggleCat = (c: Category) => {
    setCatFilters((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
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

  const isDropView = viewDrop ? viewDrop.reenrollSchool !== '' || viewDrop.reenrollYear != null : false;

  return (
    <PageWrapper
      title={mode === 'dashboard' ? `${programName} — Dashboard` : `${programName} — Students`}
      actions={
        mode === 'students' ? (
          <Button variant="primary" size="sm" onClick={openAddForm}>
            <Plus size={16} className="mr-1" /> Add Student
          </Button>
        ) : undefined
      }
    >
      {/* Swayam student details modal */}
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
                ['Year (Academic)', viewStudent.academicYear || '—'],
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

      {/* Dropout / re-enrolled details modal */}
      {viewDrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setViewDrop(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">{viewDrop.fullName}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isDropView ? 'Re-enrolled student — full details' : 'Dropout student — full details'}
                </p>
              </div>
              <button
                onClick={() => setViewDrop(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ['Age', viewDrop.age != null ? `${viewDrop.age} yrs` : '—'],
                ['Gender', viewDrop.gender ? viewDrop.gender.charAt(0).toUpperCase() + viewDrop.gender.slice(1) : '—'],
                ['Phone No', viewDrop.phone || '—'],
                ['Aadhar No', viewDrop.aadharNumber || '—'],
                ['Dropout Std', viewDrop.dropoutStd || '—'],
                ['Dropout Year', viewDrop.dropoutYear != null ? String(viewDrop.dropoutYear) : '—'],
                ['Animator', viewDrop.animatorName || '—'],
                [
                  'Location',
                  viewDrop.locationType === 'out'
                    ? `Out of Center — ${viewDrop.area || '—'}`
                    : `In Center — ${viewDrop.centerName || '—'}`,
                ],
                ['Reason', viewDrop.reason || '—'],
                ...(isDropView
                  ? ([
                      ['Re-enrolled School/College', viewDrop.reenrollSchool || '—'],
                      ['Re-enrolled Year', viewDrop.reenrollYear != null ? String(viewDrop.reenrollYear) : '—'],
                      ['Re-enrolled Std', viewDrop.reenrollStd || '—'],
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
              <Button variant="secondary" size="sm" onClick={() => { setViewDrop(null); navigate('/swayam/dropout'); }}>
                Manage in Dropout Info
              </Button>
              <Button variant="primary" size="sm" onClick={() => setViewDrop(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
      ) : mode === 'dashboard' ? (
        /* ------------------------------ DASHBOARD ------------------------------ */
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-full bg-brand-500" />
            <h2 className="text-lg font-black text-neutral-900">Swayam 2 Students — Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tile('Total Students', stats.total)}
            {tile('11th Std', stats.c11, CAT_COLORS[0])}
            {tile('12th Std', stats.c12, CAT_COLORS[1])}
            {tile('Other Courses', stats.other, CAT_COLORS[6])}
            {tile('In Center', stats.inC, C_IN)}
            {tile('Out of Center', stats.outC, C_OUT)}
            {tile('Male', stats.male, '#2a78d6')}
            {tile('Female', stats.female, '#e87ba4')}
          </div>

          <Card className="border-none shadow-sm">
            <h3 className="font-bold text-neutral-900 mb-1">Students by Std / Course</h3>
            <p className="text-xs text-neutral-500 mb-3">11th, 12th ani course-wise student count</p>
            {stats.stdData.length === 0 ? (
              <EmptyState title="No students yet" description="Swayam Panel madhun pahila student add kara." />
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

          {/* ---- Dropout Tracking overview ---- */}
          <div className="flex items-center gap-2 mt-2">
            <span className="h-6 w-1.5 rounded-full bg-red-500" />
            <h2 className="text-lg font-black text-neutral-900">Dropout Tracking — Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {tile(
              'Total Tracked',
              (dropoutData?.counts.dropouts ?? 0) + (dropoutData?.counts.reenrolled ?? 0),
            )}
            {tile('Total Dropout', dropoutData?.counts.dropouts ?? 0, '#e34948')}
            {tile('Dropout In Center', dropoutData?.counts.dropoutIn ?? 0, C_IN)}
            {tile('Dropout Out of Center', dropoutData?.counts.dropoutOut ?? 0, C_OUT)}
            {tile('Re-enrolled', dropoutData?.counts.reenrolled ?? 0, '#008300')}
          </div>

          <Card className="border-none shadow-sm">
            <h3 className="font-bold text-neutral-900 mb-1">Dropout vs Re-enrolled (year-wise)</h3>
            <p className="text-xs text-neutral-500 mb-3">Kontya varshi kiti dropout zale ani kiti re-enrolled zale</p>
            {dropYearData.length === 0 ? (
              <EmptyState
                title="No dropout data yet"
                description="Dropout Info page varun record add kelyavar ithe graph disel."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dropYearData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: AXIS_INK }}
                    tickLine={false}
                    label={{ value: 'Year', position: 'insideBottom', offset: -12, fill: AXIS_INK, fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: AXIS_INK }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Children', angle: -90, position: 'insideLeft', fill: AXIS_INK, fontSize: 12 }}
                  />
                  <Tooltip cursor={{ fill: '#f6f8fa' }} />
                  <Legend />
                  <Bar dataKey="Dropout" fill="#e34948" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="Dropout" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                  </Bar>
                  <Bar dataKey="Re-enrolled" fill="#008300" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="Re-enrolled" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* ---- Sponsorship / Scholarship overview ---- */}
          <div className="flex items-center gap-2 mt-2">
            <span className="h-6 w-1.5 rounded-full bg-violet-500" />
            <h2 className="text-lg font-black text-neutral-900">Sponsorship / Scholarship — Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tile('Total Students', sponsorData?.counts.total ?? 0)}
            {tile('Pending', sponsorData?.counts.pending ?? 0, '#eda100')}
            {tile('Done', sponsorData?.counts.done ?? 0, '#008300')}
            {tile('Sponsorship', sponsorData?.counts.sponsorship ?? 0, '#2a78d6')}
            {tile('Scholarship', sponsorData?.counts.scholarship ?? 0, '#4a3aa7')}
            {tile('Male', sponsorData?.counts.male ?? 0, '#2a78d6')}
            {tile('Female', sponsorData?.counts.female ?? 0, '#e87ba4')}
          </div>

          <Card className="border-none shadow-sm">
            <h3 className="font-bold text-neutral-900 mb-1">Sponsorship vs Scholarship (pending / done)</h3>
            <p className="text-xs text-neutral-500 mb-3">
              Kiti students na support chi garaj ahe ani kiti na milala te type-wise.
            </p>
            {(sponsorData?.counts.total ?? 0) === 0 ? (
              <EmptyState
                title="No sponsorship data yet"
                description="Sponsorship section madhun pahila student add kara."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sponsorChartData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_INK} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS_INK }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_INK }} />
                  <Tooltip formatter={(v) => `${v ?? 0} students`} cursor={{ fill: '#f6f8fa' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Pending" fill="#eda100" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="Pending" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                  </Bar>
                  <Bar dataKey="Done" fill="#008300" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    <LabelList dataKey="Done" position="top" fontSize={12} fill={AXIS_INK} formatter={hideZero} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      ) : (
        /* ------------------------------ STUDENTS ------------------------------ */
        <div className="flex flex-col gap-4">
          {/* Add / Edit form */}
          {showForm && (
            <Card className="border-none shadow-sm">
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
                  <label className={labelCls}>Gender *</label>
                  <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)} required>
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
                <div>
                  <label className={labelCls}>Year (Academic) *</label>
                  <select className={inputCls} value={acadYear} onChange={(e) => setAcadYear(e.target.value)}>
                    {ACADEMIC_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
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

          {/* Filters + list */}
          <Card className="border-none shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-neutral-400" />
                </div>
                <input
                  className="block w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Search by name / school / std…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="text-sm text-neutral-500">
                {filteredRows.length} student{filteredRows.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* category multi-select chips */}
            <div className="flex flex-wrap gap-2 items-center mb-4">
              <span className="text-xs font-semibold text-neutral-500 uppercase mr-1">Filter:</span>
              <button
                type="button"
                onClick={() => setCatFilters([])}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  catFilters.length === 0
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
                }`}
              >
                All
              </button>
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCat(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    catFilters.includes(c)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {filteredRows.length === 0 ? (
              <EmptyState
                title="No students found"
                description="Filter badla kimva Add Student madhun navin student add kara."
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
                      <th className="py-2.5 px-3 font-medium text-center">Category</th>
                      <th className="py-2.5 px-3 font-medium text-center">Std / Course</th>
                      <th className="py-2.5 px-3 font-medium">School / College</th>
                      <th className="py-2.5 px-3 font-medium">Center / Area</th>
                      <th className="py-2.5 px-3 font-medium text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, i) => {
                      const name = r.s?.fullName ?? r.d?.fullName ?? '';
                      const ageV = r.s?.age ?? r.d?.age ?? null;
                      const gen = r.s?.gender ?? r.d?.gender ?? '';
                      const ph = r.s?.phone ?? r.d?.phone ?? '';
                      const stdText = r.s
                        ? r.s.standard || '—'
                        : r.kind === 'reenrolled'
                          ? r.d?.reenrollStd || '—'
                          : r.d?.dropoutStd || '—';
                      const school = r.s
                        ? r.s.collegeName || '—'
                        : r.kind === 'reenrolled'
                          ? r.d?.reenrollSchool || '—'
                          : '—';
                      const isOut = (r.s?.locationType ?? r.d?.locationType) === 'out';
                      const centerTxt = isOut
                        ? `Out · ${r.s?.area ?? r.d?.area ?? '—'}`
                        : r.s?.centerName ?? r.d?.centerName ?? '—';
                      return (
                        <tr key={r.key} className={`border-b border-neutral-100 hover:bg-neutral-50 ${i % 2 ? 'bg-neutral-50/50' : ''}`}>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-neutral-900">{name}</div>
                            <div className="text-xs text-neutral-500">
                              {ageV != null ? `${ageV} yrs` : ''}
                              {gen ? ` · ${genderShort(gen)}` : ''}
                              {ph ? ` · ${ph}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${CATEGORY_STYLE[r.category]}`}>
                              {r.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-neutral-700">
                            <div>{stdText}</div>
                            {r.s?.academicYear ? (
                              <div className="text-[11px] text-neutral-500">{r.s.academicYear}</div>
                            ) : null}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-700">{school}</td>
                          <td className="py-2.5 px-3">
                            {isOut ? (
                              <span className="text-orange-600 font-medium">{centerTxt}</span>
                            ) : (
                              <span className="text-neutral-700">{centerTxt}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              {r.s ? (
                                <>
                                  <Button variant="ghost" size="sm" className="px-2" title="View full details" onClick={() => setViewStudent(r.s!)}>
                                    <Eye size={16} />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="px-2" title="Edit" onClick={() => startEdit(r.s!)}>
                                    <Edit2 size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 text-danger hover:bg-danger/10"
                                    title="Delete"
                                    onClick={() => void handleDelete(r.s!)}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="sm" className="px-2" title="View full details" onClick={() => setViewDrop(r.d!)}>
                                    <Eye size={16} />
                                  </Button>
                                  <Button variant="secondary" size="sm" className="text-xs" onClick={() => navigate('/swayam/dropout')}>
                                    Manage
                                  </Button>
                                </>
                              )}
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
        </div>
      )}
    </PageWrapper>
  );
};

export default SwayamPanel;
