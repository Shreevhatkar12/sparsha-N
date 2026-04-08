import React from 'react';

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ title, children, actions }) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-50/50">
      <div className="flex-1 overflow-y-auto">
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 mt-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{title}</h1>
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
          
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
