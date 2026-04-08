import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import { Button } from '../components/ui/Button';
import { Users, BookOpen, Star, AlertCircle, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export const Dashboard: React.FC = () => {
  const currentUser = useAuthStore(state => state.currentUser);
  const { students } = useDataStore();
  const isAdmin = currentUser?.role === 'admin';
  const navigate = useNavigate();

  // Filter count if teacher
  const displayStudentsCount = isAdmin 
    ? students.length 
    : students.filter(s => currentUser?.centerIds.includes(s.center)).length;

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(students);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "System_Dump_Students");
    XLSX.writeFile(workbook, "SPARSHA_Dashboard_Export.xlsx", { compression: true });
  };

  return (
    <PageWrapper 
      title="Dashboard Overview"
      actions={
        <Button variant="primary" size="sm" className="hidden sm:flex" onClick={() => navigate('/students/new')}>
          <PlusCircle size={16} className="mr-2" />
          Add Student
        </Button>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-primary">
              <Users size={20} />
            </div>
            <span className="text-neutral-500 font-medium text-sm">Total Students</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{displayStudentsCount}</p>
          <p className="text-xs text-success mt-2">Dynamically updating</p>
        </Card>
        
        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <BookOpen size={20} />
            </div>
            <span className="text-neutral-500 font-medium text-sm">Total Sessions</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900">342</p>
          <p className="text-xs text-neutral-500 mt-2">swayam, shiksha, sanskar</p>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg text-success">
              <AlertCircle size={20} />
            </div>
            <span className="text-neutral-500 font-medium text-sm">Attendance Rate</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900">87%</p>
          <p className="text-xs text-danger mt-2">-2% from last week</p>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg text-warning">
              <Star size={20} />
            </div>
            <span className="text-neutral-500 font-medium text-sm">Avg Skill Score</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900">3.4<span className="text-lg text-neutral-400 font-medium whitespace-pre"> / 5</span></p>
          <p className="text-xs text-success mt-2">Overall improvement</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="min-h-[300px] flex items-center justify-center">
            {/* Chart placeholder */}
            <div className="text-center">
              <p className="text-neutral-400 mb-2">Attendance over time chart</p>
              <p className="text-xs text-neutral-400">(Recharts integration coming soon)</p>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-warning" />
              Pending Tasks
            </h3>
            
            <div className="space-y-3">
               <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 flex items-start justify-between">
                 <div>
                   <p className="text-sm font-medium text-neutral-900">Incomplete Exams</p>
                   <p className="text-xs text-neutral-500">14 students missing Endline scores</p>
                 </div>
                 <Button variant="ghost" size="sm" className="text-primary mt-1 px-2 h-auto text-xs py-1" onClick={() => navigate('/exams')}>View</Button>
               </div>
               
               <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 flex items-start justify-between">
                 <div>
                   <p className="text-sm font-medium text-neutral-900">Attendance Missing</p>
                   <p className="text-xs text-neutral-500">Today's session not marked for Grade 8</p>
                 </div>
                 <Button variant="ghost" size="sm" className="text-primary mt-1 px-2 h-auto text-xs py-1" onClick={() => navigate('/attendance')}>Mark</Button>
               </div>
            </div>
          </Card>
          
          {isAdmin && (
            <Card>
              <h3 className="font-semibold text-neutral-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => prompt('Enter new Center name:')}>Add Center</Button>
                <Button variant="secondary" size="sm" className="w-full text-xs" onClick={handleExport}>Export Data</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};
