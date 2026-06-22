import { useState, useEffect } from "react";
import { listCenters, listPrograms } from "../../services/centers.service";
import api from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";

interface Parent {
  parentName: string;
  gender: "male" | "female";
}

export function ParentMeetingPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = ['super_admin', 'tech_admin', 'center_admin'].includes(currentUser?.role || '');

  const [formData, setFormData] = useState({
    centerId: "", programId: "", standard: "",
    meetingDate: "", meetingTime: "", topic: "", description: "",
  });
  const [parents, setParents] = useState<Parent[]>([{ parentName: "", gender: "female" }]);
  const [centers, setCenters] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) { console.error(err); }
    };
    loadData();
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      const res = await api.get("/meetings/parent");
      setMeetings(res.data?.data || []);
    } catch (err) { console.error(err); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addParent = () => {
    setParents([...parents, { parentName: "", gender: "female" }]);
  };

  const removeParent = (index: number) => {
    setParents(parents.filter((_, i) => i !== index));
  };

  const updateParent = (index: number, field: keyof Parent, value: string) => {
    const updated = [...parents];
    updated[index] = { ...updated[index], [field]: value };
    setParents(updated);
  };

  const maleCount = parents.filter((p) => p.gender === 'male' && p.parentName).length;
  const femaleCount = parents.filter((p) => p.gender === 'female' && p.parentName).length;
  const totalCount = parents.filter((p) => p.parentName).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const validParents = parents.filter((p) => p.parentName.trim());
      const payload = { ...formData, parents: validParents };
      const result = await api.post("/meetings/parent", payload);
      if (result.data?.success || result.data?.data?.id) {
        setSuccess("Parent Meeting Created Successfully ✅");
        setFormData({ centerId: "", programId: "", standard: "", meetingDate: "", meetingTime: "", topic: "", description: "" });
        setParents([{ parentName: "", gender: "female" }]);
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
          <h1 className="text-2xl font-bold text-neutral-800">Parent Meetings</h1>
          <p className="text-neutral-500 mt-1">Manage parent meeting attendance</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
          {showForm ? "Cancel" : "+ New Meeting"}
        </button>
      </div>

      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">{success}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Parent Meeting</h2>
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
              <textarea name="description" rows={2} value={formData.description} onChange={handleChange}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            {/* Parents List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Parent Attendance</h3>
                <div className="flex gap-3 text-xs text-neutral-500">
                  <span>Total: {totalCount}</span>
                  <span className="text-blue-600">Male: {maleCount}</span>
                  <span className="text-pink-600">Female: {femaleCount}</span>
                </div>
              </div>
              <div className="space-y-2">
                {parents.map((parent, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input type="text" value={parent.parentName}
                      onChange={(e) => updateParent(index, 'parentName', e.target.value)}
                      placeholder="Parent full name"
                      className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
                    <select value={parent.gender}
                      onChange={(e) => updateParent(index, 'gender', e.target.value as "male" | "female")}
                      className="border border-neutral-300 rounded-lg px-3 py-2 text-sm">
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                    {parents.length > 1 && (
                      <button type="button" onClick={() => removeParent(index)}
                        className="text-red-500 hover:text-red-700 px-2 py-2 text-lg font-bold">×</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addParent}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium">
                + Add Parent
              </button>
            </div>

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
          <h2 className="font-semibold text-neutral-800">All Parent Meetings</h2>
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
                <th className="py-3 px-4 text-center font-medium text-neutral-600">Parents</th>
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