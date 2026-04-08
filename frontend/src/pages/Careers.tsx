import React from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BookOpen } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const Careers: React.FC = () => {
  return (
    <PageWrapper title="Career Tracking">
       <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Post-Program Follow-up</h2>
            <Button variant="secondary" size="sm">Download Tracker</Button>
          </div>
          
          <div className="space-y-4">
             <div className="p-4 rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <h3 className="font-semibold text-lg text-primary">Amit Singh</h3>
                   <span className="text-xs text-neutral-500">Alumni • Graduated 2024</span>
                 </div>
                 <Badge variant="success">Secured Admission</Badge>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4 bg-neutral-50 p-4 rounded-lg">
                 <div>
                   <span className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">Interest</span>
                   <span className="font-medium">Engineering</span>
                 </div>
                 <div>
                   <span className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">College Applied</span>
                   <span className="font-medium">VIT Mumbai</span>
                 </div>
                 <div>
                   <span className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">Course</span>
                   <span className="font-medium">B.Tech IT</span>
                 </div>
                 <div>
                   <span className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">Scholarship</span>
                   <span className="font-medium text-success">Availing</span>
                 </div>
               </div>
               
               <div className="flex items-center gap-2 text-neutral-500 text-sm">
                 <BookOpen size={16}/>
                 <span>Last contacted 2 weeks ago</span>
               </div>
             </div>
             
             <div className="p-4 rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <h3 className="font-semibold text-lg text-primary">Ritu Sharma</h3>
                   <span className="text-xs text-neutral-500">Alumni • Graduated 2024</span>
                 </div>
                 <Badge variant="warning">Needs Follow-up</Badge>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4 bg-neutral-50 p-4 rounded-lg">
                 <div>
                   <span className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">Interest</span>
                   <span className="font-medium">Nursing</span>
                 </div>
                 <div>
                   <span className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">College Applied</span>
                   <span className="font-medium text-neutral-400 italic">Pending</span>
                 </div>
                 <div>
                   <span className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">Course</span>
                   <span className="font-medium text-neutral-400 italic">Pending</span>
                 </div>
                 <div>
                   <span className="block text-neutral-400 text-xs uppercase tracking-wider mb-1">Scholarship</span>
                   <span className="font-medium text-neutral-400 italic">N/A</span>
                 </div>
               </div>
               
               <div className="flex items-center gap-2 text-warning text-sm">
                 <BookOpen size={16}/>
                 <span>Requires call scheduling</span>
               </div>
             </div>
          </div>
       </Card>
    </PageWrapper>
  );
};
