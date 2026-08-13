import React from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { GraduationCap } from 'lucide-react';

// Placeholder — the Digital Literacy exam module will be built here
// (spec is coming from the team; keeping the sidebar entry ready).
export const DigitalExamsPage: React.FC = () => {
  return (
    <PageWrapper title="Digital Exams">
      <Card className="border-none shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
            <GraduationCap size={32} />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">Digital Literacy Exams — Coming Soon</h2>
          <p className="text-sm text-neutral-500 mt-2 max-w-md">
            Ha section lavkarach build hoil — exam create, marks entry, batch-wise results ani growth
            index sagl ithe yeil.
          </p>
        </div>
      </Card>
    </PageWrapper>
  );
};

export default DigitalExamsPage;
