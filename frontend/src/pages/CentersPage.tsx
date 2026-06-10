import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Building2, Plus, MapPin, Users, GraduationCap, ArrowLeft, UserCircle, Pencil, Trash2 } from 'lucide-react';
import { listCenters, getCenterDetails, createCenter, updateCenter, deleteCenter } from '../services/centers.service';
import { Input } from '../components/ui/Input';
import type { CenterSummary } from '../types';

interface CenterDetail {
  id: string;
  name: string;
  location?: string | null;
  isActive: boolean;
  teachers: { id: string; fullName: string; email: string; role: string }[];
  students: { id: string; fullName: string; rollNumber?: string | null; programId: string }[];
  userCount: number;
  studentCount: number;
  centerPrograms?: { program: { id: string; name: string } }[];
}

export const CentersPage: React.FC = () => {
  const navigate = useNavigate();
  const [centers, setCenters] = useState<CenterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCenter, setSelectedCenter] = useState<CenterDetail | null>(null);
  const [_detailLoading, setDetailLoading] = useState(false);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Edit form
  const [editCenter, setEditCenter] = useState<CenterSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<CenterSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCenters();
      setCenters(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load centers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSelectCenter = async (centerId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await getCenterDetails(centerId);
      setSelectedCenter(detail);
    } catch {
      setError('Failed to load center details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setFormSaving(true);
    try {
      await createCenter({ name: formName.trim(), location: formLocation.trim() || undefined });
      setFormName('');
      setFormLocation('');
      setShowForm(false);
      await load();
    } catch {
      setError('Failed to create center.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleEditOpen = (e: React.MouseEvent, c: CenterSummary) => {
    e.stopPropagation();
    setEditCenter(c);
    setEditName(c.name);
    setEditLocation(c.location || '');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCenter || !editName.trim()) return;
    setEditSaving(true);
    try {
      await updateCenter(editCenter.id, { name: editName.trim(), location: editLocation.trim() || undefined });
      setEditCenter(null);
      await load();
    } catch {
      setError('Failed to update center.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteCenter(deleteConfirm.id);
      setDeleteConfirm(null);
      await load();
    } catch {
      setError('Failed to delete center.');
    } finally {
      setDeleting(false);
    }
  };

  // Detail view
  if (selectedCenter) {
    return (
      <PageWrapper
        title={selectedCenter.name}
        actions={
          <Button variant="secondary" onClick={() => setSelectedCenter(null)}>
            <ArrowLeft size={16} className="mr-2" /> Back to Centers
          </Button>
        }
      >
        {error && <ErrorMessage message={error} />}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="py-4 text-center">
            <MapPin size={20} className="mx-auto text-neutral-400 mb-1" />
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Location</p>
            <p className="font-semibold text-neutral-900">{selectedCenter.location || '—'}</p>
          </Card>
          <Card className="py-4 text-center">
            <Users size={20} className="mx-auto text-blue-500 mb-1" />
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Teachers</p>
            <p className="text-2xl font-bold text-neutral-900">{selectedCenter.userCount}</p>
          </Card>
          <Card className="py-4 text-center">
            <GraduationCap size={20} className="mx-auto text-emerald-500 mb-1" />
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Students</p>
            <p className="text-2xl font-bold text-neutral-900">{selectedCenter.studentCount}</p>
          </Card>
        </div>

        {selectedCenter.centerPrograms && selectedCenter.centerPrograms.length > 0 && (
          <Card className="mb-6">
            <h3 className="text-md font-semibold text-neutral-900 mb-3 border-b border-neutral-100 pb-2">Programs</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCenter.centerPrograms.map((cp) => (
                <span key={cp.program.id} className="px-3 py-1 bg-brand-50 text-brand-800 rounded-full text-sm font-medium border border-brand-100">
                  {cp.program.name}
                </span>
              ))}
            </div>
          </Card>
        )}

        <Card className="mb-6">
          <h3 className="text-md font-semibold text-neutral-900 mb-3 border-b border-neutral-100 pb-2">
            <Users size={16} className="inline mr-2 text-blue-500" />Assigned Teachers
          </h3>
          {selectedCenter.teachers.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">No teachers assigned.</p>
          ) : (
            <div className="space-y-2">
              {selectedCenter.teachers.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2 bg-neutral-50 rounded-lg">
                  <UserCircle size={20} className="text-neutral-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{t.fullName}</p>
                    <p className="text-xs text-neutral-500">{t.email} · <span className="capitalize">{t.role}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="mb-6">
          <h3 className="text-md font-semibold text-neutral-900 mb-3 border-b border-neutral-100 pb-2">
            <GraduationCap size={16} className="inline mr-2 text-emerald-500" />Enrolled Students
          </h3>
          {selectedCenter.students.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">No students enrolled.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Roll No</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCenter.students.map((s) => (
                    <tr key={s.id} className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer" onClick={() => navigate(`/students/${s.id}`)}>
                      <td className="py-2 pr-3 font-medium text-neutral-900">{s.fullName}</td>
                      <td className="py-2 pr-3 text-neutral-600">{s.rollNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageWrapper>
    );
  }

  // Grid view
  return (
    <PageWrapper
      title="Center Management"
      actions={
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={16} className="mr-2" /> Add New Center
        </Button>
      }
    >
      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      {/* Add form */}
      {showForm && (
        <Card className="mb-6 border-2 border-brand-200 bg-brand-50/30">
          <h3 className="text-md font-semibold text-neutral-900 mb-4">New Center</h3>
          <form onSubmit={(e) => void handleCreateCenter(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Center Name *" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <Input label="Address / Location" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" type="submit" isLoading={formSaving}>Create Center</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Edit form */}
      {editCenter && (
        <Card className="mb-6 border-2 border-blue-200 bg-blue-50/30">
          <h3 className="text-md font-semibold text-neutral-900 mb-4">Edit Center — {editCenter.name}</h3>
          <form onSubmit={(e) => void handleEditSave(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Center Name *" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            <Input label="Address / Location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button variant="secondary" type="button" onClick={() => setEditCenter(null)}>Cancel</Button>
              <Button variant="primary" type="submit" isLoading={editSaving}>Save Changes</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Card className="mb-6 border-2 border-red-200 bg-red-50/30">
          <h3 className="text-md font-semibold text-red-700 mb-2">Delete "{deleteConfirm.name}"?</h3>
          <p className="text-sm text-neutral-600 mb-4">He center permanently delete hoil. Are you sure?</p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" type="button" isLoading={deleting} onClick={() => void handleDeleteConfirm()}>
              Yes, Delete
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : centers.length === 0 ? (
        <Card className="py-12 text-center">
          <Building2 size={48} className="mx-auto text-neutral-300 mb-3" />
          <p className="text-neutral-500">No centers found. Add one to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:shadow-lg hover:border-brand-300 transition-all duration-200 group"
              onClick={() => void handleSelectCenter(c.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center shrink-0 group-hover:from-brand-200 group-hover:to-brand-300 transition-colors">
                    <Building2 size={24} className="text-brand-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-neutral-900 group-hover:text-brand-800 transition-colors">{c.name}</h3>
                    {c.location && (
                      <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {c.location}
                      </p>
                    )}
                  </div>
                </div>
                {/* Edit / Delete buttons */}
                <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Edit"
                    onClick={(e) => handleEditOpen(e, c)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c); }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
};