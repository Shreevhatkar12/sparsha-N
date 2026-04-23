import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { useAuthStore } from '../store/useAuthStore';
import {
  createUser,
  deactivateUser,
  listUsers,
  resetUserPassword,
  type UserAdminItem,
} from '../services/users.service';
import type { UserRole } from '../types';

// 1. Update the roles list to match your Prisma Enum
const ROLES = ['super_admin', 'center_admin', 'teacher', 'staff', 'volunteer'] as UserRole[];

export const UsersAdmin: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  
  // 2. Update the Admin check to recognize both Admin roles
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isCenterAdmin = currentUser?.role === 'center_admin';
  const canAccess = isSuperAdmin || isCenterAdmin;

  const roleOptions: UserRole[] = isSuperAdmin 
    ? ['super_admin', 'center_admin'] 
    : ['teacher', 'staff', 'volunteer'];

  const [rows, setRows] = useState<UserAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers({ limit: 100, search: search.trim() || undefined });
      setRows(data.users);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createUser({
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        role,
        phone: phone.trim() || undefined,
      });
      setEmail('');
      setFullName('');
      setPassword('');
      setPhone('');
      setRole('teacher');
      await loadUsers();
    } catch {
      setError('Failed to create user. Check email uniqueness and password length.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await deactivateUser(userId);
      await loadUsers();
    } catch {
      setError('Failed to deactivate user.');
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = window.prompt('Enter a new password (minimum 8 characters):');
    if (!newPassword) return;
    try {
      await resetUserPassword(userId, newPassword);
      window.alert('Password reset successful.');
    } catch {
      setError('Password reset failed.');
    }
  };

  // 3. Update the navigation bounce to use the new 'canAccess' check
  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const columns: DataTableColumn<UserAdminItem>[] = [
    {
      id: 'fullName',
      header: 'User',
      sortable: true,
      cell: (u) => (
        <div>
          <div className="font-medium text-neutral-900">{u.fullName}</div>
          <div className="text-xs text-neutral-500">{u.email}</div>
        </div>
      ),
    },
    { id: 'role', header: 'Role', sortable: true, accessor: (u) => u.role.toUpperCase().replace('_', ' ') },
    { id: 'phone', header: 'Phone', accessor: (u) => u.phone || '-' },
    { id: 'isActive', header: 'Status', accessor: (u) => (u.isActive ? 'Active' : 'Inactive') },
    {
      id: 'actions',
      header: '',
      className: 'text-right',
      cell: (u) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => void handleResetPassword(u.id)}>
            Reset Password
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!u.isActive || currentUser?.id === u.id}
            onClick={() => void handleDeactivate(u.id)}
          >
            Deactivate
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper title="User Administration">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <Card className="mb-6">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">Create User</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreate}>
          <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="User ID" type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Minimum 8 characters"
            required
          />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">Role</label>
            <select
              className="h-11 rounded-lg border border-neutral-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase().replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" isLoading={creating}>
              Create User
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search by name/email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void loadUsers();
            }}
          />
          <Button variant="secondary" onClick={() => void loadUsers()}>
            Search
          </Button>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <DataTable<UserAdminItem>
            columns={columns}
            data={rows}
            rowKey={(u) => u.id}
            filterKeys={['fullName', 'email', 'role']}
            filterPlaceholder="Filter loaded users..."
          />
        )}
      </Card>
    </PageWrapper>
  );
};