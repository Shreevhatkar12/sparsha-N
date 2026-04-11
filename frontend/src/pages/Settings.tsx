import React, { useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Shield, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Navigate } from 'react-router-dom';
import { getMe } from '../services/auth.service';

export const Settings: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAdmin = currentUser?.role === 'admin';

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            Signed-in admin (live)
          </h3>
          {loading && !profile ? (
            <LoadingSpinner label="Loading profile…" />
          ) : (
            <pre className="text-xs overflow-auto bg-neutral-50 p-4 rounded-lg border border-neutral-100">
              {JSON.stringify(profile ?? currentUser, null, 2)}
            </pre>
          )}
          <p className="text-xs text-neutral-500 mt-3">
            Institution-wide settings are not yet backed by an API; this panel confirms your session against{' '}
            <code className="text-neutral-700">GET /api/auth/me</code>.
          </p>
        </Card>
      </div>
    </PageWrapper>
  );
};
