import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
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
  reassignUser,
  resetUserPassword,
  updateUser,
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
    ? ['super_admin', 'center_admin', 'tech_admin', 'teacher', 'staff', 'supervisor', 'volunteer', 'general_volunteer', 'sehat']
    : currentUser?.role === 'tech_admin'
    ? ['teacher', 'staff', 'volunteer', 'general_volunteer', 'sehat']
    : ['teacher', 'staff', 'volunteer', 'general_volunteer'];

  // The 'supervisor' role is the Swayam 2 coordinator; the 'volunteer' enum
  // value is actually the Digital Literacy (computer class) teacher.
  // 'general_volunteer' is the real, rotating "temp helper" role — separate
  // from Digital Literacy — used for short-term college volunteers.
  const roleLabel = (r: string) =>
    r === 'supervisor'
      ? 'SWAYAM COORDINATOR'
      : r === 'volunteer'
        ? 'DIGITAL LITERACY'
        : r === 'general_volunteer'
          ? 'VOLUNTEER'
          : r === 'sehat'
            ? 'SEHAT (HEALTH)'
            : r.toUpperCase().replace(/_/g, ' ');

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
  // Multi-role: click order matters — the FIRST selected role is the primary
  // one (it decides which dashboard the user lands on).
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['teacher']);
  const [selectedCenterIds, setSelectedCenterIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Edit roles modal
  const [editRolesUser, setEditRolesUser] = useState<UserWithCenters | null>(null);
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const toggleRole = (
    r: UserRole,
    list: UserRole[],
    setList: React.Dispatch<React.SetStateAction<UserRole[]>>,
  ) => {
    setList(list.includes(r) ? list.filter((x) => x !== r) : [...list, r]);
  };

  const rolesOf = (u: UserWithCenters): UserRole[] =>
    u.roles && u.roles.length ? u.roles : [u.role];

  // Edit centers+programs modal
  const [editCentersUserId, setEditCentersUserId] = useState<string | null>(null);
  const [editCentersUserName, setEditCentersUserName] = useState('');
  const [editAssignments, setEditAssignments] = useState<CenterProgramAssignment[]>([]);
  const [savingCenters, setSavingCenters] = useState(false);

  // Delete confirm
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithCenters | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reassign (reuse an inactive volunteer ID for a new person)
  const [reassignTarget, setReassignTarget] = useState<UserWithCenters | null>(null);
  const [reassignFullName, setReassignFullName] = useState('');
  const [reassignPhone, setReassignPhone] = useState('');
  const [reassignPassword, setReassignPassword] = useState('');
  const [reassignRoles, setReassignRoles] = useState<UserRole[]>(['general_volunteer']);
  const [reassignCenterIds, setReassignCenterIds] = useState<string[]>([]);
  const [reassigning, setReassigning] = useState(false);

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
    if (selectedRoles.length === 0) {
      setError('Select at least one role for the user.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createUser({
        email: email.trim(),
        fullName: fullName.trim(),
        password,
        role: selectedRoles[0],
        roles: selectedRoles,
        phone: phone.trim() || undefined,
        centerIds: selectedCenterIds,
      });
      setEmail('');
      setFullName('');
      setPassword('');
      setPhone('');
      setSelectedRoles(['teacher']);
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
      console.log("USER ID =", editCentersUserId);
      console.log("ASSIGNMENTS =", editAssignments);
      
      await updateUserCenters(editCentersUserId, editAssignments);
      setEditCentersUserId(null);
      await loadData();
    } catch {
      setError('Failed to update center assignments.');
    } finally {
      setSavingCenters(false);
    }
  };

  const openEditRoles = (user: UserWithCenters) => {
    setEditRolesUser(user);
    setEditRoles(rolesOf(user));
  };

  const handleSaveRoles = async () => {
    if (!editRolesUser) return;
    if (editRoles.length === 0) {
      setError('A user must have at least one role.');
      return;
    }
    setSavingRoles(true);
    setError(null);
    try {
      await updateUser(editRolesUser.id, { roles: editRoles });
      setEditRolesUser(null);
      await loadData();
    } catch (err: unknown) {
      let msg = 'Failed to update roles.';
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string; message?: string } | undefined;
        msg = data?.error || data?.message || `${msg} (${err.response?.status ?? 'network'})`;
      }
      setError(msg);
    } finally {
      setSavingRoles(false);
    }
  };

  const openReassign = (user: UserWithCenters) => {
    setReassignTarget(user);
    setReassignFullName('');
    setReassignPhone('');
    setReassignPassword('');
    setReassignRoles(rolesOf(user).length ? rolesOf(user) : ['general_volunteer']);
    setReassignCenterIds(user.centerAssignments?.map((a) => a.center?.id || a.centerId) || []);
  };

  const handleReassign = async () => {
    if (!reassignTarget) return;
    if (!reassignFullName.trim()) {
      setError('Enter the new volunteer\'s full name.');
      return;
    }
    if (reassignPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (reassignRoles.length === 0) {
      setError('Select at least one role.');
      return;
    }
    if (reassignCenterIds.length === 0) {
      setError('Assign at least one center.');
      return;
    }
    setReassigning(true);
    setError(null);
    try {
      await reassignUser(reassignTarget.id, {
        fullName: reassignFullName.trim(),
        phone: reassignPhone.trim() || undefined,
        password: reassignPassword,
        role: reassignRoles[0],
        roles: reassignRoles,
        centerIds: reassignCenterIds,
      });
      setReassignTarget(null);
      await loadData();
    } catch (err: unknown) {
      let msg = 'Failed to reassign this ID.';
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string; message?: string } | undefined;
        msg = data?.error || data?.message || msg;
      }
      setError(msg);
    } finally {
      setReassigning(false);
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
    {
      id: 'role',
      header: 'Roles',
      sortable: true,
      cell: (u) => (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {rolesOf(u).map((r, i) => (
            <span
              key={r}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                i === 0
                  ? 'bg-brand-50 text-brand-700 border-brand-200'
                  : 'bg-neutral-50 text-neutral-600 border-neutral-200'
              }`}
              title={i === 0 ? 'Primary role (decides the dashboard)' : undefined}
            >
              {roleLabel(r)}
            </span>
          ))}
        </div>
      ),
    },
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
            onClick={() => openEditRoles(u)}
            title="Add / remove roles"
          >
            Roles
          </Button>
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
          {!u.isActive && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openReassign(u)}
              title="Give this ID to a new volunteer — keeps all past data"
            >
              Reassign
            </Button>
          )}
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
              This user will be permanently deleted — the data cannot be recovered. Are you sure?
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

      {/* Edit Roles Modal */}
      {editRolesUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setEditRolesUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Edit Roles</h3>
                <p className="text-sm text-neutral-500 mt-0.5">{editRolesUser.fullName}</p>
              </div>
              <button onClick={() => setEditRolesUser(null)} className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs text-neutral-500 mb-3">
                Add or remove roles. The first role (★) is the primary one — it
                decides which dashboard this user lands on. The sidebar shows
                every section their roles unlock.
              </p>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((r) => {
                  const idx = editRoles.indexOf(r);
                  const active = idx !== -1;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRole(r, editRoles, setEditRoles)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
                      }`}
                    >
                      {roleLabel(r)}
                      {idx === 0 && ' ★'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-3 border-t border-neutral-100 bg-neutral-50">
              <Button variant="secondary" size="sm" onClick={() => setEditRolesUser(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" isLoading={savingRoles} onClick={() => void handleSaveRoles()}>
                <Check size={14} className="mr-1" />
                Save Roles
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
                Each row = one Center + Program combination. A teacher only sees students of their assigned center + program.
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

      {/* Reassign Modal — reuse an inactive volunteer ID for a new person */}
      {reassignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setReassignTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Reassign ID</h3>
                <p className="text-sm text-neutral-500 mt-0.5">{reassignTarget.email}</p>
              </div>
              <button onClick={() => setReassignTarget(null)} className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 max-h-[65vh] overflow-y-auto space-y-3">
              <p className="text-xs text-neutral-500">
                This login was previously used by <span className="font-medium">{reassignTarget.fullName}</span>.
                Give it to a new volunteer below — the email/ID stays the same,
                but the name, password, roles and centers update to the new
                person. Everything already recorded under this ID (attendance,
                activities, etc.) stays exactly as it was.
              </p>

              <Input label="New Volunteer's Full Name" value={reassignFullName} onChange={(e) => setReassignFullName(e.target.value)} required />
              <Input label="Phone" value={reassignPhone} onChange={(e) => setReassignPhone(e.target.value)} />
              <Input label="New Password" type="password" value={reassignPassword} onChange={(e) => setReassignPassword(e.target.value)} helperText="Minimum 8 characters" required />

              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium mb-1.5 block">
                  Roles
                </label>
                <div className="flex flex-wrap gap-2 border border-neutral-200 p-3 rounded-lg">
                  {roleOptions.map((r) => {
                    const idx = reassignRoles.indexOf(r);
                    const active = idx !== -1;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r, reassignRoles, setReassignRoles)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
                        }`}
                      >
                        {roleLabel(r)}
                        {idx === 0 && ' ★'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium mb-1.5 block">
                  Assigned Centers
                </label>
                <div className="grid grid-cols-2 gap-2 border border-neutral-200 p-3 rounded-lg max-h-32 overflow-y-auto">
                  {centers.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-neutral-50 p-1 rounded transition-colors">
                      <input
                        type="checkbox"
                        className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                        checked={reassignCenterIds.includes(c.id)}
                        onChange={() =>
                          setReassignCenterIds((prev) =>
                            prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                          )
                        }
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-3 border-t border-neutral-100 bg-neutral-50">
              <Button variant="secondary" size="sm" onClick={() => setReassignTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" isLoading={reassigning} onClick={() => void handleReassign()}>
                <Check size={14} className="mr-1" />
                Reassign & Activate
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
          <div className="w-full flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">
              Roles (select one or more)
            </label>
            <div className="flex flex-wrap gap-2 border border-neutral-200 p-3 rounded-lg">
              {roleOptions.map((r) => {
                const idx = selectedRoles.indexOf(r);
                const active = idx !== -1;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r, selectedRoles, setSelectedRoles)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
                    }`}
                  >
                    {roleLabel(r)}
                    {idx === 0 && ' ★'}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-neutral-500 italic">
              A user can hold multiple roles — they see every section their
              roles unlock. The first selected role (★) is the primary one and
              decides their dashboard.
            </p>
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