import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { Search, Download, Plus, Eye, Edit2, Trash2, ArrowUp, ArrowDown, Building2, ArrowRightLeft, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../store/useAuthStore';
import { deleteStudent, getStudents, requestTransfer, getTransferRequests, completeTransfer, type StudentListQuery } from '../services/students.service';
import { listCenters, listPrograms } from '../services/centers.service';
import { listUsers, type UserAdminItem } from '../services/users.service';
import type { Student, CenterSummary, ProgramSummary } from '../types';

type Row = Student & { _programName: string; _centerName: string; _addedBy: string };

const STANDARD_OPTIONS = ['All', 'KG', 'Sr KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

export const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedCenterId = useAuthStore((s) => s.selectedCenterId);

  const isAdmin = ['super_admin', 'center_admin', 'tech_admin'].includes(currentUser?.role || '');
  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'staff';
  // supervisor = Swayam 2 coordinator: program-locked to Swayam 2.
  const isCoordinator = currentUser?.role === 'supervisor';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCenterId, setFilterCenterId] = useState('');
  const [filterPrograms, setFilterPrograms] = useState<string[]>([]);
  const [filterStandards, setFilterStandards] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'name_asc' | 'name_desc' | 'roll_asc' | 'roll_desc' | 'std_asc' | 'std_desc' | ''>('roll_asc');

  const [centers, setCenters] = useState<CenterSummary[]>([]);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  // Transfer mode state (teacher side)
  const [transferMode, setTransferMode] = useState(false);
  const [selectedForTransfer, setSelectedForTransfer] = useState<Set<string>>(new Set());
  const [transferLoading, setTransferLoading] = useState(false);

  // Admin transfer tab
  const [showTransferTab, setShowTransferTab] = useState(false);
  const [transferRequests, setTransferRequests] = useState<Row[]>([]);
  const [transferReqLoading, setTransferReqLoading] = useState(false);
  const [selectedTransferIds, setSelectedTransferIds] = useState<Set<string>>(new Set());
  const [newTeacherId, setNewTeacherId] = useState('');
  const [newCenterId, setNewCenterId] = useState('');
  const [teachers, setTeachers] = useState<UserAdminItem[]>([]);
  const [completeTransferLoading, setCompleteTransferLoading] = useState(false);

  useEffect(() => {
    Promise.all([listCenters(), listPrograms()])
      .then(([cRes, pRes]) => {
        // For teachers, filter centers to only their assigned ones
        if (isTeacher && currentUser?.centerIds?.length) {
          const assigned = cRes.filter((c: CenterSummary) =>
            currentUser.centerIds.includes(c.id)
          );
          setCenters(assigned);
        } else {
          setCenters(cRes);
        }
        // Coordinator only works with Swayam 2 — hide other program chips.
        if (isCoordinator) {
          setPrograms(pRes.filter((p: ProgramSummary) => (p.name || '').toLowerCase().includes('swayam 2')));
        } else {
          setPrograms(pRes);
        }
      })
      .catch(console.error);

    // Admin: load teachers list for transfer completion
    if (isAdmin) {
      listUsers({ role: 'teacher' as any, limit: 200 })
        .then((res) => setTeachers(res.users))
        .catch(console.error);
    }
  }, [isTeacher, isAdmin, isCoordinator, currentUser?.centerIds]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: StudentListQuery = {
        page,
        limit: 50,
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        ...(filterPrograms.length ? { programId: filterPrograms.join(',') } : {}),
        ...(filterStandards.length ? { standard: filterStandards.join(',') } : {}),
        ...(sortOrder ? { sortOrder } : {}),
      };

      // Center filtering logic:
      // Swayam coordinator (supervisor) is program-scoped — sees all centers
      // unless they explicitly pick one, same as admins.
      if (isAdmin || isCoordinator) {
        if (filterCenterId) {
          params.centerId = filterCenterId;
        }
      } else {
        if (filterCenterId) {
          params.centerId = filterCenterId;
        } else if (selectedCenterId) {
          params.centerId = selectedCenterId;
        }
      }

      const res = await getStudents(params);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
      setRows(
        res.students.map((s) => ({
          ...s,
          _programName: s.program?.name ?? s.programId,
          _centerName: s.center?.name ?? s.centerId,
          _addedBy: s.createdByUser?.fullName ?? '—',
        })),
      );
    } catch {
      setError('Failed to load students.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, isAdmin, isCoordinator, selectedCenterId, filterCenterId, filterPrograms, filterStandards, sortOrder]);

  useEffect(() => {
    if (!showTransferTab) {
      void load();
    }
  }, [load, showTransferTab]);

  // Load transfer requests for admin
  const loadTransferRequests = useCallback(async () => {
    setTransferReqLoading(true);
    try {
      const students = await getTransferRequests();
      setTransferRequests(
        (students || []).map((s: Student) => ({
          ...s,
          _programName: s.program?.name ?? s.programId,
          _centerName: s.center?.name ?? s.centerId,
          _addedBy: s.createdByUser?.fullName ?? '—',
        }))
      );
    } catch {
      setError('Failed to load transfer requests.');
    } finally {
      setTransferReqLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showTransferTab && isAdmin) {
      void loadTransferRequests();
    }
  }, [showTransferTab, isAdmin, loadTransferRequests]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStudent(deleteId);
      setDeleteId(null);
      await load();
    } catch {
      setError('Could not remove student.');
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    const dataToExport = rows.map((student) => ({
      ID: student.id,
      Name: student.fullName,
      'Roll Number': student.rollNumber || '—',
      Program: student._programName,
      Standard: student.standard || '—',
      Center: student._centerName,
      'Date of Birth': student.dob ? new Date(student.dob).toLocaleDateString() : '—',
      Gender: student.gender || '—',
      'Guardian Name': student.guardianName || '—',
      'Guardian Phone': student.guardianPhone || '—',
      'Enrollment Date': student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : '—',
      'Total Fees': student.totalFees || 0,
      'Fees Paid': student.feesPaid || 0,
      ...(isAdmin ? { 'Added By': student._addedBy } : {}),
      Status: student.isActive ? 'active' : 'inactive',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'SPARSHA_Students_Export.xlsx', { compression: true });
  };

  // Teacher: toggle transfer selection
  const toggleTransferSelect = (id: string) => {
    setSelectedForTransfer((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Teacher: submit transfer request
  const handleRequestTransfer = async () => {
    if (selectedForTransfer.size === 0) return;
    setTransferLoading(true);
    try {
      await requestTransfer(Array.from(selectedForTransfer));
      setTransferMode(false);
      setSelectedForTransfer(new Set());
      await load();
    } catch {
      setError('Failed to request transfer.');
    } finally {
      setTransferLoading(false);
    }
  };

  // Admin: toggle transfer request selection
  const toggleTransferReqSelect = (id: string) => {
    setSelectedTransferIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Admin: complete transfer
  const handleCompleteTransfer = async () => {
    if (selectedTransferIds.size === 0 || !newTeacherId || !newCenterId) {
      setError('Please select students, a new teacher, and a new center.');
      return;
    }
    setCompleteTransferLoading(true);
    try {
      await completeTransfer(Array.from(selectedTransferIds), newTeacherId, newCenterId);
      setSelectedTransferIds(new Set());
      setNewTeacherId('');
      setNewCenterId('');
      await loadTransferRequests();
    } catch {
      setError('Failed to complete transfer.');
    } finally {
      setCompleteTransferLoading(false);
    }
  };

  const columns: DataTableColumn<Row>[] = [
    // Transfer checkbox column (teacher mode)
    ...(transferMode ? [{
      id: 'select' as const,
      header: '',
      className: 'w-[40px]',
      cell: (s: Row) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleTransferSelect(s.id); }}
          className="text-neutral-500 hover:text-brand-700 transition-colors"
        >
          {selectedForTransfer.has(s.id)
            ? <CheckSquare size={18} className="text-brand-600" />
            : <Square size={18} />}
        </button>
      ),
    }] : []),
    {
      id: 'fullName',
      header: 'Student',
      sortable: true,
      cell: (s) => (
        <div>
          <div className="font-medium text-neutral-900">{s.fullName}</div>
          <div className="text-xs text-neutral-500 md:hidden mt-1">
            {s._centerName} · {s._programName}
          </div>
        </div>
      ),
    },
    {
      id: '_programName',
      header: 'Program',
      sortable: true,
      className: 'hidden md:table-cell',
      accessor: (s) => s._programName,
    },
    {
      id: 'rollNumber',
      header: 'Roll No',
      sortable: true,
      className: 'hidden sm:table-cell',
      accessor: (s) => s.rollNumber || '—',
    },
    {
      id: 'standard',
      header: 'Std',
      sortable: true,
      className: 'hidden sm:table-cell',
      accessor: (s) => s.standard || '—',
    },
    {
      id: '_centerName',
      header: 'Center',
      sortable: true,
      className: 'hidden sm:table-cell',
      accessor: (s) => s._centerName,
    },
    // "Added By" column for admin
    ...(isAdmin ? [{
      id: '_addedBy' as const,
      header: 'Added By',
      className: 'hidden lg:table-cell',
      accessor: (s: Row) => s._addedBy,
    }] : []),
    {
      id: 'isActive',
      header: 'Status',
      cell: (s) => (
        <Badge variant={s.isActive !== false ? 'success' : 'neutral'}>
          {(s.isActive !== false ? 'ACTIVE' : 'INACTIVE').toUpperCase()}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'text-right w-[140px]',
      cell: (s) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="px-2" title="View" onClick={() => navigate(`/students/${s.id}`)}>
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            title="Edit"
            onClick={() => navigate(`/students/${s.id}/edit`)}
          >
            <Edit2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-danger hover:bg-danger/10"
            title="Delete permanently"
            onClick={() => {
              setDeleteName(s.fullName);
              setDeleteId(s.id);
            }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  // Admin: Transfer requests table columns
  const transferColumns: DataTableColumn<Row>[] = [
    {
      id: 'select',
      header: '',
      className: 'w-[40px]',
      cell: (s) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleTransferReqSelect(s.id); }}
          className="text-neutral-500 hover:text-brand-700 transition-colors"
        >
          {selectedTransferIds.has(s.id)
            ? <CheckSquare size={18} className="text-brand-600" />
            : <Square size={18} />}
        </button>
      ),
    },
    {
      id: 'fullName',
      header: 'Student',
      cell: (s) => <span className="font-medium text-neutral-900">{s.fullName}</span>,
    },
    {
      id: '_programName',
      header: 'Program',
      accessor: (s) => s._programName,
    },
    {
      id: '_centerName',
      header: 'Current Center',
      accessor: (s) => s._centerName,
    },
    {
      id: '_addedBy',
      header: 'Current Teacher',
      accessor: (s) => s._addedBy,
    },
  ];

  return (
    <PageWrapper
      title="Student Directory"
      actions={
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} className="mr-2" /> Export XLS
          </Button>
          <Button variant="primary" onClick={() => navigate('/students/new')}>
            <Plus size={16} className="mr-2" /> Add Student
          </Button>
        </div>
      }
    >
      <ConfirmModal
        open={Boolean(deleteId)}
        title="Delete student permanently?"
        message={`${deleteName} will be permanently deleted along with all their attendance, exam marks, meeting and form records. This cannot be undone.`}
        confirmLabel="Delete Permanently"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteId(null)}
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Admin: tab switcher for Students / Transfer Requests */}
      {isAdmin && (
        <div className="flex items-center gap-2 mb-4">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !showTransferTab
                ? 'bg-brand-50 text-brand-800 border border-brand-200 shadow-sm'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
            onClick={() => setShowTransferTab(false)}
          >
            All Students
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showTransferTab
                ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
            onClick={() => setShowTransferTab(true)}
          >
            <ArrowRightLeft size={16} />
            Transfer Requests
            {transferRequests.length > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-1 font-bold">
                {transferRequests.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Admin Transfer Requests Tab */}
      {isAdmin && showTransferTab ? (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4 border-b border-neutral-100 pb-3">
            Pending Transfer Requests
          </h2>

          {transferReqLoading ? (
            <LoadingSpinner />
          ) : transferRequests.length === 0 ? (
            <EmptyState
              title="No pending transfers"
              description="Transfer requests from teachers will appear here."
            />
          ) : (
            <>
              <DataTable<Row>
                columns={transferColumns}
                data={transferRequests}
                rowKey={(r) => r.id}
                filterKeys={['fullName', '_programName', '_centerName']}
                filterPlaceholder="Filter…"
              />

              {selectedTransferIds.size > 0 && (
                <div className="mt-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">
                    Complete Transfer ({selectedTransferIds.size} selected)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">New Teacher</label>
                      <select
                        value={newTeacherId}
                        onChange={(e) => setNewTeacherId(e.target.value)}
                        className="block w-full py-2 px-3 border border-neutral-300 bg-white rounded-lg focus:ring-primary focus:border-primary sm:text-sm"
                      >
                        <option value="">Select teacher…</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">New Center</label>
                      <select
                        value={newCenterId}
                        onChange={(e) => setNewCenterId(e.target.value)}
                        className="block w-full py-2 px-3 border border-neutral-300 bg-white rounded-lg focus:ring-primary focus:border-primary sm:text-sm"
                      >
                        <option value="">Select center…</option>
                        {centers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      isLoading={completeTransferLoading}
                      onClick={() => void handleCompleteTransfer()}
                      disabled={!newTeacherId || !newCenterId}
                    >
                      <ArrowRightLeft size={16} className="mr-2" />
                      Complete Transfer
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      ) : (
        /* Main Student List */
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-neutral-50 p-3 rounded-lg border border-neutral-100 mb-4">
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-neutral-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name…"
                  className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary focus:border-primary sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void load();
                  }}
                />
              </div>

              <div className="flex bg-neutral-200/50 p-1 rounded-lg border border-neutral-200 items-center overflow-x-auto whitespace-nowrap">
                <span className="text-xs font-semibold text-neutral-500 uppercase px-2">Sort:</span>
                <button
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md font-medium transition-colors ${sortOrder.startsWith('roll') ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                  onClick={() => {
                    if (sortOrder === 'roll_asc') setSortOrder('roll_desc');
                    else setSortOrder('roll_asc');
                    setPage(1);
                  }}
                >
                  Roll Number
                  {sortOrder === 'roll_asc' && <ArrowUp size={14} />}
                  {sortOrder === 'roll_desc' && <ArrowDown size={14} />}
                </button>
                <button
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md font-medium transition-colors ${sortOrder.startsWith('name') ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                  onClick={() => {
                    if (sortOrder === 'name_asc') setSortOrder('name_desc');
                    else setSortOrder('name_asc');
                    setPage(1);
                  }}
                >
                  Name
                  {sortOrder === 'name_asc' && <ArrowUp size={14} />}
                  {sortOrder === 'name_desc' && <ArrowDown size={14} />}
                </button>
                <button
                  className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md font-medium transition-colors ${sortOrder.startsWith('std') ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                  onClick={() => {
                    if (sortOrder === 'std_asc') setSortOrder('std_desc');
                    else setSortOrder('std_asc');
                    setPage(1);
                  }}
                >
                  Std
                  {sortOrder === 'std_asc' && <ArrowUp size={14} />}
                  {sortOrder === 'std_desc' && <ArrowDown size={14} />}
                </button>
              </div>

              <select
                id="center-filter"
                className="block w-full md:w-auto py-2 px-3 border border-neutral-300 bg-white rounded-lg focus:ring-primary focus:border-primary sm:text-sm"
                value={filterCenterId}
                onChange={(e) => {
                  setFilterCenterId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">
                  {isTeacher ? 'My Centers' : 'All Centers'}
                </option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              {/* Transfer mode toggle for teachers */}
              {isTeacher && (
                <Button
                  variant={transferMode ? 'primary' : 'secondary'}
                  size="sm"
                  type="button"
                  onClick={() => {
                    setTransferMode(!transferMode);
                    setSelectedForTransfer(new Set());
                  }}
                >
                  <ArrowRightLeft size={16} className="mr-1" />
                  {transferMode ? 'Cancel Transfer' : 'Transfer'}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Filters — built from the real programs list (each chip = a valid program UUID). Multi-select. */}
          <div className="flex flex-wrap gap-2 mb-3 px-1">
            <span className="text-xs font-semibold text-neutral-500 uppercase flex items-center mr-2">Program:</span>
            {!isCoordinator && (
              <Button
                variant={filterPrograms.length === 0 ? 'primary' : 'secondary'}
                size="sm"
                className="text-xs rounded-full"
                onClick={() => { setFilterPrograms([]); setPage(1); }}
              >All Programs</Button>
            )}
            {programs.map((p) => (
              <Button
                key={p.id}
                variant={isCoordinator || filterPrograms.includes(p.id) ? 'primary' : 'secondary'}
                size="sm"
                className="text-xs rounded-full"
                onClick={() => {
                  if (isCoordinator) return;
                  setFilterPrograms((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]);
                  setPage(1);
                }}
              >{p.name}</Button>
            ))}
          </div>

          {/* Standard Filter — multi-select */}
          <div className="flex flex-wrap gap-2 items-center mb-4 px-1">
            <span className="text-xs font-semibold text-neutral-500 uppercase flex items-center mr-2">Standard:</span>
            {STANDARD_OPTIONS.map((std) => {
              const isAllChip = std === 'All';
              const active = isAllChip ? filterStandards.length === 0 : filterStandards.includes(std);
              return (
                <Button
                  key={std}
                  variant={active ? 'primary' : 'secondary'}
                  size="sm"
                  className="text-xs rounded-full"
                  onClick={() => {
                    if (isAllChip) {
                      setFilterStandards([]);
                    } else {
                      setFilterStandards((prev) => prev.includes(std) ? prev.filter((x) => x !== std) : [...prev, std]);
                    }
                    setPage(1);
                  }}
                >{std}</Button>
              );
            })}
          </div>

          {/* Transfer request banner */}
          {transferMode && selectedForTransfer.size > 0 && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
              <span className="text-sm font-medium text-amber-800">
                {selectedForTransfer.size} student{selectedForTransfer.size > 1 ? 's' : ''} selected for transfer
              </span>
              <Button
                variant="primary"
                size="sm"
                isLoading={transferLoading}
                onClick={() => void handleRequestTransfer()}
              >
                <ArrowRightLeft size={16} className="mr-1" />
                Request Transfer to Admin
              </Button>
            </div>
          )}

          {/* Teacher context info */}
          {isTeacher && !transferMode && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <Building2 size={14} className="text-neutral-400" />
              <span className="text-xs text-neutral-500">
                Showing your students
                {selectedCenterId && centers.length > 0 && (
                  <> in <span className="font-medium text-neutral-700">
                    {centers.find(c => c.id === selectedCenterId)?.name || 'selected center'}
                  </span></>
                )}
              </span>
            </div>
          )}

          {/* Student count */}
          {totalCount > 0 && (
            <div className="flex items-center mb-3 px-1">
              <span className="text-sm text-neutral-500">
                {totalCount} student{totalCount !== 1 ? 's' : ''} found
              </span>
            </div>
          )}

          {loading && rows.length === 0 ? (
            <LoadingSpinner />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No students found"
              description={isTeacher
                ? "You haven't added any students yet, or try switching your center."
                : "Try another search or add a new student."}
              action={
                <Button variant="primary" onClick={() => navigate('/students/new')}>
                  Add student
                </Button>
              }
            />
          ) : (
            <div className={`transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              <DataTable<Row>
                columns={columns}
                data={rows}
                rowKey={(r) => r.id}
                filterKeys={['fullName', '_programName', '_centerName']}
                filterPlaceholder="Filter loaded page…"
              />
            </div>
          )}

          {totalPages > 1 && !loading && (
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="self-center text-sm text-neutral-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      )}
    </PageWrapper>
  );
};
