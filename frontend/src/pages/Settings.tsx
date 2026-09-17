import React, { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Shield, RefreshCw, User, Mail, Clock, FileSpreadsheet, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Navigate } from 'react-router-dom';
import { getMe } from '../services/auth.service';
import api from '../services/api';

type BackupStatus = {
  configured: boolean;
  sheetUrl: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: 'idle' | 'running' | 'success' | 'error';
  lastSyncError: string | null;
};

export const Settings: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAdmin = ['super_admin', 'center_admin', 'tech_admin'].includes(currentUser?.role || '');

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const loadBackupStatus = async () => {
    try {
      const res = await api.get<BackupStatus>('/backup/status');
      setBackupStatus(res.data);
    } catch {
      /* backup status is best-effort; page still works without it */
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.post('/backup/sync-now');
      if (res.data?.skipped) {
        setSyncMessage(res.data.reason || 'Backup is not configured yet.');
      } else if (res.data?.success) {
        setSyncMessage('Synced successfully.');
      } else {
        setSyncMessage(res.data?.error || 'Sync failed.');
      }
      await loadBackupStatus();
    } catch (err: any) {
      setSyncMessage(err?.response?.data?.error || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const refresh = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const u = await getMe();
      setProfile(u as unknown as Record<string, unknown>);
      setAuth(
        {
          id: u.id,
          email: u.email,
          name: u.fullName,
          role: u.role,
          centerIds: u.centerIds ?? [],
        },
        accessToken,
      );
    } catch {
      setError('Could not refresh profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    if (isSuperAdmin) void loadBackupStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageWrapper
      title="System Settings"
      actions={
        <Button variant="secondary" size="sm" onClick={() => void refresh()} isLoading={loading}>
          <RefreshCw size={16} className="mr-2" /> Refresh profile
        </Button>
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="max-w-3xl grid grid-cols-1 gap-6">
        <Card>
          <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            Admin Profile Overview
          </h3>
          {loading && !profile ? (
            <LoadingSpinner label="Loading profile…" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-white shadow-sm border border-neutral-100 rounded-xl hover:shadow-md transition-shadow">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Full Name</p>
                  <p className="font-semibold text-neutral-900">{(profile as any)?.fullName || currentUser?.name || 'Administrator'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-white shadow-sm border border-neutral-100 rounded-xl hover:shadow-md transition-shadow">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Email Address</p>
                  <p className="font-semibold text-neutral-900">{(profile as any)?.email || currentUser?.email || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white shadow-sm border border-neutral-100 rounded-xl hover:shadow-md transition-shadow">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">System Role</p>
                  <p className="font-semibold text-neutral-900 capitalize">{(profile as any)?.role || currentUser?.role || 'Admin'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white shadow-sm border border-neutral-100 rounded-xl hover:shadow-md transition-shadow">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Joined Date</p>
                  <p className="font-semibold text-neutral-900">
                    {(profile as any)?.createdAt ? new Date((profile as any).createdAt).toLocaleDateString() : 'Active'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <p className="text-xs text-neutral-500 mt-6">
            Institution-wide settings are not yet backed by an API; this panel confirms your session against{' '}
            <code className="text-neutral-700 bg-neutral-100 px-1 py-0.5 rounded">GET /api/auth/me</code>.
          </p>
        </Card>

        {isSuperAdmin && (
          <Card>
            <h3 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-primary" />
              Data Backup (Google Sheets)
            </h3>
            <p className="text-sm text-neutral-500 mb-4">
              Auto-syncs every 15 minutes into 7 tabs — Students (with exam Baseline/Endline/AIP
              averages), Meetings, Attendance, Dropout &amp; Re-enrolled, Sponsorship &amp; Scholarship,
              Health Camps, and Digital Literacy — all center and academic-year aware. Anything
              deactivated stays logged forever in a separate "Deleted Records" tab, so it can be recovered later.
            </p>

            {!backupStatus?.configured ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Not set up yet</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Add <code className="bg-amber-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_EMAIL</code>,{' '}
                    <code className="bg-amber-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code> and{' '}
                    <code className="bg-amber-100 px-1 rounded">GOOGLE_SHEET_ID</code> to the backend's environment
                    variables to turn this on.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                  {backupStatus.lastSyncStatus === 'success' ? (
                    <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                  ) : backupStatus.lastSyncStatus === 'error' ? (
                    <AlertTriangle size={18} className="text-red-500 shrink-0" />
                  ) : (
                    <Clock size={18} className="text-neutral-400 shrink-0" />
                  )}
                  <div className="text-sm">
                    <p className="font-medium text-neutral-800">
                      {backupStatus.lastSyncAt
                        ? `Last synced ${new Date(backupStatus.lastSyncAt).toLocaleString()}`
                        : 'Not synced yet — click "Sync Now" or wait for the next auto-sync.'}
                    </p>
                    {backupStatus.lastSyncStatus === 'error' && backupStatus.lastSyncError && (
                      <p className="text-xs text-red-600 mt-0.5">{backupStatus.lastSyncError}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="primary" size="sm" onClick={() => void handleSyncNow()} isLoading={syncing}>
                    <RefreshCw size={16} className="mr-2" /> Sync Now
                  </Button>
                  {backupStatus.sheetUrl && (
                    <a
                      href={backupStatus.sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      Open Google Sheet <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                {syncMessage && <p className="text-xs text-neutral-500">{syncMessage}</p>}
              </div>
            )}
          </Card>
        )}
      </div>
    </PageWrapper>
  );
};
