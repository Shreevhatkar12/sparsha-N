import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { PlusCircle, Search, Edit2, Eye, Trash2, DownloadCloud, UploadCloud } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import * as XLSX from 'xlsx';

export const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.currentUser);
  const { students, deleteStudent, importStudents } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.program.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCenter = currentUser?.role === 'admin' || currentUser?.centerIds.includes(student.center);
    return matchesSearch && matchesCenter;
  });

  const handleExport = () => {
    // Export specifically the filtered subset the user is currently viewing
    const worksheet = XLSX.utils.json_to_sheet(filteredStudents.map(s => ({
      'Student ID': s.id,
      'Name': s.name,
      'Class': s.class,
      'Program': s.program,
      'Center': s.center,
      'Status': s.status.toUpperCase()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "SPARSHA_Students_Export.xlsx", { compression: true });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        importStudents(data);
        alert(`Successfully imported ${data.length} students!`);
      } catch (err) {
        alert("Error parsing Excel file. Ensure it is a valid .xlsx or .csv");
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete ${name}?`)) {
      deleteStudent(id);
    }
  };

  return (
    <PageWrapper 
      title="Students"
      actions={
        <Button variant="primary" onClick={() => navigate('/students/new')}>
          <PlusCircle size={20} className="mr-2" />
          Add New Student
        </Button>
      }
    >
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-neutral-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-neutral-50/50">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <Input 
              placeholder="Search by name, program or location..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImport}
            />
            <Button variant="secondary" className="flex-1 md:flex-none bg-white font-medium" onClick={() => fileInputRef.current?.click()}>
               <UploadCloud size={16} className="mr-2 text-primary" /> Import Excel
            </Button>
            <Button variant="secondary" className="flex-1 md:flex-none bg-white font-medium" onClick={handleExport}>
               <DownloadCloud size={16} className="mr-2 text-primary" /> Export Data
            </Button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
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
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium text-neutral-900">{student.name}</TableCell>
                    <TableCell>Grade {student.class}</TableCell>
                    <TableCell>
                      <Badge variant="primary">{student.program}</Badge>
                    </TableCell>
                    <TableCell className="text-neutral-500">{student.center}</TableCell>
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
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                    No students found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-neutral-100">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div key={student.id} className="p-4 bg-white hover:bg-neutral-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-neutral-900">{student.name}</h3>
                    <p className="text-xs text-neutral-500">Class {student.class} • {student.center}</p>
                  </div>
                  <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                     {student.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <Badge variant="primary">{student.program}</Badge>
                  <div className="flex gap-2 text-neutral-400">
                    <button className="p-1 hover:text-primary" onClick={() => navigate(`/students/${student.id}`)}><Eye size={18} /></button>
                    <button className="p-1 hover:text-primary" onClick={() => navigate(`/students/${student.id}/edit`)}><Edit2 size={18} /></button>
                    <button className="p-1 text-danger/80 hover:text-danger" onClick={() => handleDelete(student.id, student.name)}><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))
           ) : (
             <div className="p-8 text-center text-neutral-500">
               No students found.
             </div>
           )}
        </div>

        {/* Pagination mock */}
        {filteredStudents.length > 0 && (
          <div className="p-4 border-t border-neutral-200 flex items-center justify-between text-sm text-neutral-500 bg-neutral-50/50">
             <span>Showing {filteredStudents.length} of {students.length} students</span>
             <div className="flex gap-1">
               <Button variant="secondary" size="sm" disabled>Previous</Button>
               <Button variant="secondary" size="sm">Next</Button>
             </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};
