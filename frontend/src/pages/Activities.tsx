import React, { useEffect, useMemo, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar, Plus, Clock, MapPin, CheckCircle2, Circle, Trash2, X, Users, Eye, UserCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatDate } from '../utils/date';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { listCenters, listPrograms } from '../services/centers.service';
import { getStudents } from '../services/students.service';
import { createAttendanceSession, updateAttendanceSessionRecords } from '../services/attendance.service';
import { usePermission } from '../hooks/usePermission';

interface Activity {
  id: string;
  name: string;
  description: string;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  volunteers: string[];
  center: { id: string; name: string };
  program: { id: string; name: string };
  createdByUser?: { fullName: string } | null;
  updatedByUser?: { fullName: string } | null;
}

type ActivityReport = {
  activity: {
    name: string;
    center?: string;
    program?: string;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
    createdByName?: string | null;
    updatedByName?: string | null;
    volunteers: string[];
  };
  presentCount: number;
  absentCount: number;
  genderBreakdown: Record<string, { present: number; total: number }>;
  stdBreakdown: Array<{ standard: string; present: number; total: number }>;
};

type RosterStudent = { id: string; fullName: string; rollNumber?: string | null };

// "9:00 AM" style display from a 24h "HH:mm" string, for the activity cards.
const formatTime12h = (t?: string | null) => {
  if (!t) return null;
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
};

export const Activities: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [centers, setCenters] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [tab, setTab] = useState<'planned' | 'ongoing' | 'completed'>('ongoing');
  const [saving, setSaving] = useState(false);
  const { currentUser } = useAuthStore();
  const { can } = usePermission();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: formatDate(new Date(), 'yyyy-MM-dd'),
    endDate: formatDate(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    centerId: '',
    programId: '',
  });
  const [volunteerNames, setVolunteerNames] = useState<string[]>([]);
  const [volunteerInput, setVolunteerInput] = useState('');

  // Roster (present/absent) for the selected center + program
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [rosterLoading, setRosterLoading] = useState(false);

  // "View report" modal — present/absent + gender + standard breakdown
  const [reportActivity, setReportActivity] = useState<Activity | null>(null);
  const [report, setReport] = useState<ActivityReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const openReport = async (activity: Activity) => {
    setReportActivity(activity);
    setReport(null);
    setReportLoading(true);
    try {
      const res = await api.get(`/activities/${activity.id}/report`);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load activity report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const canManage = can('create', 'activity');

  // Non-admins only get to plan for centers they're actually assigned to.
  const myCenters = useMemo(() => {
    const isFullAdmin = ['super_admin', 'tech_admin'].includes(currentUser?.role || '');
    if (isFullAdmin) return centers;
    const ids = currentUser?.centerIds || [];
    return centers.filter((c) => ids.includes(c.id));
  }, [centers, currentUser]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/activities');
      setActivities(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [c, p] = await Promise.all([listCenters(), listPrograms()]);
      setCenters(c);
      setPrograms(p);
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  };

  useEffect(() => {
    void fetchActivities();
    void fetchMeta();
  }, []);

  // Whenever center + program are both chosen, pull the student roster so
  // present/absent can be marked right here (defaults to everyone present).
  useEffect(() => {
    const { centerId, programId } = formData;
    if (!centerId || !programId || editingActivity) {
      setRoster([]);
      setPresentIds(new Set());
      return;
    }
    let cancelled = false;
    setRosterLoading(true);
    getStudents({ centerId, programId, limit: 500, isActive: true })
      .then((res) => {
        if (cancelled) return;
        const students = res.students || [];
        setRoster(students);
        setPresentIds(new Set(students.map((s: RosterStudent) => s.id)));
      })
      .catch((err) => console.error('Failed to load student roster:', err))
      .finally(() => !cancelled && setRosterLoading(false));
    return () => {
      cancelled = true;
    };
  }, [formData.centerId, formData.programId, editingActivity]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: formatDate(new Date(), 'yyyy-MM-dd'),
      endDate: formatDate(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      centerId: '',
      programId: '',
    });
    setVolunteerNames([]);
    setVolunteerInput('');
    setRoster([]);
    setPresentIds(new Set());
  };

  const addVolunteerName = () => {
    const name = volunteerInput.trim();
    if (!name) return;
    setVolunteerNames((prev) => [...prev, name]);
    setVolunteerInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.centerId) {
      alert('Please choose a center.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        programId: formData.programId || undefined,
        volunteers: volunteerNames,
        centerIds: [formData.centerId],
      };

      if (editingActivity) {
        await api.put(`/activities/${editingActivity.id}`, payload);
      } else {
        const res = await api.post('/activities', payload);
        const newActivity = Array.isArray(res.data) ? res.data[0] : res.data;

        // Best-effort: turn the present/absent checklist into a real
        // attendance session for this activity's date. If a session for
        // this center/program/date already exists (e.g. taken separately),
        // we just leave attendance as-is rather than fail activity creation.
        if (newActivity?.id && formData.programId && roster.length > 0) {
          try {
            const sessionRes: any = await createAttendanceSession({
              centerId: formData.centerId,
              programId: formData.programId,
              sessionDate: formData.startDate,
              activityId: newActivity.id,
            });
            if (sessionRes?.created && sessionRes?.studentsWithPendingRecords) {
              const records = sessionRes.studentsWithPendingRecords
                .filter((r: any) => r.recordId)
                .map((r: any) => ({
                  recordId: r.recordId,
                  status: presentIds.has(r.student.id) ? 'present' : 'absent',
                }));
              if (records.length > 0) {
                await updateAttendanceSessionRecords(sessionRes.session.id, { records });
              }
            }
          } catch (attErr) {
            console.warn('Activity created, but attendance could not be auto-marked:', attErr);
          }
        }
      }

      setIsModalOpen(false);
      setEditingActivity(null);
      resetForm();
      await fetchActivities();
    } catch (err: any) {
      console.error('Failed to save activity:', err);
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Failed to save activity. Please ensure all fields are correct.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    try {
      setLoading(true);
      await api.delete(`/activities/${id}`);
      await fetchActivities();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to delete activity.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ongoing': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'completed': return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  const tabbedActivities = activities.filter((a) => a.status === tab);

  if (loading) return <PageWrapper title="Activities"><LoadingSpinner /></PageWrapper>;

  return (
    <PageWrapper title="Activities & Events">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Calendar className="text-primary" />
            Program Activities
          </h1>
          <p className="text-neutral-500">Plan and track developmental activities across centers</p>
        </div>
        {canManage && (
          <Button variant="primary" className="flex items-center gap-2" onClick={() => { resetForm(); setEditingActivity(null); setIsModalOpen(true); }}>
            <Plus size={18} />
            Plan New Activity
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <Card className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
               <Calendar size={20} />
            </div>
            <div>
               <p className="text-xs text-neutral-500 font-medium">Total Activities</p>
               <p className="text-xl font-bold text-neutral-900">{activities.length}</p>
            </div>
         </Card>
         <Card className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
               <Clock size={20} />
            </div>
            <div>
               <p className="text-xs text-neutral-500 font-medium">Current (In Progress)</p>
               <p className="text-xl font-bold text-neutral-900">{activities.filter(a => a.status === 'ongoing').length}</p>
            </div>
         </Card>
         <Card className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
               <CheckCircle2 size={20} />
            </div>
            <div>
               <p className="text-xs text-neutral-500 font-medium">Past (Completed)</p>
               <p className="text-xl font-bold text-neutral-900">{activities.filter(a => a.status === 'completed').length}</p>
            </div>
         </Card>
         <Card className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-neutral-50 text-neutral-600 flex items-center justify-center">
               <Circle size={20} />
            </div>
            <div>
               <p className="text-xs text-neutral-500 font-medium">Planned</p>
               <p className="text-xl font-bold text-neutral-900">{activities.filter(a => a.status === 'planned').length}</p>
            </div>
         </Card>
      </div>

      {/* Planned / Current / Past tabs */}
      <div className="flex gap-2 mb-6 border-b border-neutral-200">
        {([
          { key: 'planned', label: 'Planned' },
          { key: 'ongoing', label: 'Current' },
          { key: 'completed', label: 'Past' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-brand-700 text-brand-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t.label} ({activities.filter((a) => a.status === t.key).length})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {tabbedActivities.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center bg-neutral-50/30 border-dashed">
            <Calendar size={48} className="text-neutral-300 mb-4" />
            <h2 className="text-xl font-bold text-neutral-900 mb-2">No activities here</h2>
            <p className="text-neutral-500 max-w-sm">Scheduled workshops and events will appear here.</p>
          </Card>
        ) : (
          tabbedActivities.map(activity => (
            <Card key={activity.id} className="p-6 hover:shadow-md transition-all group">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(activity.status)}`}>
                      {activity.status === 'ongoing' ? 'in progress' : activity.status}
                    </span>
                    {activity.program?.name && (
                      <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                        {activity.program.name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 group-hover:text-primary transition-colors">{activity.name}</h3>
                  <p className="text-neutral-600 mt-2 line-clamp-2 text-sm">{activity.description}</p>

                  <div className="flex flex-wrap items-center gap-6 mt-4">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Clock size={14} className="text-neutral-400" />
                      {formatDate(new Date(activity.startDate), 'MMM d, yyyy')} - {formatDate(new Date(activity.endDate), 'MMM d, yyyy')}
                      {activity.startTime && ` · ${formatTime12h(activity.startTime)}${activity.endTime ? ` - ${formatTime12h(activity.endTime)}` : ''}`}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <MapPin size={14} className="text-neutral-400" />
                      {activity.center?.name}
                    </div>
                    {activity.volunteers?.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Users size={14} className="text-neutral-400" />
                        {activity.volunteers.join(', ')}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <UserCircle2 size={14} className="text-neutral-400" />
                      {activity.updatedByUser?.fullName
                        ? `Last updated by ${activity.updatedByUser.fullName}`
                        : `Created by ${activity.createdByUser?.fullName || 'Unknown'}`}
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col justify-center gap-2 min-w-[160px]">
                  <Button
                    variant="ghost"
                    className="text-xs w-full border border-neutral-100"
                    onClick={() => void openReport(activity)}
                  >
                    <Eye size={14} className="mr-2" /> View Report
                  </Button>
                  {canManage && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        className="text-xs w-full border border-neutral-100"
                        onClick={() => {
                          setEditingActivity(activity);
                          setFormData({
                            name: activity.name,
                            description: activity.description,
                            startDate: activity.startDate.slice(0, 10),
                            endDate: activity.endDate.slice(0, 10),
                            startTime: activity.startTime || '09:00',
                            endTime: activity.endTime || '10:00',
                            centerId: activity.center?.id || '',
                            programId: activity.program?.id || '',
                          });
                          setVolunteerNames(activity.volunteers || []);
                          setIsModalOpen(true);
                        }}
                      >
                        Edit Details
                      </Button>
                      <Button variant="ghost" className="text-xs text-danger border border-danger/20 hover:bg-danger/10 w-full" onClick={() => handleDeleteActivity(activity.id)}>
                        <Trash2 size={16} className="mr-2" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingActivity(null);
          resetForm();
        }}
        title={editingActivity ? "Edit Activity" : "Plan New Activity"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <label className="block text-sm font-medium text-neutral-700 mb-1">Activity Name</label>
             <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="E.g. Summer Camp, Drawing Competition" />
          </div>
          <div>
             <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
             <textarea className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Details about the activity..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
                <Input type="date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
             </div>
             <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
                <Input type="date" required value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
             </div>
             <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Start Time</label>
                <Input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
             </div>
             <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">End Time</label>
                <Input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
             </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
             <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Center</label>
                <div className="flex flex-wrap gap-2 p-3 border border-neutral-300 rounded-lg bg-white">
                  {myCenters.map(c => (
                    <label key={c.id} className={`flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer ${formData.centerId === c.id ? 'bg-brand-700 text-white border-brand-700' : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'}`}>
                      <input
                        type="radio"
                        name="activity-center"
                        className="hidden"
                        checked={formData.centerId === c.id}
                        onChange={() => setFormData(prev => ({ ...prev, centerId: c.id }))}
                        disabled={!!editingActivity}
                      />
                      <span className="text-xs font-medium">{c.name}</span>
                    </label>
                  ))}
                </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Program</label>
                <select className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={formData.programId} onChange={e => setFormData({ ...formData, programId: e.target.value })}>
                   <option value="">— Select a program —</option>
                   {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>
          </div>

          {/* Present / Absent roster — appears once center + program are picked */}
          {!editingActivity && formData.centerId && formData.programId && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Students ({presentIds.size} present of {roster.length})
              </label>
              {rosterLoading ? (
                <div className="text-xs text-neutral-500 p-3">Loading students…</div>
              ) : roster.length === 0 ? (
                <div className="text-xs text-neutral-500 p-3 border border-dashed border-neutral-300 rounded-lg">
                  No students found for this center + program.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-neutral-300 rounded-lg divide-y divide-neutral-100">
                  {roster.map((s) => (
                    <label key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50">
                      <span>{s.fullName}{s.rollNumber ? ` (Roll ${s.rollNumber})` : ''}</span>
                      <input
                        type="checkbox"
                        className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                        checked={presentIds.has(s.id)}
                        onChange={() =>
                          setPresentIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                            return next;
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-neutral-400 mt-1">Checked = present. Uncheck anyone who's absent for this activity's date.</p>
            </div>
          )}

          <div>
             <label className="block text-sm font-medium text-neutral-700 mb-1">Volunteers helping with this activity</label>
             <div className="flex gap-2">
               <Input
                 value={volunteerInput}
                 onChange={e => setVolunteerInput(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVolunteerName(); } }}
                 placeholder="Volunteer name, then Add"
               />
               <Button type="button" variant="secondary" onClick={addVolunteerName}>Add</Button>
             </div>
             {volunteerNames.length > 0 && (
               <div className="flex flex-wrap gap-2 mt-2">
                 {volunteerNames.map((name, idx) => (
                   <span key={`${name}-${idx}`} className="flex items-center gap-1 text-xs bg-neutral-100 border border-neutral-200 rounded-full px-3 py-1">
                     {name}
                     <button type="button" onClick={() => setVolunteerNames((prev) => prev.filter((_, i) => i !== idx))}>
                       <X size={12} />
                     </button>
                   </span>
                 ))}
               </div>
             )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
             <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setEditingActivity(null); resetForm(); }}>Cancel</Button>
             <Button type="submit" variant="primary" isLoading={saving}>
               {editingActivity ? "Save Changes" : "Create Activity"}
             </Button>
          </div>
        </form>
      </Modal>

      {/* View Report modal */}
      <Modal
        isOpen={!!reportActivity}
        onClose={() => { setReportActivity(null); setReport(null); }}
        title={reportActivity ? `Report — ${reportActivity.name}` : 'Report'}
      >
        {reportLoading ? (
          <LoadingSpinner />
        ) : !report ? (
          <p className="text-sm text-neutral-500">Could not load this report.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="text-neutral-600">
              <p><span className="font-medium text-neutral-800">Date:</span> {formatDate(new Date(report.activity.startDate), 'MMM d, yyyy')}
                {report.activity.startTime && ` · ${formatTime12h(report.activity.startTime)}${report.activity.endTime ? ` - ${formatTime12h(report.activity.endTime)}` : ''}`}
              </p>
              <p><span className="font-medium text-neutral-800">Center:</span> {report.activity.center || '—'}{report.activity.program ? ` · ${report.activity.program}` : ''}</p>
              <p><span className="font-medium text-neutral-800">Conducted by:</span> {report.activity.updatedByName || report.activity.createdByName || 'Unknown'}</p>
              {report.activity.volunteers?.length > 0 && (
                <p><span className="font-medium text-neutral-800">Volunteers:</span> {report.activity.volunteers.join(', ')}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-xs text-green-700 font-medium">Present</p>
                <p className="text-2xl font-bold text-green-800">{report.presentCount}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-xs text-red-700 font-medium">Absent</p>
                <p className="text-2xl font-bold text-red-800">{report.absentCount}</p>
              </div>
            </div>

            <div>
              <p className="font-medium text-neutral-800 mb-1">By Gender</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-neutral-200 rounded-lg p-2 text-center">
                  <p className="text-xs text-neutral-500">Male</p>
                  <p className="text-sm font-semibold text-neutral-800">{report.genderBreakdown.male?.present ?? 0} / {report.genderBreakdown.male?.total ?? 0} present</p>
                </div>
                <div className="border border-neutral-200 rounded-lg p-2 text-center">
                  <p className="text-xs text-neutral-500">Female</p>
                  <p className="text-sm font-semibold text-neutral-800">{report.genderBreakdown.female?.present ?? 0} / {report.genderBreakdown.female?.total ?? 0} present</p>
                </div>
              </div>
            </div>

            {report.stdBreakdown.length > 0 && (
              <div>
                <p className="font-medium text-neutral-800 mb-1">By Standard</p>
                <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100">
                  {report.stdBreakdown.map((s) => (
                    <div key={s.standard} className="flex justify-between px-3 py-1.5 text-xs">
                      <span>{s.standard}</span>
                      <span className="font-medium">{s.present} / {s.total} present</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.presentCount === 0 && report.absentCount === 0 && (
              <p className="text-xs text-neutral-400">No attendance was recorded for this activity.</p>
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
};
