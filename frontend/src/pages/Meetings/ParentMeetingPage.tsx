import { useState, useEffect } from "react";
import { listCenters, listPrograms } from "../../services/centers.service";
import api from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";

interface Student {
  id: string;
  fullName: string;
  rollNumber?: string;
  gender?: string;
  standard?: string;
  createdById?: string;
  createdByUser?: { id: string; fullName?: string } | null;
}

type ParentType = "Father" | "Mother";
interface AttRec {
  present: boolean;
  parentType: ParentType;
}

const standardsByProgram: Record<string, string[]> = {
  Shiksha: ["Jr KG", "Sr KG"],
  Sanskar: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"],
  Swayam: ["8th", "9th", "10th"],
  "Swayam 2": ["11th", "12th"],
};
const ALL_STDS = ["Jr KG", "Sr KG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const EMPTY_FORM = {
  centerId: "",
  programId: "",
  standard: "",
  meetingDate: "",
  meetingTime: "",
  topic: "",
  description: "",
};

const teacherIdOf = (s: Student) => s.createdById || s.createdByUser?.id || "";

export function ParentMeetingPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = ["super_admin", "tech_admin", "center_admin"].includes(currentUser?.role || "");

  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [teacherId, setTeacherId] = useState("");

  const [centers, setCenters] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [att, setAtt] = useState<Record<string, AttRec>>({});
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedByName, setSavedByName] = useState<Record<string, ParentType> | null>(null);

  const selectedProgram = programs.find((p) => p.id === formData.programId);
  const availableStandards = selectedProgram ? standardsByProgram[selectedProgram.name] || ALL_STDS : ALL_STDS;

  const visibleStudents = students.filter((s) => !teacherId || teacherIdOf(s) === teacherId);
  const presentStudents = visibleStudents.filter((s) => att[s.id]?.present);
  const maleCount = presentStudents.filter((s) => att[s.id]?.parentType === "Father").length;
  const femaleCount = presentStudents.filter((s) => att[s.id]?.parentType === "Mother").length;
  const totalCount = presentStudents.length;

  useEffect(() => {
    const loadData = async () => {
      try {
        const centersData = await listCenters();
        let filteredCenters = Array.isArray(centersData) ? centersData : [];
        if (!isAdmin && currentUser?.centerIds?.length) {
          filteredCenters = filteredCenters.filter((c: any) => currentUser.centerIds.includes(c.id));
        }
        setCenters(filteredCenters);
        const programsData = await listPrograms();
        setPrograms(Array.isArray(programsData) ? programsData : []);
        try {
          const tRes = await api.get("/users", { params: { role: "teacher", limit: 200 } });
          setTeachers(tRes.data?.users || tRes.data?.data || []);
        } catch {
          setTeachers([]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      const res = await api.get("/meetings/parent");
      setMeetings(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!formData.centerId || !formData.programId) {
      setStudents([]);
      setAtt({});
      return;
    }
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const stdParam = selectedStandards.length > 0 ? `&standard=${selectedStandards.join(",")}` : "";
        const res = await api.get(
          `/students?centerId=${formData.centerId}&programId=${formData.programId}${stdParam}&limit=200`,
        );
        const list: Student[] = res.data?.students || res.data?.data || [];
        setStudents(list);
        const next: Record<string, AttRec> = {};
        list.forEach((s) => {
          const saved = savedByName ? savedByName[s.fullName] : undefined;
          next[s.id] = saved ? { present: true, parentType: saved } : { present: false, parentType: "Mother" };
        });
        setAtt(next);
      } catch (err) {
        console.error(err);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    loadStudents();
  }, [formData.centerId, formData.programId, selectedStandards, savedByName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const setPresent = (id: string, present: boolean) => {
    setAtt((prev) => ({ ...prev, [id]: { present, parentType: prev[id]?.parentType || "Mother" } }));
  };
  const setParentType = (id: string, parentType: ParentType) => {
    setAtt((prev) => ({ ...prev, [id]: { present: prev[id]?.present || false, parentType } }));
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setSelectedStandards([]);
    setTeacherId("");
    setStudents([]);
    setAtt({});
    setEditingId(null);
    setSavedByName(null);
  };

  const openNewMeeting = () => {
    resetForm();
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };
  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const editMeeting = async (m: any) => {
    try {
      const res = await api.get(`/meetings/parent/${m.id}`);
      const full = res.data?.data || m;
      const byName: Record<string, ParentType> = {};
      (full.attendance || []).forEach((a: any) => {
        byName[a.parentName] = a.gender === "male" ? "Father" : "Mother";
      });
      setSavedByName(byName);
      setEditingId(m.id);
      setSelectedStandards(
        String(full.standard || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
      );
      const d = full.meetingDate ? new Date(full.meetingDate).toISOString().slice(0, 10) : "";
      setFormData({
        centerId: full.centerId || full.center?.id || "",
        programId: full.programId || full.program?.id || "",
        standard: full.standard || "",
        meetingDate: d,
        meetingTime: full.meetingTime || "",
        topic: full.topic || "",
        description: full.description || "",
      });
      setTeacherId("");
      setError(null);
      setSuccess(null);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError("Could not load meeting for edit.");
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!window.confirm("Ha parent meeting delete karaycha? He undo hoणार nahi.")) return;
    try {
      await api.delete(`/meetings/parent/${id}`);
      setSuccess("Meeting deleted ✅");
      if (editingId === id) closeForm();
      loadMeetings();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Delete failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const parents = presentStudents.map((s) => ({
        parentName: s.fullName,
        gender: att[s.id]?.parentType === "Father" ? "male" : "female",
      }));
      const payload = { ...formData, standard: selectedStandards.join(", "), parents };
      const result = editingId
        ? await api.put(`/meetings/parent/${editingId}`, payload)
        : await api.post("/meetings/parent", payload);
      if (result.data?.success || result.data?.data?.id) {
        setSuccess(editingId ? "Parent Meeting Updated ✅" : "Parent Meeting Created Successfully ✅");
        resetForm();
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
        <button
          onClick={() => (showForm ? closeForm() : openNewMeeting())}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
        >
          {showForm ? "Cancel" : "+ New Meeting"}
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">{success}</div>
      )}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingId ? "Edit Parent Meeting" : "New Parent Meeting"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Center *</label>
                <select
                  name="centerId"
                  value={formData.centerId}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select Center</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Program *</label>
                <select
                  name="programId"
                  value={formData.programId}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select Program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teacher</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Teachers</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Date *</label>
                <input
                  type="date"
                  name="meetingDate"
                  value={formData.meetingDate}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Standard / Class Filter</label>
                <div className="flex flex-wrap gap-2">
                  {availableStandards.map((std) => {
                    const active = selectedStandards.includes(std);
                    return (
                      <button
                        type="button"
                        key={std}
                        onClick={() =>
                          setSelectedStandards((prev) =>
                            prev.includes(std) ? prev.filter((s) => s !== std) : [...prev, std],
                          )
                        }
                        className={
                          "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors " +
                          (active
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white text-neutral-600 border-neutral-300 hover:border-red-400")
                        }
                      >
                        {std}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Time</label>
                <input
                  type="time"
                  name="meetingTime"
                  value={formData.meetingTime}
                  onChange={handleChange}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Topic *</label>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  required
                  placeholder="Enter topic..."
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleChange}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {loadingStudents && <p className="text-sm text-neutral-500">Loading students...</p>}
            {!loadingStudents && formData.centerId && formData.programId && visibleStudents.length === 0 && (
              <p className="text-sm text-neutral-400">Ya filter sathi students nahit.</p>
            )}
            {visibleStudents.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <h3 className="font-semibold text-sm">Parent Attendance</h3>
                  <div className="flex gap-3 text-xs text-neutral-500 flex-wrap">
                    <span className="font-medium">Total: {totalCount}</span>
                    <span className="text-blue-600 font-medium">Male: {maleCount}</span>
                    <span className="text-pink-600 font-medium">Female: {femaleCount}</span>
                    <span>Students: {visibleStudents.length}</span>
                  </div>
                </div>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium text-neutral-600">Student</th>
                        <th className="py-2 px-3 text-left font-medium text-neutral-600">Std</th>
                        <th className="py-2 px-3 text-left font-medium text-neutral-600">Roll No</th>
                        <th className="py-2 px-3 text-left font-medium text-neutral-600">Parent</th>
                        <th className="py-2 px-3 text-center font-medium text-neutral-600">Present</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStudents.map((s) => {
                        const rec = att[s.id] || { present: false, parentType: "Mother" as ParentType };
                        return (
                          <tr key={s.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                            <td className="py-2 px-3">{s.fullName}</td>
                            <td className="py-2 px-3 text-neutral-500">{s.standard || "—"}</td>
                            <td className="py-2 px-3 text-neutral-500">{s.rollNumber || "—"}</td>
                            <td className="py-2 px-3">
                              <select
                                value={rec.parentType}
                                onChange={(e) => setParentType(s.id, e.target.value as ParentType)}
                                className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
                              >
                                <option value="Mother">Mother</option>
                                <option value="Father">Father</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={rec.present}
                                onChange={(e) => setPresent(s.id, e.target.checked)}
                                className="w-4 h-4 rounded text-red-600"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="border border-neutral-300 text-neutral-700 hover:bg-neutral-50 px-5 py-2 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium text-sm"
              >
                {loading ? "Saving..." : editingId ? "Update Meeting" : "Create Meeting"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
        <div className="p-4 border-b border-neutral-100">
          <h2 className="font-semibold text-neutral-800">All Parent Meetings</h2>
        </div>
        {meetings.length === 0 ? (
          <div className="p-8 text-center text-neutral-400">No meetings yet. Create one!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="py-3 px-4 text-left font-medium text-neutral-600">Date</th>
                  <th className="py-3 px-4 text-left font-medium text-neutral-600">Center</th>
                  <th className="py-3 px-4 text-left font-medium text-neutral-600">Program</th>
                  <th className="py-3 px-4 text-left font-medium text-neutral-600">Standard</th>
                  <th className="py-3 px-4 text-left font-medium text-neutral-600">Topic</th>
                  <th className="py-3 px-4 text-center font-medium text-neutral-600">Male</th>
                  <th className="py-3 px-4 text-center font-medium text-neutral-600">Female</th>
                  <th className="py-3 px-4 text-center font-medium text-neutral-600">Total</th>
                  <th className="py-3 px-4 text-center font-medium text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => {
                  const list = m.attendance || [];
                  const male = list.filter((a: any) => a.gender === "male").length;
                  const female = list.filter((a: any) => a.gender === "female").length;
                  return (
                    <tr key={m.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="py-2 px-4">{new Date(m.meetingDate).toLocaleDateString()}</td>
                      <td className="py-2 px-4">{m.center?.name || "—"}</td>
                      <td className="py-2 px-4">{m.program?.name || "—"}</td>
                      <td className="py-2 px-4">{m.standard}</td>
                      <td className="py-2 px-4">{m.topic}</td>
                      <td className="py-2 px-4 text-center text-blue-600 font-medium">{male}</td>
                      <td className="py-2 px-4 text-center text-pink-600 font-medium">{female}</td>
                      <td className="py-2 px-4 text-center font-semibold">{list.length}</td>
                      <td className="py-2 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => editMeeting(m)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteMeeting(m.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
