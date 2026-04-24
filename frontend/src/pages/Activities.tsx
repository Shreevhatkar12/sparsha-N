import React from 'react';
import { Card } from '../components/ui/Card';
import { Calendar, Plus, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Activities: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Program Activities</h1>
          <p className="text-neutral-500">Plan and track extracurricular and developmental activities</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="flex items-center gap-2">
             <Filter size={18} />
             Filter
           </Button>
           <Button variant="primary" className="flex items-center gap-2">
             <Plus size={18} />
             Add Activity
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-12 text-center flex flex-col items-center justify-center bg-neutral-50/30 border-dashed">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mb-4">
            <Calendar size={32} />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">No activities scheduled</h2>
          <p className="text-neutral-500 max-w-sm mx-auto">
            Organize workshops, field trips, and events for your students. Scheduled activities will appear in this list.
          </p>
          <div className="mt-8">
             <Button variant="primary">Create Your First Activity</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
