import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar, Plus, Filter, Search, Clock, MapPin, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

interface Activity {
  id: string;
  name: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  volunteers: string[];
  center: { id: string; name: string };
  program: { id: string; name: string };
}

export const Activities: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [centers, setCenters] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const { currentUser } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'planned',
    centerIds: [] as string[],
    programId: '',
    volunteers: ''
  });

  const [enrollmentModal, setEnrollmentModal] = useState<{ isOpen: boolean; activityId: string | null; activityName: string }>({
    isOpen: false,
    activityId: null,
    activityName: ''
  });
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  useEffect(() => {
    fetchActivities();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/centers'),
        api.get('/programs')
      ]);
      setCenters(cRes.data.centers || []);
      setPrograms(pRes.data || []);
      if (cRes.data.centers?.[0]) setFormData(prev => ({ ...prev, centerIds: [cRes.data.centers[0].id] }));
      if (pRes.data?.[0]) setFormData(prev => ({ ...prev, programId: pRes.data[0].id }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/activities');
      setActivities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        volunteers: formData.volunteers.split(',').map(v => v.trim()).filter(v => v)
      };
      await api.post('/activities', payload);
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'planned',
        centerIds: centers[0]?.id ? [centers[0].id] : [],
        programId: programs[0]?.id || '',
        volunteers: ''
      });
      fetchActivities();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEnrollment = async (activity: Activity) => {
    setEnrollmentModal({ isOpen: true, activityId: activity.id, activityName: activity.name });
    setEnrollmentLoading(true);
    try {
      const [eligibleRes, enrollmentRes] = await Promise.all([
        api.get(`/activities/${activity.id}/eligible-students`),
        api.get(`/activities/${activity.id}/enrollments`)
      ]);
      setEligibleStudents(eligibleRes.data);
      setEnrollments(enrollmentRes.data);
      setSelectedStudentIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleRequestEnrollment = async () => {
    if (!enrollmentModal.activityId || selectedStudentIds.length === 0) return;
    try {
      setEnrollmentLoading(true);
      await api.post(`/activities/${enrollmentModal.activityId}/enrollments/request`, { studentIds: selectedStudentIds });
      // Refresh enrollments
      const res = await api.get(`/activities/${enrollmentModal.activityId}/enrollments`);
      setEnrollments(res.data);
      setSelectedStudentIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleApproveEnrollment = async (studentId: string) => {
    if (!enrollmentModal.activityId) return;
    try {
      setEnrollmentLoading(true);
      await api.put(`/activities/${enrollmentModal.activityId}/enrollments/${studentId}/approve`);
      // Refresh enrollments
      const res = await api.get(`/activities/${enrollmentModal.activityId}/enrollments`);
      setEnrollments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    try {
      setLoading(true);
      await api.delete(`/activities/${id}`);
      await fetchActivities();
    } catch (err) {
      console.error(err);
      alert("Failed to delete activity.");
      setLoading(false);
    }
  };

  const isAdmin = ['super_admin', 'center_admin', 'tech_admin'].includes(currentUser?.role || '');

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
        {isAdmin && (
          <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
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
               <p className="text-xs text-neutral-500 font-medium">In Progress</p>
               <p className="text-xl font-bold text-neutral-900">{activities.filter(a => a.status === 'in_progress').length}</p>
            </div>
         </Card>
         <Card className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
               <CheckCircle2 size={20} />
            </div>
            <div>
               <p className="text-xs text-neutral-500 font-medium">Completed</p>
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

      <div className="space-y-4">
        {activities.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center bg-neutral-50/30 border-dashed">
            <Calendar size={48} className="text-neutral-300 mb-4" />
            <h2 className="text-xl font-bold text-neutral-900 mb-2">No activities found</h2>
            <p className="text-neutral-500 max-w-sm">Scheduled workshops and events will appear here.</p>
          </Card>
        ) : (
          activities.map(activity => (
            <Card key={activity.id} className="p-6 hover:shadow-md transition-all group">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(activity.status)}`}>
                      {activity.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                      {activity.program?.name}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 group-hover:text-primary transition-colors">{activity.name}</h3>
                  <p className="text-neutral-600 mt-2 line-clamp-2 text-sm">{activity.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-6 mt-4">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Clock size={14} className="text-neutral-400" />
                      {format(new Date(activity.startDate), 'MMM d, yyyy')} - {format(new Date(activity.endDate), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <MapPin size={14} className="text-neutral-400" />
                      {activity.center?.name}
                    </div>
                  </div>
                </div>
                
                <div className="flex md:flex-col justify-center gap-2 min-w-[160px]">
                  <Button variant="primary" className="text-xs w-full" onClick={() => handleOpenEnrollment(activity)}>
                    {isAdmin ? 'Manage Enrollments' : 'Enroll Students'}
                  </Button>
                  <Button variant="secondary" className="text-xs w-full" onClick={() => alert("Manage attendance module coming soon")}>Manage Attendance</Button>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button variant="ghost" className="text-xs flex-1 border border-neutral-100" onClick={() => alert("Edit activity module coming soon")}>Edit Details</Button>
                      <Button variant="ghost" className="text-xs text-danger border border-danger/20 hover:bg-danger/10" onClick={() => handleDeleteActivity(activity.id)}>
                        <Trash2 size={16} />
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
        onClose={() => setIsModalOpen(false)}
        title="Plan New Activity"
      >
        <form onSubmit={handleCreate} className="space-y-4">
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
          </div>
          <div className="grid grid-cols-1 gap-4">
             <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Centers</label>
                <div className="flex flex-wrap gap-2 p-3 border border-neutral-300 rounded-lg bg-white">
                  {centers.map(c => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-1 bg-neutral-50 rounded-full border border-neutral-200 cursor-pointer hover:bg-neutral-100">
                      <input 
                        type="checkbox" 
                        checked={formData.centerIds.includes(c.id)} 
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, centerIds: [...prev.centerIds, c.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, centerIds: prev.centerIds.filter(id => id !== c.id) }));
                          }
                        }}
                      />
                      <span className="text-xs font-medium">{c.name}</span>
                    </label>
                  ))}
                </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Program</label>
                <select className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={formData.programId} onChange={e => setFormData({ ...formData, programId: e.target.value })} required>
                   {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>
          </div>
          <div>
             <label className="block text-sm font-medium text-neutral-700 mb-1">Volunteers (Comma separated)</label>
             <Input value={formData.volunteers} onChange={e => setFormData({ ...formData, volunteers: e.target.value })} placeholder="E.g. John Doe, Sarah Smith" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
             <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button type="submit" variant="primary">Create Activity</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={enrollmentModal.isOpen}
        onClose={() => setEnrollmentModal({ ...enrollmentModal, isOpen: false })}
        title={`Enrollments: ${enrollmentModal.activityName}`}
      >
        <div className="space-y-6">
          {enrollmentLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Enrollment List */}
              <div>
                <h4 className="text-sm font-bold text-neutral-900 mb-3 uppercase tracking-wider">Current Enrollments</h4>
                {enrollments.length === 0 ? (
                  <p className="text-sm text-neutral-500 italic">No enrollments yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {enrollments.map(en => (
                      <div key={en.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div>
                          <p className="text-sm font-bold text-neutral-900">{en.student?.fullName}</p>
                          <p className="text-[10px] text-neutral-500">Requested by {en.requestedByUser?.fullName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${en.status === 'approved_by_admin' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                            {en.status === 'approved_by_admin' ? 'Approved' : 'Pending'}
                          </span>
                          {isAdmin && en.status === 'requested_by_teacher' && (
                            <Button variant="primary" size="sm" className="text-[10px] py-1 h-auto" onClick={() => handleApproveEnrollment(en.studentId)}>Approve</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Enrollments */}
              <div>
                <h4 className="text-sm font-bold text-neutral-900 mb-3 uppercase tracking-wider">Request New Enrollment</h4>
                {eligibleStudents.length === 0 ? (
                  <p className="text-sm text-neutral-500 italic">No more eligible students found.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-neutral-200 rounded-lg bg-neutral-50">
                      {eligibleStudents
                        .filter(s => !enrollments.some(en => en.studentId === s.id))
                        .map(student => (
                        <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-white rounded transition-colors cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedStudentIds.includes(student.id)} 
                            onChange={e => {
                              if (e.target.checked) setSelectedStudentIds(prev => [...prev, student.id]);
                              else setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                            }}
                          />
                          <span className="text-xs">{student.fullName}</span>
                        </label>
                      ))}
                    </div>
                    <Button 
                      variant="primary" 
                      className="w-full" 
                      disabled={selectedStudentIds.length === 0 || enrollmentLoading}
                      onClick={handleRequestEnrollment}
                    >
                      Request Enrollment for {selectedStudentIds.length} Student(s)
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="flex justify-end pt-2 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setEnrollmentModal({ ...enrollmentModal, isOpen: false })}>Close</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};
