import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { StudentList } from './pages/StudentList';
import { StudentRegistration } from './pages/StudentRegistration';
import { StudentDetails } from './pages/StudentDetails';
import { Attendance } from './pages/Attendance';
import { Skills } from './pages/Skills';
import { Careers } from './pages/Careers';
import { Exams } from './pages/Exams';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Group */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/students/new" element={<StudentRegistration />} />
          <Route path="/students/:id" element={<StudentDetails />} />
          <Route path="/students/:id/edit" element={<StudentRegistration />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
