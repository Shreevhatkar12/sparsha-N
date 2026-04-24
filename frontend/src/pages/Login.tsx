import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { login } from '../services/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { GraduationCap } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken || localStorage.getItem('accessToken')) {
      navigate('/dashboard', { replace: true });
    }
  }, [accessToken, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { token, accessToken, user } = await login(username, password);
      const authToken = token || accessToken;
      if (!authToken) throw new Error('No access token received');
      setAuth(
        {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          centerIds: user.centerIds ?? [],
        },
        authToken,
      );
      navigate('/dashboard');
    } catch (err: unknown) {
      const data =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number; data?: { message?: string; error?: string } } }).response
          : undefined;
      const msg = data?.data?.message || data?.data?.error;
      
      if (data?.status === 429) {
        setError('Too many login attempts. Please try again later.');
      } else {
        setError(msg || 'Login failed. Check your UserID and password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (accessToken) {
    return <LoadingSpinner label="Redirecting…" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
      <Card className="max-w-md w-full shadow-lg border-primary/10">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary relative overflow-hidden">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">SPARSHA System</h1>
          <p className="text-neutral-500 mt-1">Student Management Portal</p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="User ID"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your User ID"
            autoComplete="username"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
};
