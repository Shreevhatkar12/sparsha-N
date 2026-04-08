import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft, Edit2, Phone, MapPin, Calendar, Map } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';

export const StudentDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { students } = useDataStore();
  const [activeTab, setActiveTab] = useState('profile');

  const student = students.find(s => s.id === id);

  if (!student) {
    return (
      <PageWrapper title="Student Not Found">
        <div className="flex flex-col items-center justify-center p-12">
          <p className="text-neutral-500 mb-4">Could not find the requested student.</p>
          <Button onClick={() => navigate('/students')} variant="secondary">Back to List</Button>
        </div>
      </PageWrapper>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'skills', label: 'Skills' },
    { id: 'career', label: 'Career Tracking' },
    { id: 'exams', label: 'Exams' },
  ];

  return (
    <PageWrapper 
      title="Student Profile"
      actions={
        <div className="flex gap-2">
           <Button variant="ghost" onClick={() => navigate('/students')} className="bg-white">
             <ArrowLeft size={16} className="mr-2" /> Back
           </Button>
           <Button variant="primary" onClick={() => navigate(`/students/${student.id}/edit`)}>
             <Edit2 size={16} className="mr-2" /> Edit Profile
           </Button>
        </div>
      }
    >
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
           <div className="flex items-center gap-4">
             <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-semibold">
               {student.name.charAt(0)}
             </div>
             <div>
               <h1 className="text-2xl font-bold text-neutral-900">{student.name}</h1>
               <div className="flex items-center gap-2 mt-1">
                 <Badge variant="primary">{student.program}</Badge>
                 <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                   {student.status.toUpperCase()}
                 </Badge>
               </div>
             </div>
           </div>
           
           <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-neutral-600">
             <div className="flex items-center gap-2"><Map size={16}/> {student.center}</div>
             <div className="flex items-center gap-2"><Calendar size={16}/> Class {student.class}</div>
             {student.guardianPhone && <div className="flex items-center gap-2"><Phone size={16}/> {student.guardianPhone}</div>}
             {student.location && <div className="flex items-center gap-2"><MapPin size={16}/> {student.location}</div>}
           </div>
        </div>
      </Card>

      <div className="flex overflow-x-auto border-b border-neutral-200 mb-6 no-scrollbar">
         {tabs.map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
               activeTab === tab.id 
                 ? 'border-primary text-primary' 
                 : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
             }`}
           >
             {tab.label}
           </button>
         ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'profile' && (
          <Card>
            <h3 className="font-semibold text-lg mb-4">Detailed Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Personal</h4>
                  <p className="text-sm"><span className="text-neutral-400 w-24 inline-block">DOB:</span> {student.dob || 'Not provided'}</p>
                  <p className="text-sm mt-1"><span className="text-neutral-400 w-24 inline-block">Gender:</span> <span className="capitalize">{student.gender || 'Not provided'}</span></p>
                  <p className="text-sm mt-1"><span className="text-neutral-400 w-24 inline-block">Enrolled:</span> {student.enrollmentDate || 'Not provided'}</p>
               </div>
               <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-2">Academic & Family</h4>
                  <p className="text-sm"><span className="text-neutral-400 w-24 inline-block">School:</span> {student.schoolName || 'Not provided'}</p>
                  <p className="text-sm mt-1"><span className="text-neutral-400 w-24 inline-block">Guardian:</span> {student.guardianName || 'Not provided'}</p>
               </div>
            </div>
          </Card>
        )}
        
        {activeTab === 'attendance' && (
          <Card>
             <p className="text-neutral-500">Attendance history will mount here.</p>
             <Button variant="secondary" className="mt-4" onClick={() => navigate('/attendance')}>Mark Attendance</Button>
          </Card>
        )}

        {activeTab === 'skills' && (
          <Card>
             <p className="text-neutral-500">Skill Development radar charts will mount here.</p>
             <Button variant="secondary" className="mt-4" onClick={() => navigate('/skills')}>Update Skills</Button>
          </Card>
        )}

        {activeTab === 'career' && (
          <Card>
             <p className="text-neutral-500">Post-program tracking history will mount here.</p>
             <Button variant="secondary" className="mt-4" onClick={() => navigate('/careers')}>Go to Career Tracker</Button>
          </Card>
        )}

        {activeTab === 'exams' && (
          <Card>
             <p className="text-neutral-500">Baseline and Endline Exam scores will mount here.</p>
             <Button variant="secondary" className="mt-4" onClick={() => navigate('/exams')}>Compare Scores</Button>
          </Card>
        )}
      </div>

    </PageWrapper>
  );
};
