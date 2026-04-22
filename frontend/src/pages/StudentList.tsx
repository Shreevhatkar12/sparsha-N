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
import { Search, Download, Plus, Eye, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../store/useAuthStore';
import { deleteStudent, getStudents, type StudentListQuery } from '../services/students.service';
import { listCenters, listPrograms } from '../services/centers.service';
import type { Student, CenterSummary, ProgramSummary } from '../types';

type Row = Student & { _programName: string; _centerName: string };

export const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const selectedCenterId = useAuthStore((s) => s.selectedCenterId);
  const isAdmin = currentUser?.role === 'admin';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCenterId, setFilterCenterId] = useState('');
  const [filterProgramId, setFilterProgramId] = useState('');
  const [sortOrder, setSortOrder] = useState<'name_asc' | 'name_desc' | 'roll_asc' | 'roll_desc' | ''>('');
  
  const [centers, setCenters] = useState<CenterSummary[]>([]);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  useEffect(() => {
    Promise.all([listCenters(), listPrograms()])
      .then(([cRes, pRes]) => {
        setCenters(cRes);
        setPrograms(pRes);
      })
      .catch(console.error);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: StudentListQuery = {
        page,
        limit: 50,
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        ...(!isAdmin && selectedCenterId ? { centerId: selectedCenterId } : (filterCenterId ? { centerId: filterCenterId } : {})),
        ...(filterProgramId ? { programId: filterProgramId } : {}),
        ...(sortOrder ? { sortOrder } : {})
      };
      const res = await getStudents(params);
      setTotalPages(res.totalPages);
      setRows(
        res.students.map((s) => ({
          ...s,
          _programName: s.program?.name ?? s.programId,
          _centerName: s.center?.name ?? s.centerId,
        })),
      );
    } catch {
      setError('Failed to load students.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, isAdmin, selectedCenterId, filterCenterId, filterProgramId, sortOrder]);

  useEffect(() => {
    void load();
  }, [load]);

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
      Program: student._programName,
      Center: student._centerName,
      Status: student.isActive ? 'active' : 'inactive',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'SPARSHA_Students_Export.xlsx', { compression: true });
  };

  const columns: DataTableColumn<Row>[] = [
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
      id: '_centerName',
      header: 'Center',
      sortable: true,
      className: 'hidden sm:table-cell',
      accessor: (s) => s._centerName,
    },
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
            title="Deactivate"
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
        title="Deactivate student?"
        message={`This will mark ${deleteName} as inactive. You can continue to see them in filtered lists.`}
        confirmLabel="Deactivate"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteId(null)}
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

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
            </div>
            
            <select
                className="block w-full md:w-auto py-2 px-3 border border-neutral-300 bg-white rounded-lg focus:ring-primary focus:border-primary sm:text-sm"
                value={filterCenterId}
                onChange={(e) => {
                  setFilterCenterId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Centers</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

            <select
              className="block w-full md:w-auto py-2 px-3 border border-neutral-300 bg-white rounded-lg focus:ring-primary focus:border-primary sm:text-sm"
              value={filterProgramId}
              onChange={(e) => {
                setFilterProgramId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Classes</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Button variant="secondary" size="sm" type="button" onClick={() => void load()}>
            Apply Filters
          </Button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No students found"
            description="Try another search or add a new student."
            action={
              <Button variant="primary" onClick={() => navigate('/students/new')}>
                Add student
              </Button>
            }
          />
        ) : (
          <DataTable<Row>
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
            filterKeys={['fullName', '_programName', '_centerName']}
            filterPlaceholder="Filter loaded page…"
          />
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
    </PageWrapper>
  );
};
