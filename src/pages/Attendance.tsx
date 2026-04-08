import React, { useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';

const studentsData = [
  { id: '1', name: 'Ravi Kumar', class: '10' },
  { id: '2', name: 'Priya Sharma', class: '8' },
  { id: '3', name: 'Amit Singh', class: '12' },
  { id: '4', name: 'Anjali Desai', class: '9' }
];

export const Attendance: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>(
    Object.fromEntries(studentsData.map(s => [s.id, true]))
  );

  const toggleAttendance = (id: string) => {
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
    }, 300);
  };

  return (
    <PageWrapper title="Mark Attendance">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Today's Session</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="flex-1"
                  required
                />
                <Input 
                  placeholder="Session Topic (e.g. Algebra basics)" 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)}
                  className="flex-[2]"
                  required
                />
              </div>

              <div className="border border-neutral-200 rounded-lg overflow-hidden relative">
                 {/* Student List */}
                 {studentsData.map((std, i) => (
                   <div key={std.id} className={`flex items-center justify-between p-3 ${i !== studentsData.length-1 ? 'border-b border-neutral-100' : ''}`}>
                      <div>
                        <p className="font-medium text-neutral-900">{std.name}</p>
                        <p className="text-xs text-neutral-500">Class {std.class}</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => toggleAttendance(std.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                          attendance[std.id] 
                            ? 'bg-success/10 border-success/20 text-success hover:bg-success/20' 
                            : 'bg-danger/10 border-danger/20 text-danger hover:bg-danger/20'
                        }`}
                      >
                        {attendance[std.id] ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                        {attendance[std.id] ? 'Present' : 'Absent'}
                      </button>
                   </div>
                 ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" variant="primary">Submit Attendance</Button>
              </div>
            </form>
          </Card>
        </div>

        <div>
          <Card>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-neutral-900">
               <Calendar size={20} className="text-primary"/> Recent Log
            </h2>
            <div className="space-y-4">
               {[1,2,3].map(item => (
                 <div key={item} className="p-3 border border-neutral-100 bg-neutral-50 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Science Ex.</span>
                      <span className="text-xs text-neutral-500">Yesterday</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant="success">96% Pres.</Badge>
                      <span className="text-xs text-primary font-medium cursor-pointer" onClick={() => alert('Missing: Amit Singh, Vikram Patel')}>View</span>
                    </div>
                 </div>
               ))}
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};
