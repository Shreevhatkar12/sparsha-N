import React, { useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { CheckCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const graphData = [
  { name: 'Priya S.', baseline: 33.6, endline: 42.0 },
  { name: 'Amit S.', baseline: 37.6, endline: 35.0 },
  { name: 'Rahul K.', baseline: 28.0, endline: 34.5 },
  { name: 'Neha G.', baseline: 41.2, endline: 45.0 }
];

export const Exams: React.FC = () => {
  const [isPublished, setIsPublished] = useState(false);

  const handlePublish = () => {
    setIsPublished(true);
    alert('Scores successfully written to Global Database!');
  };

  return (
    <PageWrapper title="Exam Tracker">
      {isPublished && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-xl flex items-center gap-3 text-success">
          <CheckCircle size={24} />
          <div>
             <h3 className="font-semibold">Scores Published Successfully!</h3>
             <p className="text-sm">These records are now locked and saved to the respective student profiles.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        
        {/* Input Card */}
        <div className="xl:col-span-1 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-semibold">SWAYAM Input</h2>
               <Badge variant={isPublished ? "success" : "warning"}>
                  {isPublished ? "Published" : "Ongoing"}
               </Badge>
            </div>
            <p className="text-sm text-neutral-500 mb-6">Enter raw scores for the active batch.</p>
            
            <div className="space-y-4">
               <div className={`p-3 border border-neutral-200 rounded-lg ${isPublished ? 'bg-neutral-100 opacity-70' : 'bg-neutral-50'}`}>
                  <p className="font-medium mb-2 text-neutral-900">Priya Sharma</p>
                  <div className="grid grid-cols-3 gap-2">
                     <Input type="number" placeholder="Math" defaultValue={32} disabled={isPublished} />
                     <Input type="number" placeholder="Sci" defaultValue={28} disabled={isPublished} />
                     <Input type="number" placeholder="Eng" defaultValue={41} disabled={isPublished} />
                  </div>
               </div>
               <div className={`p-3 border border-neutral-200 rounded-lg bg-neutral-50 ${!isPublished ? 'border-l-warning' : ''} ${isPublished ? 'bg-neutral-100 opacity-70' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <p className={`font-medium ${!isPublished ? 'text-warning' : 'text-neutral-900'}`}>Amit Singh</p>
                    {!isPublished && <span className="text-xs font-bold text-warning">PENDING</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                     <Input type="number" placeholder="Math" defaultValue={isPublished ? 40 : undefined} disabled={isPublished} />
                     <Input type="number" placeholder="Sci" defaultValue={isPublished ? 35 : undefined} disabled={isPublished} />
                     <Input type="number" placeholder="Eng" defaultValue={isPublished ? 38 : undefined} disabled={isPublished} />
                  </div>
               </div>
            </div>
            
            {!isPublished && (
              <Button variant="primary" className="w-full mt-6" onClick={handlePublish}>
                Publish Baseline Scores
              </Button>
            )}
          </Card>
        </div>

        {/* Analytics Card */}
        <div className="xl:col-span-2 space-y-6">
          <Card className={!isPublished ? "opacity-30 pointer-events-none filter blur-[1px] transition-all" : "transition-all"}>
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary"/> Baseline vs. Endline Growth
                </h2>
                <Badge variant={isPublished ? "success" : "neutral"}>
                  {isPublished ? "Live Analytics" : "Awaiting Baseline"}
                </Badge>
             </div>
             
             <div className="w-full h-[300px] mt-4">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={graphData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" tickLine={false} axisLine={false} />
                   <YAxis tickLine={false} axisLine={false} domain={[0, 50]} />
                   <Tooltip cursor={{ fill: 'transparent' }} />
                   <Legend />
                   <Bar dataKey="baseline" name="Baseline Avg (out of 50)" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                   <Bar dataKey="endline" name="Endline Avg (out of 50)" fill="#10b981" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </Card>

          <Card className={!isPublished ? "opacity-50 pointer-events-none" : ""}>
            <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Student</TableHead>
                   <TableHead>Baseline</TableHead>
                   <TableHead>Endline</TableHead>
                   <TableHead>Net Growth</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 <TableRow>
                    <TableCell className="font-medium text-neutral-900">Priya Sharma</TableCell>
                    <TableCell>33.6</TableCell>
                    <TableCell>42.0</TableCell>
                    <TableCell className="text-success font-semibold">+8.4 pts</TableCell>
                 </TableRow>
                 <TableRow>
                    <TableCell className="font-medium text-neutral-900">Amit Singh</TableCell>
                    <TableCell>37.6</TableCell>
                    <TableCell>35.0</TableCell>
                    <TableCell className="text-danger font-semibold">-2.6 pts</TableCell>
                 </TableRow>
               </TableBody>
            </Table>
          </Card>
        </div>

      </div>
    </PageWrapper>
  );
};
