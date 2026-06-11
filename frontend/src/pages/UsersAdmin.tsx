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
  deleteUser,
  listUsers,
  resetUserPassword,
  updateUserCenters,
  type UserAdminItem,
  type CenterProgramAssignment,
} from '../services/users.service';
import { listCenters } from '../services/centers.service';
import { listPrograms } from '../services/centers.service';
import type { UserRole } from '../types';
import { Building2, X, Check, Trash2, Plus } from 'lucide-react';

type UserWithCenters = UserAdminItem & {
  centerAssignments?: Array<{
    id: string;
    centerId: string;
    programId?: string | null;
    center: { id: string; name: string };
    program?: { id: string; name: string } | null;
  }>;
};

export const UsersAdmin: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  
  const isAdmin = ['super_admin', 'center_admin', 'tech_admin'].includes(currentUser?.role || '');
  const canAccess = isAdmin;
  const canDelete = ['super_admin', 'tech_admin'].includes(currentUser?.role || '');

  const roleOptions: UserRole[] = currentUser?.role === 'super_admin' 
    ? ['super_admin', 'center_admin', 'tech_admin', 'teacher', 'staff', 'volunteer'] 
    : currentUser?.role === 'tech_admin'
    ? ['teacher', 'staff', 'volunteer']
    : ['teacher', 'staff', 'volunteer'];

  const [rows, setRows] = useState<UserWithCenters[]>([]);
  const [centers, setCenters] = useState<{id: string, name: string}[]>([]);
  const [programs, setPrograms] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [selectedCenterIds, setSelectedCenterIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Edit centers+programs modal
  const [editCentersUserId, setEditCentersUserId] = useState<string | null>(null);
  const [editCentersUserName, setEditCentersUserName] = useState('');
  const [editAssignments, setEditAssignments] = useState<CenterProgramAssignment[]>([]);
  const [savingCenters, setSavingCenters] = useState(false);

  // Delete confirm
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithCenters | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userData, centerData, programData] = await Promise.all([
        listUsers({ limit: 100, search: search.trim() || undefined }),
        listCenters(),
        listPrograms(),
      ]);
      setRows(userData.users as UserWithCenters[]);
      setCenters(centerData);
      setPrograms(Array.isArray(programData) ? programData : (programData as any)?.programs || []);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleCenter = (id: string) => {
    setSelectedCenterIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCenterIds.length === 0) {
      setError('Please assign at least one center to the user.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createUser({
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        role,
        phone: phone.trim() || undefined,
        centerIds: selectedCenterIds,
      });
      setEmail('');
      setFullName('');
      setPassword('');
      setPhone('');
      setRole('teacher');
      setSelectedCenterIds([]);
      await loadData();
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
      await loadData();
    } catch {
      setError('Failed to deactivate user.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return;
    setDeleting(true);
    try {
      await deleteUser(deleteConfirmUser.id);
      setDeleteConfirmUser(null);
      await loadData();
    } catch {
      setError('Failed to delete user.');
    } finally {
      setDeleting(false);
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

  const openEditCenters = (user: UserWithCenters) => {
    setEditCentersUserId(user.id);
    setEditCentersUserName(user.fullName);
    const current: CenterProgramAssignment[] = user.centerAssignments?.map(a => ({
      centerId: a.center?.id || a.centerId,
      programId: a.programId || null,
    })) || [];
    setEditAssignments(current);
  };

  const addAssignment = () => {
    setEditAssignments(prev => [...prev, { centerId: centers[0]?.id || '', programId: null }]);
  };

  const removeAssignment = (index: number) => {
    setEditAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const updateAssignment = (index: number, field: 'centerId' | 'programId', value: string | null) => {
    setEditAssignments(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleSaveCenters = async () => {
    if (!editCentersUserId) return;
    setSavingCenters(true);
    setError(null);
    try {
      await updateUserCenters(editCentersUserId, editAssignments);
      setEditCentersUserId(null);
      await loadData();
    } catch {
      setError('Failed to update center assignments.');
    } finally {
      setSavingCenters(false);
    }
  };

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const columns: DataTableColumn<UserWithCenters>[] = [
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
    {
      id: 'centers',
      header: 'Centers & Programs',
      cell: (u) => {
        const assignments = u.centerAssignments || [];
        return (
          <div className="flex flex-col gap-1">
            {assignments.length > 0 ? (
              assignments.slice(0, 2).map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-50 text-brand-700 border border-brand-100">
                  <Building2 size={10} />
                  {a.center?.name}
                  {a.program && <span className="text-brand-500"> · {a.program.name}</span>}
                </span>
              ))
            ) : (
              <span className="text-xs text-neutral-400 italic">None</span>
            )}
            {assignments.length > 2 && (
              <span className="text-[11px] text-neutral-500 font-medium">+{assignments.length - 2}</span>
            )}
          </div>
        );
      },
    },
    { id: 'isActive', header: 'Status', accessor: (u) => (u.isActive ? 'Active' : 'Inactive') },
    {
      id: 'actions',
      header: '',
      className: 'text-right',
      cell: (u) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => openEditCenters(u)}
            title="Edit center assignments"
          >
            <Building2 size={14} className="mr-1" />
            Centers
          </Button>
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
          {canDelete && currentUser?.id !== u.id && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteConfirmUser(u)}
              title="Permanently delete user"
            >
              <Trash2 size={14} />
            </Button>
          )}
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

      {/* Delete Confirm Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirmUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-red-700 mb-2">
              Delete "{deleteConfirmUser.fullName}"?
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              He user permanently delete hoil — data recover honar nahi. Are you sure?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteConfirmUser(null)}>Cancel</Button>
              <Button variant="danger" isLoading={deleting} onClick={() => void handleDeleteConfirm()}>
                <Trash2 size={14} className="mr-1" /> Yes, Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Centers + Programs Modal */}
      {editCentersUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setEditCentersUserId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Edit Center & Program Assignments</h3>
                <p className="text-sm text-neutral-500 mt-0.5">{editCentersUserName}</p>
              </div>
              <button onClick={() => setEditCentersUserId(null)} className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
              <p className="text-xs text-neutral-500 mb-3">
                Each row = one Center + Program combination. Teacher fakt tyacha assigned center + program che students baghel.
              </p>

              <div className="space-y-3">
                {editAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500 mb-1 block">Center</label>
                      <select
                        className="w-full h-9 rounded-lg border border-neutral-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={assignment.centerId}
                        onChange={(e) => updateAssignment(index, 'centerId', e.target.value)}
                      >
                        {centers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500 mb-1 block">Program (Optional)</label>
                      <select
                        className="w-full h-9 rounded-lg border border-neutral-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={assignment.programId || ''}
                        onChange={(e) => updateAssignment(index, 'programId', e.target.value || null)}
                      >
                        <option value="">-- All Programs --</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => removeAssignment(index)}
                      className="mt-5 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addAssignment}
                className="mt-3 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 transition-colors"
              >
                <Plus size={16} /> Add Center + Program
              </button>
            </div>

            <div className="flex justify-end gap-2 px-6 py-3 border-t border-neutral-100 bg-neutral-50">
              <Button variant="secondary" size="sm" onClick={() => setEditCentersUserId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={savingCenters}
                onClick={() => void handleSaveCenters()}
              >
                <Check size={14} className="mr-1" />
                Save Assignments
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-6">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">Create User</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleCreate}>
          <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="User ID / Email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} helperText="Minimum 8 characters" required />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">Role</label>
            <select
              className="h-11 rounded-lg border border-neutral-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>{r.toUpperCase().replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 mt-2">
            <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium mb-2 block">
              Assigned Centers
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-neutral-200 p-3 rounded-lg max-h-40 overflow-y-auto">
              {centers.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-neutral-50 p-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                    checked={selectedCenterIds.includes(c.id)}
                    onChange={() => toggleCenter(c.id)}
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 mt-1 italic">Assign at least one center to the user.</p>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" isLoading={creating} className="w-full md:w-auto">
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
            onKeyDown={(e) => { if (e.key === 'Enter') void loadData(); }}
          />
          <Button variant="secondary" onClick={() => void loadData()}>Search</Button>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <DataTable<UserWithCenters>
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