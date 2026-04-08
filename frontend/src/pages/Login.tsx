import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { GraduationCap } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Mock API call - in a real app, you'd call api/auth/login
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }
      
      if (email === 'admin@sparsha.org' && password === 'admin') {
        setAuth(
          { id: '1', email: 'admin@sparsha.org', role: 'admin', centerIds: ['c1', 'c2'] },
          'mock_admin_token'
        );
        navigate('/');
      } else if (email === 'teacher@sparsha.org' && password === 'teacher') {
        setAuth(
          { id: '2', email: 'teacher@sparsha.org', role: 'teacher', centerIds: ['c1'] },
          'mock_teacher_token'
        );
        navigate('/');
      } else {
        throw new Error('Invalid credentials. Use admin@sparsha.org/admin or teacher@sparsha.org/teacher');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input 
            label="Email Address" 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@sparsha.org"
            required
          />
          <Input 
            label="Password" 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          
          <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
            Sign In
          </Button>
        </form>
        
        <div className="mt-8 text-center text-xs text-neutral-400">
          <p>Demo accounts:</p>
          <p>Admin: admin@sparsha.org / admin</p>
          <p>Teacher: teacher@sparsha.org / teacher</p>
        </div>
      </Card>
    </div>
  );
};
