import { useState, useEffect } from "react";
import { listCenters, listPrograms } from "../../services/centers.service";

export function StudentMeetingPage() {
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const centersData = await listCenters();
        console.log("Centers:", centersData);
        setCenters(Array.isArray(centersData) ? centersData : []);

        const programsData = await listPrograms();
        console.log("Programs:", programsData);
        setPrograms(Array.isArray(programsData) ? programsData : []);

      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/meetings/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success || result.id) {
        alert("Meeting Created Successfully ✅");
        setFormData({
          centerId: "", programId: "", standard: "",
          meetingDate: "", meetingTime: "", topic: "", description: "",
        });
      } else {
        alert(result.error || "Something went wrong");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-800">Student Meeting</h1>
          <p className="text-neutral-500 mt-1">Create and manage student meetings</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium mb-2">Center</label>
                <select
                  name="centerId"
                  value={formData.centerId}
                  onChange={(e) => setFormData({ ...formData, centerId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select Center</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>{center.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Program</label>
                <select
                  name="programId"
                  value={formData.programId}
                  onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select Program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Standard</label>
                <input
                  type="text"
                  name="standard"
                  value={formData.standard}
                  onChange={handleChange}
                  placeholder="e.g. 8th, 9th, 10th"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Meeting Date</label>
                <input
                  type="date"
                  name="meetingDate"
                  value={formData.meetingDate}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Meeting Time</label>
                <input
                  type="time"
                  name="meetingTime"
                  value={formData.meetingTime}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Meeting Topic</label>
              <input
                type="text"
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                Create Meeting
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}