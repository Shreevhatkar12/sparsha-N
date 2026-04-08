import { create } from 'zustand';

export interface Student {
  id: string;
  name: string;
  class: string;
  program: string;
  center: string;
  status: 'active' | 'inactive';
  dob?: string;
  gender?: string;
  schoolName?: string;
  guardianName?: string;
  guardianPhone?: string;
  location?: string;
  enrollmentDate?: string;
}

interface DataState {
  students: Student[];
  addStudent: (student: Omit<Student, 'id' | 'status'>) => void;
  deleteStudent: (id: string) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  importStudents: (students: any[]) => void;
}

const initialStudents: Student[] = [
  { id: '1', name: 'Ravi Kumar', class: '10', program: 'SWAYAM', center: 'Center A', status: 'active' },
  { id: '2', name: 'Priya Sharma', class: '8', program: 'Shiksha', center: 'Center A', status: 'active' },
  { id: '3', name: 'Amit Singh', class: '12', program: 'Sanskar', center: 'Center B', status: 'inactive' },
  { id: '4', name: 'Anjali Desai', class: '9', program: 'SWAYAM', center: 'Center A', status: 'active' },
  { id: '5', name: 'Vikram Patel', class: '11', program: 'Shiksha', center: 'Center C', status: 'active' },
];

export const useDataStore = create<DataState>((set) => ({
  students: initialStudents,

  addStudent: (data) => set((state) => {
    const newStudent: Student = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      status: 'active'
    };
    return { students: [newStudent, ...state.students] };
  }),

  deleteStudent: (id) => set((state) => ({
    students: state.students.filter(s => s.id !== id)
  })),

  updateStudent: (id, updates) => set((state) => ({
    students: state.students.map(s => s.id === id ? { ...s, ...updates } : s)
  })),

  importStudents: (imported) => set((state) => {
    const newStudents: Student[] = imported.map((row: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: row['Student Name'] || row['Name'] || 'Unknown',
      class: String(row['Class'] || row['Grade'] || '8'),
      program: row['Program'] || 'SWAYAM',
      center: row['Center'] || 'Center A',
      status: row['Status']?.toLowerCase() === 'inactive' ? 'inactive' : 'active',
    }));
    return { students: [...newStudents, ...state.students] };
  })
}));
