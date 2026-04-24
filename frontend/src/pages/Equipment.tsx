import React from 'react';
import { Card } from '../components/ui/Card';
import { Briefcase, Plus, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const Equipment: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Equipment Management</h1>
          <p className="text-neutral-500">Track and manage center equipment and inventory</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus size={18} />
          Add Equipment
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <Input className="pl-10" placeholder="Search equipment by name, ID or category..." />
          </div>
          <div className="flex gap-2">
             <select className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option>All Categories</option>
                <option>Electronics</option>
                <option>Furniture</option>
                <option>Educational Kits</option>
             </select>
          </div>
        </div>

        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mb-4">
            <Briefcase size={24} />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">No equipment found</h3>
          <p className="text-neutral-500 max-w-sm mx-auto mt-2">
            There are no equipment records in your current scope. Add new equipment to start tracking inventory.
          </p>
        </div>
      </Card>
    </div>
  );
};
