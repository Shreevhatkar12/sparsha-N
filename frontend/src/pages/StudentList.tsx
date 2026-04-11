import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { Search, Filter, Download, Plus, LayoutGrid, List, Eye, Edit2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';

export const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const { students, deleteStudent, importStudents } = useDataStore();

  const [searchQuery, setSearchQuery] = useState('');
  const statusFilter: string = 'All';
  const [programFilter, setProgramFilter] = useState('All');
  const [centerFilter, setCenterFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Derive unique centers from data for dynamic dropdown
  const availableCenters = useMemo(() => {
    const centers = new Set(students.map(s => s.center));
    return Array.from(centers).sort();
  }, [students]);

  // Advanced Data Grid Processing
  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || s.status === statusFilter.toLowerCase();
      const matchProgram = programFilter === 'All' || s.program === programFilter;
      const matchCenter = centerFilter === 'All' || s.center === centerFilter;
      
      const roleMatch = isAdmin ? true : currentUser?.centerIds.includes(s.center);
      
      return matchSearch && matchStatus && matchProgram && matchCenter && roleMatch;
    });

    if (sortOrder === 'asc') {
      result.sort((a,b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a,b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [students, searchQuery, statusFilter, programFilter, centerFilter, sortOrder, isAdmin, currentUser]);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to completely remove ${name} from the system?`)) {
      deleteStudent(id);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredStudents.map(student => ({
      ID: student.id,
      Name: student.name,
      Class: student.class,
      Program: student.program,
      Center: student.center,
      Status: student.status,
      EnrollmentDate: student.enrollmentDate
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered_Students");
    XLSX.writeFile(workbook, "SPARSHA_Students_Export.xlsx", { compression: true });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet);
        
        importStudents(rawJson as any[]);
        alert(`Successfully imported ${rawJson.length} students into global memory!`);
      } catch (err) {
        alert("Error parsing Excel file. Ensure headers match expected formats.");
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // reset
  };

  return (
    <PageWrapper 
      title="Student Directory"
      actions={
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            id="excel-upload"
            onChange={handleImport}
          />
          {isAdmin && (
             <label htmlFor="excel-upload" className="flex items-center justify-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer shadow-sm transition-colors">
               Import XLS
             </label>
          )}
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} className="mr-2" /> Export XLS
          </Button>
          <Button variant="primary" onClick={() => navigate('/students/new')}>
            <Plus size={16} className="mr-2" /> Add Student
          </Button>
        </div>
      }
    >
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-neutral-50 p-3 rounded-lg border border-neutral-100 mb-4">
          
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-neutral-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name..."
              className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary focus:border-primary sm:text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex w-full md:w-auto flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 px-2">
              <Filter size={16} className="text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700">Filters:</span>
            </div>
            
            <select 
              className="py-2 pl-3 pr-8 text-sm border border-neutral-300 rounded-lg focus:ring-primary outline-none"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
            >
              <option value="All">All Programs</option>
              <option value="SWAYAM">SWAYAM</option>
              <option value="Shiksha">Shiksha</option>
              <option value="Sanskar">Sanskar</option>
            </select>

            <select 
              className="py-2 pl-3 pr-8 text-sm border border-neutral-300 rounded-lg focus:ring-primary outline-none"
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
            >
              <option value="All">All Centers</option>
              {availableCenters.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select 
              className="py-2 pl-3 pr-8 text-sm border border-neutral-300 rounded-lg focus:ring-primary outline-none bg-neutral-100"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <option value="asc">A to Z</option>
              <option value="desc">Z to A</option>
            </select>

            <div className="hidden sm:flex border border-neutral-300 rounded-lg overflow-hidden ml-2">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                      No students match the current advanced filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-neutral-900">
                        {student.name}
                        <div className="text-xs text-neutral-500 md:hidden mt-1">{student.center} | {student.program}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{student.class}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="primary">{student.program}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{student.center}</TableCell>
                      <TableCell>
                        <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                          {student.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                         <Button variant="ghost" size="sm" className="px-2" title="View Details" onClick={() => navigate(`/students/${student.id}`)}>
                           <Eye size={16} />
                         </Button>
                         <Button variant="ghost" size="sm" className="px-2" title="Edit" onClick={() => navigate(`/students/${student.id}/edit`)}>
                           <Edit2 size={16} />
                         </Button>
                         <Button variant="ghost" size="sm" className="px-2 text-danger hover:bg-danger/10 hover:text-danger" title="Delete" onClick={() => handleDelete(student.id, student.name)}>
                           <Trash2 size={16} />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map((student) => (
              <div key={student.id} className="border border-neutral-200 rounded-xl p-4 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                    {student.name.charAt(0)}
                  </div>
                  <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                    {student.status.toUpperCase()}
                  </Badge>
                </div>
                <h3 className="font-semibold text-neutral-900 line-clamp-1">{student.name}</h3>
                <p className="text-sm text-neutral-500 mb-2">{student.center} • Class {student.class}</p>
                
                <div className="flex justify-between items-center mt-4 border-t border-neutral-100 pt-3">
                  <Badge variant="primary">{student.program}</Badge>
                  <div className="flex gap-2 text-neutral-400">
                    <button className="p-1 hover:text-primary" onClick={() => navigate(`/students/${student.id}`)}><Eye size={16} /></button>
                    <button className="p-1 hover:text-primary" onClick={() => navigate(`/students/${student.id}/edit`)}><Edit2 size={16} /></button>
                    <button className="p-1 text-danger/80 hover:text-danger" onClick={() => handleDelete(student.id, student.name)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
};
