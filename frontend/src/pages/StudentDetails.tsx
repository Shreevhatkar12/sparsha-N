import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import { ArrowLeft, Edit2, Phone, MapPin, Calendar, Map, FileText } from 'lucide-react';
import { getStudentProfile } from '../services/students.service';
import { getSkillsByStudent } from '../services/skills.service';
import { getCareersByStudent } from '../services/career.service';
import type { StudentProfilePayload } from '../types';
import type { SkillRecord, CareerRecord } from '../types';

const CHART_RED = '#dc2626';
const CHART_RED_SOFT = '#fca5a5';

function radarFromSkills(skills: SkillRecord[] | null): { skill: string; score: number }[] {
  if (!skills?.length) return [];
  const row = skills[0] as unknown as Record<string, unknown>;
  const keys = ['communication', 'confidence', 'computerSkill', 'problemSolving', 'languageSkill'];
  return keys
    .filter((k) => typeof row[k] === 'number')
    .map((k) => ({
      skill: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      score: Number(row[k]),
    }));
}

export const StudentDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfilePayload | null>(null);
  const [skillsRows, setSkillsRows] = useState<SkillRecord[] | null>(null);
  const [careers, setCareers] = useState<CareerRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getStudentProfile(id);
        if (!alive) return;
        setProfile(p);
        const [sk, cr] = await Promise.allSettled([getSkillsByStudent(id), getCareersByStudent(id)]);
        if (!alive) return;
        if (sk.status === 'fulfilled') setSkillsRows(sk.value as SkillRecord[]);
        else setSkillsRows(null);
        if (cr.status === 'fulfilled') setCareers(cr.value as CareerRecord[]);
        else setCareers(null);
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

  const radarData = useMemo(() => {
    if (!profile) return [];
    if (profile.skillRadar?.length) return profile.skillRadar;
    return radarFromSkills(skillsRows);
  }, [profile, skillsRows]);

  if (loading) {
    return (
      <PageWrapper title="Student Profile">
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  if (error || !profile) {
    return (
      <PageWrapper title="Student">
        <ErrorMessage message={error || 'Student not found.'} />
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/students')}>
          Back to list
        </Button>
      </PageWrapper>
    );
  }

  const { student, stats, attendanceTrend, examComparison, formSubmissions, parents } = profile;

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
                  {(student.isActive !== false ? 'Active' : 'Inactive').toUpperCase()}
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
              <Calendar size={16} /> Enrolled{' '}
              {student.enrollmentDate ? String(student.enrollmentDate).slice(0, 10) : '—'}
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
        <div className="mt-6 pt-6 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="text-center py-6">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-1">Attendance</p>
          <p className="text-3xl font-bold text-neutral-900">{stats?.attendancePct ?? 0}%</p>
          <p className="text-xs text-neutral-500 mt-1">Across recorded sessions</p>
        </Card>
        <Card className="text-center py-6">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-1">Avg exam %</p>
          <p className="text-3xl font-bold text-neutral-900">{stats?.avgExamPct ?? '—'}</p>
          <p className="text-xs text-neutral-500 mt-1">From entered scores</p>
        </Card>
        <Card className="text-center py-6">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-1">Skill score</p>
          <p className="text-3xl font-bold text-neutral-900">
            {stats?.skillScore != null ? stats.skillScore : '—'}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Latest assessment</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Attendance trend</h2>
          {!attendanceTrend?.length ? (
            <EmptyState title="No attendance yet" description="Records will appear after sessions are saved." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tickFormatter={(v) => (v === 1 ? 'Present' : 'Absent')} width={56} />
                  <Tooltip />
                  <Bar dataKey="present" fill={CHART_RED} name="Present (1) / Absent (0)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Exam scores (baseline vs endline)</h2>
          {!examComparison?.length ? (
            <EmptyState title="No exam data" description="Scores show when baseline and endline exams are recorded." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examComparison} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: any) => (v == null ? '—' : `${Number(v).toFixed(0)}%`)} />
                  <Legend />
                  <Bar dataKey="baseline" fill={CHART_RED_SOFT} name="Baseline" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="endline" fill={CHART_RED} name="Endline" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Skills</h2>
          {radarData.length === 0 ? (
            <EmptyState
              title="No skill ratings"
              description="Add ratings from the Skills page when the backend exposes them."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                  <Radar dataKey="score" fill={CHART_RED} fillOpacity={0.35} stroke={CHART_RED} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Career tracking</h2>
          {!careers?.length ? (
            <EmptyState title="No career entries" description="Link aspirations from the Careers workspace." />
          ) : (
            <ul className="space-y-3 text-sm">
              {careers.slice(0, 6).map((c, i) => (
                <li key={i} className="border border-neutral-100 rounded-lg p-3 bg-neutral-50/80">
                  <p className="font-medium text-neutral-900">
                    {String((c as { aspiration?: string }).aspiration ?? 'Career note')}
                  </p>
                  {(c as { notes?: string }).notes && (
                    <p className="text-neutral-600 mt-1">{(c as { notes: string }).notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/careers')}>
            Open careers
          </Button>
        </Card>
      </div>

      {(parents?.length ?? 0) > 0 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">Linked parents</h2>
          <ul className="text-sm text-neutral-700 space-y-2">
            {parents!.map((ps: any, i: number) => (
              <li key={i}>
                {ps.parent?.fullName ?? 'Parent'} — {ps.parent?.email ?? ps.parent?.phone ?? '—'}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Form submissions</h2>
        {!formSubmissions?.length ? (
          <EmptyState title="No submissions" description="Responses appear when forms are submitted for this student." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Form</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 font-medium text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {formSubmissions.map((row: any) => {
                  const tpl = row.template;
                  const tid = tpl?.id ?? row.templateId;
                  return (
                    <tr key={row.id} className="border-b border-neutral-100 even:bg-neutral-50/50">
                      <td className="py-2 pr-3 font-medium text-neutral-900">{tpl?.name ?? '—'}</td>
                      <td className="py-2 pr-3 text-neutral-600">{tpl?.formType ?? '—'}</td>
                      <td className="py-2 pr-3 text-neutral-600 whitespace-nowrap">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 text-right">
                        {tid ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="inline-flex"
                            onClick={() => navigate(`/forms/${tid}/submissions`)}
                          >
                            <FileText size={14} className="mr-1" /> Submissions
                          </Button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
};
