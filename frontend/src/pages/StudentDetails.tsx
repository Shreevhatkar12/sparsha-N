import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ArrowLeft, Edit2, Phone, MapPin, Calendar, Map } from 'lucide-react';
import { getStudentById } from '../services/students.service';
import { getStudentAttendance } from '../services/attendance.service';
import { getStudentExamScores } from '../services/exams.service';
import type { Student } from '../types';

export const StudentDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Record<string, unknown> | null>(null);
  const [exams, setExams] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await getStudentById(id);
        if (!alive) return;
        setStudent(s);
        const [att, ex] = await Promise.allSettled([
          getStudentAttendance(id),
          getStudentExamScores(id),
        ]);
        if (!alive) return;
        if (att.status === 'fulfilled') setAttendance(att.value as Record<string, unknown>);
        if (ex.status === 'fulfilled') setExams(ex.value as Record<string, unknown>);
      } catch {
        if (alive) setError('Could not load student.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <PageWrapper title="Student Profile">
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  if (error || !student) {
    return (
      <PageWrapper title="Student">
        <ErrorMessage message={error || 'Student not found.'} />
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/students')}>
          Back to list
        </Button>
      </PageWrapper>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'exams', label: 'Exams' },
  ];

  const records = (attendance?.records as unknown[]) ?? [];

  return (
    <PageWrapper
      title="Student Profile"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/students')} className="bg-white">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
          <Button variant="primary" onClick={() => navigate(`/students/${student.id}/edit`)}>
            <Edit2 size={16} className="mr-2" /> Edit
          </Button>
        </div>
      }
    >
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-semibold">
              {student.fullName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{student.fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {student.program && <Badge variant="primary">{student.program.name}</Badge>}
                <Badge variant={student.isActive !== false ? 'success' : 'neutral'}>
                  {(student.isActive !== false ? 'ACTIVE' : 'INACTIVE').toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-neutral-600">
            {student.center && (
              <div className="flex items-center gap-2">
                <Map size={16} /> {student.center.name}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar size={16} /> Enrolled {student.enrollmentDate ? String(student.enrollmentDate).slice(0, 10) : '—'}
            </div>
            {student.guardianPhone && (
              <div className="flex items-center gap-2">
                <Phone size={16} /> {student.guardianPhone}
              </div>
            )}
            {student.guardianName && (
              <div className="flex items-center gap-2">
                <MapPin size={16} /> {student.guardianName}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex overflow-x-auto border-b border-neutral-200 mb-6 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">
        {activeTab === 'profile' && (
          <Card>
            <h3 className="font-semibold text-lg mb-4">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-neutral-500">DOB</p>
                <p>{student.dob ? String(student.dob).slice(0, 10) : '—'}</p>
              </div>
              <div>
                <p className="text-neutral-500">Gender</p>
                <p className="capitalize">{student.gender || '—'}</p>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'attendance' && (
          <Card>
            <p className="text-sm text-neutral-600 mb-2">
              Rate: {typeof attendance?.attendanceRate === 'number' ? `${attendance.attendanceRate}%` : '—'}
            </p>
            <p className="text-sm text-neutral-500 mb-4">Recent sessions: {records.length}</p>
            <Button variant="secondary" onClick={() => navigate('/attendance')}>
              Open attendance workspace
            </Button>
          </Card>
        )}

        {activeTab === 'exams' && (
          <Card>
            <pre className="text-xs overflow-auto max-h-80 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              {JSON.stringify(exams?.scores ?? {}, null, 2)}
            </pre>
            <Button variant="secondary" className="mt-4" onClick={() => navigate('/exams')}>
              Exams workspace
            </Button>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
};
