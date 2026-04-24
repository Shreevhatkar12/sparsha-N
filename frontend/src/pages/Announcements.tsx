import React from 'react';
import { Card } from '../components/ui/Card';
import { Megaphone, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Announcements: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Announcements</h1>
          <p className="text-neutral-500">System-wide and center-specific notifications</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus size={18} />
          Create Announcement
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed">
          <div className="w-16 h-16 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mb-4">
            <Megaphone size={32} />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">No active announcements</h2>
          <p className="text-neutral-500 max-w-sm mx-auto">
            Stay informed about the latest updates and news. Active announcements for your center or role will appear here.
          </p>
          <div className="mt-8 flex gap-3">
             <Button variant="outline">View Archived</Button>
             <Button variant="primary">Create New</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
