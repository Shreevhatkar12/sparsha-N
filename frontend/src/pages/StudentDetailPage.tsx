import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { studentsApi } from '../api/studentsApi';
import {
  attendanceSchema,
  careerSchema,
  skillSchema,
} from '../features/students/validators';

type TabKey = 'profile' | 'attendance' | 'skills' | 'careers';

const tabLabels: Array<{ key: TabKey; label: string }> = [
  { key: 'profile', label: 'Profile Info' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'skills', label: 'Skills Summary' },
  { key: 'careers', label: 'Career Paths' },
];

export function StudentDetailPage() {
  const { id = '' } = useParams();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [attendance, setAttendance] = useState<Record<string, unknown>[]>([]);
  const [skills, setSkills] = useState<Record<string, unknown>[]>([]);
  const [careers, setCareers] = useState<Record<string, unknown>[]>([]);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: '',
    sessionTopic: '',
    status: 'present',
  });
  const [skillsForm, setSkillsForm] = useState({
    communication: 3,
    confidence: 3,
    computerSkill: 3,
    problemSolving: 3,
    languageSkill: 3,
  });
  const [careerForm, setCareerForm] = useState({
    interestedCareer: '',
    courseSelected: '',
    collegeApplied: '',
    scholarship: false,
    followupStatus: '',
  });

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const [profileData, attendanceData, skillsData, careersData] = await Promise.all([
          studentsApi.byId(id),
          studentsApi.attendance(id),
          studentsApi.skills(id),
          studentsApi.careers(id),
        ]);
        setProfile(profileData);
        setAttendance(attendanceData);
        setSkills(skillsData);
        setCareers(careersData);
      } catch {
        setError('Could not load full student profile.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void run();
    }
  }, [id]);

  const studentName =
    String(profile?.fullName ?? profile?.name ?? profile?.studentName ?? `Student ${id}`);

  const refreshDetail = async () => {
    const [attendanceData, skillsData, careersData] = await Promise.all([
      studentsApi.attendance(id),
      studentsApi.skills(id),
      studentsApi.careers(id),
    ]);
    setAttendance(attendanceData);
    setSkills(skillsData);
    setCareers(careersData);
  };

  const submitAttendance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError('');
    const parsed = attendanceSchema.safeParse(attendanceForm);
    if (!parsed.success) {
      setSaveError(parsed.error.issues[0]?.message ?? 'Invalid attendance input');
      return;
    }
    try {
      setSaving(true);
      await studentsApi.addAttendance(id, parsed.data);
      await refreshDetail();
      setAttendanceForm({ date: '', sessionTopic: '', status: 'present' });
    } catch {
      setSaveError('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const submitSkill = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError('');
    const parsed = skillSchema.safeParse(skillsForm);
    if (!parsed.success) {
      setSaveError(parsed.error.issues[0]?.message ?? 'Invalid skill input');
      return;
    }
    try {
      setSaving(true);
      await studentsApi.addSkill(id, parsed.data);
      await refreshDetail();
    } catch {
      setSaveError('Failed to save skills.');
    } finally {
      setSaving(false);
    }
  };

  const submitCareer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError('');
    const parsed = careerSchema.safeParse(careerForm);
    if (!parsed.success) {
      setSaveError(parsed.error.issues[0]?.message ?? 'Invalid career input');
      return;
    }
    try {
      setSaving(true);
      await studentsApi.addCareer(id, parsed.data);
      await refreshDetail();
      setCareerForm({
        interestedCareer: '',
        courseSelected: '',
        collegeApplied: '',
        scholarship: false,
        followupStatus: '',
      });
    } catch {
      setSaveError('Failed to save career data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <h2>{studentName}</h2>
      <p className="hero-copy">Integrated detailed student view with tabbed modules.</p>

      <div className="tabs">
        {tabLabels.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <p className="card-label">Loading student data...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {saveError ? <p className="form-error">{saveError}</p> : null}

      {activeTab === 'profile' ? (
        <div className="list-box">
          <p><strong>ID:</strong> {String(profile?.id ?? '-')}</p>
          <p><strong>Name:</strong> {studentName}</p>
          <p><strong>Gender:</strong> {String(profile?.gender ?? '-')}</p>
          <p><strong>Guardian:</strong> {String(profile?.guardianName ?? '-')}</p>
        </div>
      ) : null}

      {activeTab === 'attendance' ? (
        <div className="list-box">
          <form className="inline-form" onSubmit={submitAttendance}>
            <input
              type="date"
              value={attendanceForm.date}
              onChange={(event) =>
                setAttendanceForm((prev) => ({ ...prev, date: event.target.value }))
              }
            />
            <input
              value={attendanceForm.sessionTopic}
              onChange={(event) =>
                setAttendanceForm((prev) => ({ ...prev, sessionTopic: event.target.value }))
              }
              placeholder="Session topic"
            />
            <select
              value={attendanceForm.status}
              onChange={(event) =>
                setAttendanceForm((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              <option value="present">present</option>
              <option value="absent">absent</option>
              <option value="late">late</option>
            </select>
            <button type="submit" className="btn-secondary" disabled={saving}>
              Add
            </button>
          </form>
          {attendance.length ? (
            attendance.slice(0, 20).map((row, idx) => (
              <p key={`attendance-${idx}`}>
                {String(row.date ?? row.sessionDate ?? '-')} - {String(row.status ?? '-')}
              </p>
            ))
          ) : (
            <p>No attendance records yet.</p>
          )}
        </div>
      ) : null}

      {activeTab === 'skills' ? (
        <div className="list-box">
          <form className="inline-form" onSubmit={submitSkill}>
            <input
              type="number"
              min={1}
              max={5}
              value={skillsForm.communication}
              onChange={(event) =>
                setSkillsForm((prev) => ({
                  ...prev,
                  communication: Number(event.target.value),
                }))
              }
              placeholder="Communication"
            />
            <input
              type="number"
              min={1}
              max={5}
              value={skillsForm.confidence}
              onChange={(event) =>
                setSkillsForm((prev) => ({
                  ...prev,
                  confidence: Number(event.target.value),
                }))
              }
              placeholder="Confidence"
            />
            <input
              type="number"
              min={1}
              max={5}
              value={skillsForm.computerSkill}
              onChange={(event) =>
                setSkillsForm((prev) => ({
                  ...prev,
                  computerSkill: Number(event.target.value),
                }))
              }
              placeholder="Computer skill"
            />
            <input
              type="number"
              min={1}
              max={5}
              value={skillsForm.problemSolving}
              onChange={(event) =>
                setSkillsForm((prev) => ({
                  ...prev,
                  problemSolving: Number(event.target.value),
                }))
              }
              placeholder="Problem solving"
            />
            <input
              type="number"
              min={1}
              max={5}
              value={skillsForm.languageSkill}
              onChange={(event) =>
                setSkillsForm((prev) => ({
                  ...prev,
                  languageSkill: Number(event.target.value),
                }))
              }
              placeholder="Language skill"
            />
            <button type="submit" className="btn-secondary" disabled={saving}>
              Add
            </button>
          </form>
          {skills.length ? (
            skills.slice(0, 20).map((row, idx) => (
              <p key={`skill-${idx}`}>
                Communication: {String(row.communication ?? '-')} | Confidence:{' '}
                {String(row.confidence ?? '-')}
              </p>
            ))
          ) : (
            <p>No skills records yet.</p>
          )}
        </div>
      ) : null}

      {activeTab === 'careers' ? (
        <div className="list-box">
          <form className="inline-form" onSubmit={submitCareer}>
            <input
              value={careerForm.interestedCareer}
              onChange={(event) =>
                setCareerForm((prev) => ({
                  ...prev,
                  interestedCareer: event.target.value,
                }))
              }
              placeholder="Interested career"
            />
            <input
              value={careerForm.courseSelected}
              onChange={(event) =>
                setCareerForm((prev) => ({
                  ...prev,
                  courseSelected: event.target.value,
                }))
              }
              placeholder="Course selected"
            />
            <input
              value={careerForm.collegeApplied}
              onChange={(event) =>
                setCareerForm((prev) => ({
                  ...prev,
                  collegeApplied: event.target.value,
                }))
              }
              placeholder="College applied"
            />
            <input
              value={careerForm.followupStatus}
              onChange={(event) =>
                setCareerForm((prev) => ({
                  ...prev,
                  followupStatus: event.target.value,
                }))
              }
              placeholder="Follow-up status"
            />
            <label className="inline-checkbox">
              <input
                type="checkbox"
                checked={careerForm.scholarship}
                onChange={(event) =>
                  setCareerForm((prev) => ({
                    ...prev,
                    scholarship: event.target.checked,
                  }))
                }
              />
              Scholarship
            </label>
            <button type="submit" className="btn-secondary" disabled={saving}>
              Add
            </button>
          </form>
          {careers.length ? (
            careers.slice(0, 20).map((row, idx) => (
              <p key={`career-${idx}`}>
                {String(row.interestedCareer ?? '-')} - Followup:{' '}
                {String(row.followupStatus ?? '-')}
              </p>
            ))
          ) : (
            <p>No career records yet.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
