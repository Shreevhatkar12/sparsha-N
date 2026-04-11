import React, { useState, useMemo } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDataStore } from '../store/useDataStore';
import { PlusCircle, Trash2 } from 'lucide-react';

export const Skills: React.FC = () => {
  const { students } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students.length ? students[0].id : '');
  
  const [skills, setSkills] = useState<Record<string, number>>({
    Communication: 3,
    Confidence: 4,
    'Computer Skills': 2,
    'Problem Solving': 3,
    'Language Skills': 3,
  });

  const [newSkillName, setNewSkillName] = useState('');

  const handleSliderChange = (skillName: string, value: number) => {
    setSkills(prev => ({ ...prev, [skillName]: value }));
  };

  const handleAddSkill = () => {
    if (newSkillName.trim() && !skills[newSkillName]) {
      setSkills(prev => ({ ...prev, [newSkillName.trim()]: 3 }));
      setNewSkillName('');
    }
  };

  const handleDeleteSkill = (skillName: string) => {
    setSkills(prev => {
      const copy = { ...prev };
      delete copy[skillName];
      return copy;
    });
  };

  const handleSave = () => {
    alert('Assessment successfully saved to student profile!');
  };

  const averageScore = useMemo(() => {
    const rawData = Object.values(skills);
    if (!rawData.length) return "0.0";
    const sum = rawData.reduce((acc, curr) => acc + curr, 0);
    return (sum / rawData.length).toFixed(1);
  }, [skills]);

  return (
    <PageWrapper title="Skill Development Tracking">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Student Selection and Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="flex flex-col">
            <h2 className="text-lg font-semibold mb-2 text-neutral-900 border-b border-neutral-100 pb-3">Active Student</h2>
            <select 
              className="w-full h-11 mt-3 px-3 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.center})</option>
              ))}
            </select>
          </Card>

          <Card className="flex flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-white py-8">
             <div className="text-center">
                <div className="w-32 h-32 mx-auto relative mb-4">
                   <div className="absolute inset-0 border-4 border-dashed border-primary/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                   <div className="absolute inset-2 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-3xl">
                      {averageScore}
                   </div>
                </div>
                <h3 className="font-semibold text-neutral-900 text-lg">Overall Skill Average</h3>
                <p className="text-xs text-neutral-500 mt-2 px-4">
                  Dynamically tracking {Object.keys(skills).length} active skills.
                </p>
             </div>
          </Card>
          
          <Button variant="primary" className="w-full" onClick={handleSave}>Push to Student Profile</Button>
        </div>

        {/* Right Column: Skills Matrix */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-4">
               <div>
                 <h2 className="text-lg font-semibold text-neutral-900">Skill Control Matrix</h2>
                 <p className="text-sm text-neutral-500">Rate or manage parameters for {students.find(s=>s.id===selectedStudentId)?.name || 'student'}.</p>
               </div>
            </div>
            
            {/* The list of live sliders */}
            <div className="space-y-4 mb-4 flex-1">
              {Object.entries(skills).length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  No skills defined. Add a custom skill below.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(skills).map(([skill, val]) => (
                    <div key={skill} className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex flex-col">
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="font-semibold text-neutral-800 line-clamp-1 flex-1">{skill}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-primary font-bold bg-primary/10 px-2 rounded-md">{val}/5</span>
                          <button 
                            className="text-neutral-400 hover:text-danger transition-colors cursor-pointer"
                            onClick={() => handleDeleteSkill(skill)}
                            title="Delete this skill"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
              )}
            </div>

            {/* Sticky bottom Add Skill block */}
            <div className="mt-auto pt-4 border-t border-neutral-100">
               <div className="bg-white border text-sm border-neutral-200 rounded-xl p-1 flex items-center justify-between focus-within:ring-2 focus-within:ring-primary/20">
                 <input 
                   type="text"
                   placeholder="Type a new skill (e.g. Leadership, Typing)..."
                   className="flex-1 w-full h-10 px-3 outline-none text-neutral-900 bg-transparent"
                   value={newSkillName}
                   onChange={(e) => setNewSkillName(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                 />
                 <Button variant="primary" size="sm" onClick={handleAddSkill} className="shrink-0 h-9">
                   <PlusCircle size={16} className="mr-1" /> Add 
                 </Button>
               </div>
            </div>
            
          </Card>
        </div>

      </div>
    </PageWrapper>
  );
};
