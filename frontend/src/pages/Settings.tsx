import React, { useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Phone, MapPin, Shield, Save } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Navigate } from 'react-router-dom';

export const Settings: React.FC = () => {
  const currentUser = useAuthStore(state => state.currentUser);
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Global Settings Updated successfully.');
    }, 600);
  };

  return (
    <PageWrapper 
      title="System Settings"
      actions={
        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
          <Save size={16} className="mr-2" /> Save Changes
        </Button>
      }
    >
      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <div className="md:col-span-1 space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-neutral-900 mb-1 flex items-center gap-2">
              <Shield size={16} className="text-primary"/> Global Identity
            </h3>
            <p className="text-neutral-500">Configure your institution's public-facing information used in reports and automated emails.</p>
          </div>
          <hr className="border-neutral-100" />
          <div className="p-3 bg-neutral-50 rounded-lg text-neutral-600">
            Current Environment: <strong>Production</strong>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card>
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-neutral-900 border-b border-neutral-100 pb-2">Institutional Details</h3>
                
                <div className="relative">
                  <div className="absolute top-8 left-3 text-neutral-400">
                    <Mail size={18} />
                  </div>
                  <Input 
                    label="System Support Email" 
                    type="email" 
                    defaultValue="support@sparsha.org"
                    className="pl-10"
                  />
                  <p className="text-xs text-neutral-500 mt-1">This email acts as the default 'Reply-To' for system notifications.</p>
                </div>

                <div className="relative">
                  <div className="absolute top-8 left-3 text-neutral-400">
                    <Phone size={18} />
                  </div>
                  <Input 
                    label="Primary Contact Number" 
                    type="tel" 
                    defaultValue="+91 9876543210"
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <div className="absolute top-8 left-3 text-neutral-400">
                    <MapPin size={18} />
                  </div>
                  <Input 
                    label="Headquarters Address" 
                    defaultValue="12th Floor, SPARSHA NGO HQ, Mumbai, India."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-4 mt-8">
                <h3 className="text-base font-semibold text-neutral-900 border-b border-neutral-100 pb-2">System Preferences</h3>
                
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm text-neutral-900">Enforce Strict Registration</h4>
                    <p className="text-xs text-neutral-500 max-w-[280px]">Require users to fill ALL details (including optional fields) when registering a new student.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm text-neutral-900">Weekly Summary Emails</h4>
                    <p className="text-xs text-neutral-500 max-w-[280px]">Automatically dispatch a CSV dump to all center heads on Sunday night.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </form>
          </Card>
        </div>
        
      </div>
    </PageWrapper>
  );
};
