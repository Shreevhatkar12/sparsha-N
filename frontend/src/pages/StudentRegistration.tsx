import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';

export const StudentRegistration: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.currentUser);
  const { students, addStudent, updateStudent } = useDataStore();
  const isEditMode = Boolean(id);
  
  const isAdmin = currentUser?.role === 'admin';
  const autoFilledCenter = !isAdmin && currentUser?.centerIds.length ? currentUser.centerIds[0] : '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: '',
    class: '',
    schoolName: '',
    guardianName: '',
    guardianPhone: '',
    location: '',
    program: '',
    center: autoFilledCenter,
    enrollmentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isEditMode) {
      const studentToEdit = students.find(s => s.id === id);
      if (studentToEdit) {
        setFormData({
          fullName: studentToEdit.name || '',
          dob: studentToEdit.dob || '',
          gender: studentToEdit.gender || '',
          class: studentToEdit.class || '',
          schoolName: studentToEdit.schoolName || '',
          guardianName: studentToEdit.guardianName || '',
          guardianPhone: studentToEdit.guardianPhone || '',
          location: studentToEdit.location || '',
          program: studentToEdit.program || '',
          center: studentToEdit.center || autoFilledCenter,
          enrollmentDate: studentToEdit.enrollmentDate || new Date().toISOString().split('T')[0]
        });
      }
    }
  }, [id, students, isEditMode, autoFilledCenter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        updateStudent(id, {
          name: formData.fullName,
          class: formData.class,
          program: formData.program,
          center: formData.center,
          dob: formData.dob,
          gender: formData.gender,
          schoolName: formData.schoolName,
          guardianName: formData.guardianName,
          guardianPhone: formData.guardianPhone,
          location: formData.location,
          enrollmentDate: formData.enrollmentDate
        });
        navigate(`/students/${id}`);
      } else {
        addStudent({
          name: formData.fullName,
          class: formData.class,
          program: formData.program,
          center: formData.center,
          dob: formData.dob,
          gender: formData.gender,
          schoolName: formData.schoolName,
          guardianName: formData.guardianName,
          guardianPhone: formData.guardianPhone,
          location: formData.location,
          enrollmentDate: formData.enrollmentDate
        });
        navigate('/students');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper 
      title={isEditMode ? "Edit Student Profile" : "Register New Student"}
      actions={
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-neutral-600 bg-white">
          <ArrowLeft size={20} className="mr-2" /> Back
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4 border-b border-neutral-100 pb-3">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Full Name" 
              name="fullName"
              placeholder="Enter student's full name"
              value={formData.fullName}
              onChange={handleChange}
              required 
            />
            <div className="flex gap-4">
              <Input 
                label="Date of Birth" 
                name="dob"
                type="date"
                className="flex-1"
                value={formData.dob}
                onChange={handleChange}
                required 
              />
              <div className="flex flex-col gap-1.5 flex-1 touch-manipulation">
                <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">Gender <span className="text-danger">*</span></label>
                <select 
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleChange}
                  className="flex h-12 md:h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="" disabled>Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4 border-b border-neutral-100 pb-3">Academic & Guardian Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 touch-manipulation">
              <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">Class/Grade <span className="text-danger">*</span></label>
              <select 
                name="class"
                required
                value={formData.class}
                onChange={handleChange}
                className="flex h-12 md:h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="" disabled>Select Class...</option>
                {[8,9,10,11,12].map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <Input 
              label="School Name" 
              name="schoolName"
              placeholder="Current school name"
              value={formData.schoolName}
              onChange={handleChange}
            />
            <Input 
              label="Guardian Name" 
              name="guardianName"
              placeholder="Parent or guardian name"
              value={formData.guardianName}
              onChange={handleChange}
              required 
            />
            <Input 
              label="Guardian Phone" 
              name="guardianPhone"
              type="tel"
              placeholder="10-digit mobile number"
              value={formData.guardianPhone}
              onChange={handleChange}
              required 
            />
            <Input 
              label="Location/Address" 
              name="location"
              className="md:col-span-2"
              placeholder="Area or full address"
              value={formData.location}
              onChange={handleChange}
            />
          </div>
        </Card>

        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4 border-b border-neutral-100 pb-3">Program Enrollment</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 touch-manipulation">
              <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">Program <span className="text-danger">*</span></label>
              <select 
                name="program"
                required
                value={formData.program}
                onChange={handleChange}
                className="flex h-12 md:h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="" disabled>Select Program...</option>
                <option value="swayam">SWAYAM</option>
                <option value="shiksha">Shiksha</option>
                <option value="sanskar">Sanskar</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 touch-manipulation">
              <label className="text-xs uppercase tracking-wide text-neutral-600 font-medium">Center <span className="text-danger">*</span></label>
              <select 
                name="center"
                required
                disabled={!isAdmin}
                value={formData.center}
                onChange={handleChange}
                className="flex h-12 md:h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-75 disabled:bg-neutral-100"
              >
                <option value="" disabled>Select Center...</option>
                <option value="c1">Center A</option>
                <option value="c2">Center B</option>
                <option value="c3">Center C</option>
              </select>
            </div>

            <Input 
              label="Enrollment Date" 
              name="enrollmentDate"
              type="date"
              value={formData.enrollmentDate}
              onChange={handleChange}
              required 
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3 pb-8">
          <Button variant="secondary" type="button" onClick={() => navigate('/students')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            <Save size={18} className="mr-2" />
            Save Student
          </Button>
        </div>
      </form>
    </PageWrapper>
  );
};
