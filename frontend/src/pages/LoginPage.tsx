import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { loginSchema } from '../features/auth/validators';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid login data');
      return;
    }

    try {
      setLoading(true);
      await login(parsed.data);
      navigate('/');
    } catch {
      setError('Login failed. Verify credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <p className="hero-copy">Access the Sparsha operational dashboard.</p>

        <label className="field">
          <span>Phone or Email</span>
          <input
            value={form.identifier}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, identifier: event.target.value }))
            }
            placeholder="name@example.org"
            autoComplete="username"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            placeholder="At least 8 characters"
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="auth-meta">
          New user? <Link to="/register">Create account</Link>
        </p>
      </form>
    </div>
  );
}
