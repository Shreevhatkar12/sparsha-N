import React, { useState, useMemo } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDataStore } from '../store/useDataStore';

export const Skills: React.FC = () => {
  const { students } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students.length ? students[0].id : '');
  
  const [skills, setSkills] = useState({
    Communication: 3,
    Confidence: 4,
    'Computer Skills': 2,
    'Problem Solving': 3,
    'Language Skills': 3,
  });

  const handleSliderChange = (skillName: string, value: number) => {
    setSkills(prev => ({ ...prev, [skillName]: value }));
  };

  const handleSave = () => {
    alert('Assessment successfully saved to student profile!');
  };

  const averageScore = useMemo(() => {
    const rawData = Object.values(skills);
    const sum = rawData.reduce((acc, curr) => acc + curr, 0);
    return (sum / rawData.length).toFixed(1);
  }, [skills]);

  return (
    <PageWrapper title="Skill Development Tracking">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <div className="mb-6 border-b border-neutral-100 pb-4">
             <h2 className="text-lg font-semibold mb-2">Select Student</h2>
             <select 
               className="w-full h-11 px-3 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
               value={selectedStudentId}
               onChange={(e) => setSelectedStudentId(e.target.value)}
             >
               {students.map(s => (
                 <option key={s.id} value={s.id}>{s.name} ({s.center})</option>
               ))}
             </select>
          </div>

          <h2 className="text-lg font-semibold mb-1">Update Skill Matrix</h2>
          <p className="text-sm text-neutral-500 mb-6">Rate {students.find(s=>s.id===selectedStudentId)?.name || 'student'} across 5 key metrics.</p>
          
          <div className="space-y-4 mb-6 flex-1">
            {Object.entries(skills).map(([skill, val]) => (
              <div key={skill}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-neutral-700">{skill}</span>
                  <span className="text-primary font-bold">{val}/5</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={val}
                  onChange={(e) => handleSliderChange(skill, parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none" 
                />
              </div>
            ))}
          </div>
          <Button variant="primary" className="w-full" onClick={handleSave}>Save Assessment</Button>
        </Card>

        <Card className="flex flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-white min-h-[300px]">
           <div className="text-center p-8">
              <div className="w-32 h-32 mx-auto relative mb-4">
                 <div className="absolute inset-0 border-4 border-dashed border-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                 <div className="absolute inset-2 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-3xl">
                    {averageScore}
                 </div>
              </div>
              <h3 className="font-semibold text-neutral-900 text-lg">Overall Skill Average</h3>
              <p className="text-xs text-neutral-500 mt-2 max-w-[200px] mx-auto">
                Dragging sliders on the left automatically updates the computed metric score for {students.find(s=>s.id===selectedStudentId)?.name || 'this student'}.
              </p>
           </div>
        </Card>
      </div>
    </PageWrapper>
  );
};
