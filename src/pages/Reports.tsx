import React, { useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DownloadCloud } from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area 
} from 'recharts';

const programData = [
  { name: 'SWAYAM', value: 450 },
  { name: 'Shiksha', value: 300 },
  { name: 'Sanskar', value: 250 },
];

const attendanceData = [
  { name: 'Center A', attendance: 92 },
  { name: 'Center B', attendance: 78 },
  { name: 'Center C', attendance: 88 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899'];

export const Reports: React.FC = () => {
  const [progChart, setProgChart] = useState<'pie' | 'bar' | 'line'>('pie');
  const [attChart, setAttChart] = useState<'bar' | 'line' | 'area'>('bar');

  return (
    <PageWrapper 
      title="Analytics & Reports"
      actions={
         <Button variant="secondary" onClick={() => alert('Downloading CSV...')}>
           <DownloadCloud className="mr-2" size={18}/>
           Export Complete Data
         </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Program Distribution */}
        <Card className="border-t-4 border-t-primary min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Program Distribution</h2>
            <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
               <button 
                 onClick={() => setProgChart('pie')}
                 className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${progChart === 'pie' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500 hover:text-neutral-900'}`}
               >Pie</button>
               <button 
                 onClick={() => setProgChart('bar')}
                 className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${progChart === 'bar' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500 hover:text-neutral-900'}`}
               >Bar</button>
               <button 
                 onClick={() => setProgChart('line')}
                 className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${progChart === 'line' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500 hover:text-neutral-900'}`}
               >Line</button>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {progChart === 'pie' ? (
                <PieChart>
                  <Pie
                    data={programData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {programData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} Students`} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              ) : progChart === 'bar' ? (
                <BarChart data={programData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} formatter={(val) => `${val} Students`} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {programData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={programData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(val) => `${val} Students`} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Center-Wise Attendance */}
        <Card className="border-t-4 border-t-success min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Center-Wise Attendance</h2>
            <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
               <button 
                 onClick={() => setAttChart('bar')}
                 className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${attChart === 'bar' ? 'bg-white shadow-sm text-success' : 'text-neutral-500 hover:text-neutral-900'}`}
               >Bar</button>
               <button 
                 onClick={() => setAttChart('line')}
                 className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${attChart === 'line' ? 'bg-white shadow-sm text-success' : 'text-neutral-500 hover:text-neutral-900'}`}
               >Line</button>
               <button 
                 onClick={() => setAttChart('area')}
                 className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${attChart === 'area' ? 'bg-white shadow-sm text-success' : 'text-neutral-500 hover:text-neutral-900'}`}
               >Area</button>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[300px] mt-4 shadow-sm">
             <ResponsiveContainer width="100%" height="100%">
               {attChart === 'bar' ? (
                 <BarChart data={attendanceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" tickLine={false} axisLine={false} />
                   <YAxis tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
                   <Tooltip cursor={{ fill: 'transparent' }} formatter={(val) => `${val}%`} />
                   <Bar dataKey="attendance" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                 </BarChart>
               ) : attChart === 'line' ? (
                 <LineChart data={attendanceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" tickLine={false} axisLine={false} />
                   <YAxis tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
                   <Tooltip formatter={(val) => `${val}%`} />
                   <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                 </LineChart>
               ) : (
                 <AreaChart data={attendanceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" tickLine={false} axisLine={false} />
                   <YAxis tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
                   <Tooltip formatter={(val) => `${val}%`} />
                   <Area type="monotone" dataKey="attendance" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={3} />
                 </AreaChart>
               )}
             </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
};
