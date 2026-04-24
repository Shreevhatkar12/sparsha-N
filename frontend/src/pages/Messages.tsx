import React from 'react';
import { Card } from '../components/ui/Card';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const Messages: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Messages</h1>
          <p className="text-neutral-500">Internal communication and thread management</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus size={18} />
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <Card className="lg:col-span-1 p-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <Input className="pl-9 py-1.5 text-sm" placeholder="Search conversations..." />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             <div className="p-8 text-center text-neutral-400">
                <p className="text-sm">No conversations yet</p>
             </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col items-center justify-center bg-neutral-50/50">
          <div className="text-center px-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm text-neutral-300 mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Select a message</h3>
            <p className="text-neutral-500 max-w-xs mx-auto mt-2 text-sm">
              Choose a thread from the list on the left to view the conversation and reply.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
