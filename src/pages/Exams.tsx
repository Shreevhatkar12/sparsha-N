import React, { useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { CheckCircle } from 'lucide-react';

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
             <h3 className="font-semibold">Baseline Scores Published Successfully!</h3>
             <p className="text-sm">These records are now locked and saved to the respective student profiles.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-semibold">SWAYAM Baseline Exams</h2>
             <Badge variant={isPublished ? "success" : "warning"}>
                {isPublished ? "Published" : "Ongoing"}
             </Badge>
          </div>
          <p className="text-sm text-neutral-500 mb-6">Enter scores for the beginning of the program.</p>
          
          <div className="space-y-4">
             <div className={`p-3 border border-neutral-200 rounded-lg ${isPublished ? 'bg-neutral-100 opacity-70' : 'bg-neutral-50'}`}>
                <p className="font-medium mb-2 text-neutral-900">Priya Sharma</p>
                <div className="grid grid-cols-3 gap-2">
                   <Input type="number" placeholder="Math /50" defaultValue={32} disabled={isPublished} />
                   <Input type="number" placeholder="Sci /50" defaultValue={28} disabled={isPublished} />
                   <Input type="number" placeholder="Eng /50" defaultValue={41} disabled={isPublished} />
                </div>
             </div>
             <div className={`p-3 border border-neutral-200 rounded-lg bg-neutral-50 ${!isPublished ? 'border-l-warning' : ''} ${isPublished ? 'bg-neutral-100 opacity-70' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                  <p className={`font-medium ${!isPublished ? 'text-warning' : 'text-neutral-900'}`}>Amit Singh</p>
                  {!isPublished && <span className="text-xs font-bold text-warning">PENDING</span>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                   <Input type="number" placeholder="Math /50" defaultValue={isPublished ? 40 : undefined} disabled={isPublished} />
                   <Input type="number" placeholder="Sci /50" defaultValue={isPublished ? 35 : undefined} disabled={isPublished} />
                   <Input type="number" placeholder="Eng /50" defaultValue={isPublished ? 38 : undefined} disabled={isPublished} />
                </div>
             </div>
          </div>
          
          {!isPublished && (
            <Button variant="primary" className="w-full mt-6" onClick={handlePublish}>
              Publish Baseline Scores
            </Button>
          )}
        </Card>
        
        <Card className={!isPublished ? "opacity-50 pointer-events-none" : ""}>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-semibold">Endline Comparison</h2>
             <Badge variant={isPublished ? "success" : "neutral"}>
               {isPublished ? "Unlocked" : "Awaiting Baseline"}
             </Badge>
          </div>
          
          <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Student</TableHead>
                 <TableHead>Baseline Avg</TableHead>
                 <TableHead>New Avg</TableHead>
                 <TableHead>Growth</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               <TableRow>
                  <TableCell className="font-medium text-neutral-900">Priya Sharma</TableCell>
                  <TableCell>33.6/50</TableCell>
                  <TableCell>42/50</TableCell>
                  <TableCell className="text-success font-semibold">+8.4 pts</TableCell>
               </TableRow>
               <TableRow>
                  <TableCell className="font-medium text-neutral-900">Amit Singh</TableCell>
                  <TableCell>37.6/50</TableCell>
                  <TableCell>35/50</TableCell>
                  <TableCell className="text-danger font-semibold">-2.6 pts</TableCell>
               </TableRow>
             </TableBody>
          </Table>
        </Card>
      </div>
    </PageWrapper>
  );
};
