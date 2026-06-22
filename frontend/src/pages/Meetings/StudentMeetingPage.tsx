import { useState, useEffect } from "react";
import { listCenters, listPrograms } from "../../services/centers.service";
import api from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";

interface Student {
  id: string;
  fullName: string;
  rollNumber?: string;
  gender?: string;
}

export function StudentMeetingPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = ['super_admin', 'tech_admin', 'center_admin'].includes(currentUser?.role || '');

  const [formData, setFormData] = useState({
    centerId: "",
    programId: "",
    standard: "",
    meetingDate: "",
    meetingTime: "",
    topic: "",
    description: "",
  });

  const [centers, setCenters] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Meeting list
  const [meetings, setMeetings] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const centersData = await listCenters();
        let filteredCenters = Array.isArray(centersData) ? centersData : [];
        if (!isAdmin && currentUser?.centerIds?.length) {
          filteredCenters = filteredCenters.filter((c: any) =>
            currentUser.centerIds.includes(c.id)
          );
        }
        setCenters(filteredCenters);
        const programsData = await listPrograms();
        setPrograms(Array.isArray(programsData) ? programsData : []);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      const res = await api.get("/meetings/student");
      setMeetings(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Load students when center + program selected
  useEffect(() => {
    if (!formData.centerId || !formData.programId) {
      setStudents([]);
      setAttendance({});
      return;
    }
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await api.get(`/students?centerId=${formData.centerId}&programId=${formData.programId}&limit=200`);
        const list: Student[] = res.data?.students || res.data?.data || [];
        setStudents(list);
        const att: Record<string, boolean> = {};
        list.forEach((s) => { att[s.id] = true; });
        setAttendance(att);
      } catch (err) {
        console.error(err);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    loadStudents();
  }, [formData.centerId, formData.programId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;
  const boysPresent = students.filter((s) => attendance[s.id] && s.gender === 'male').length;
  const girlsPresent = students.filter((s) => attendance[s.id] && s.gender === 'female').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const attendanceList = students.map((s) => ({
        studentId: s.id,
        isPresent: attendance[s.id] || false,
      }));
      const payload = { ...formData, attendance: attendanceList };
      const result = await api.post("/meetings/student", payload);
      if (result.data?.success || result.data?.data?.id) {
        setSuccess("Meeting Created Successfully ✅");
        setFormData({ centerId: "", programId: "", standard: "", meetingDate: "", meetingTime: "", topic: "", description: "" });
        setStudents([]);
        setAttendance({});
        setShowForm(false);
        loadMeetings();
      } else {
        setError(result.data?.error || "Something went wrong");
      }
    } catch (error: any) {
      setError(error?.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Student Meetings</h1>
          <p className="text-neutral-500 mt-1">Manage student meeting attendance</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
        >
          {showForm ? "Cancel" : "+ New Meeting"}
        </button>
      </div>

      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">{success}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Student Meeting</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Center *</label>
                <select name="centerId" value={formData.centerId} onChange={handleChange} required
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select Center</option>
                  {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Program *</label>
                <select name="programId" value={formData.programId} onChange={handleChange} required
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select Program</option>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Standard *</label>
                <input type="text" name="standard" value={formData.standard} onChange={handleChange} required
                  placeholder="e.g. 8th, 9th, 10th"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Date *</label>
                <input type="date" name="meetingDate" value={formData.meetingDate} onChange={handleChange} required
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Time</label>
                <input type="time" name="meetingTime" value={formData.meetingTime} onChange={handleChange}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Topic *</label>
                <input type="text" name="topic" value={formData.topic} onChange={handleChange} required
                  placeholder="Enter topic..."
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea name="description" rows={3} value={formData.description} onChange={handleChange}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            {/* Student Attendance */}
            {loadingStudents && <p className="text-sm text-neutral-500">Loading students...</p>}
            {students.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Student Attendance</h3>
                  <div className="flex gap-3 text-xs text-neutral-500">
                    <span className="text-green-600 font-medium">Present: {presentCount}</span>
                    <span className="text-red-600 font-medium">Absent: {absentCount}</span>
                    <span>Boys: {boysPresent}</span>
                    <span>Girls: {girlsPresent}</span>
                    <span>Total: {students.length}</span>
                  </div>
                </div>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium text-neutral-600">Student</th>
                        <th className="py-2 px-3 text-left font-medium text-neutral-600">Roll No</th>
                        <th className="py-2 px-3 text-center font-medium text-neutral-600">Present</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                          <td className="py-2 px-3">{s.fullName}</td>
                          <td className="py-2 px-3 text-neutral-500">{s.rollNumber || '—'}</td>
                          <td className="py-2 px-3 text-center">
                            <input type="checkbox" checked={attendance[s.id] || false}
                              onChange={() => toggleAttendance(s.id)}
                              className="w-4 h-4 rounded text-red-600" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium text-sm">
                {loading ? "Creating..." : "Create Meeting"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meetings List */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
        <div className="p-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-800">All Student Meetings</h2>
        </div>
        {meetings.length === 0 ? (
          <div className="p-8 text-center text-neutral-400">No meetings yet. Create one!</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="py-3 px-4 text-left font-medium text-neutral-600">Date</th>
                <th className="py-3 px-4 text-left font-medium text-neutral-600">Center</th>
                <th className="py-3 px-4 text-left font-medium text-neutral-600">Program</th>
                <th className="py-3 px-4 text-left font-medium text-neutral-600">Standard</th>
                <th className="py-3 px-4 text-left font-medium text-neutral-600">Topic</th>
                <th className="py-3 px-4 text-center font-medium text-neutral-600">Students</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="py-2 px-4">{new Date(m.meetingDate).toLocaleDateString()}</td>
                  <td className="py-2 px-4">{m.center?.name || '—'}</td>
                  <td className="py-2 px-4">{m.program?.name || '—'}</td>
                  <td className="py-2 px-4">{m.standard}</td>
                  <td className="py-2 px-4">{m.topic}</td>
                  <td className="py-2 px-4 text-center">{m.attendance?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}