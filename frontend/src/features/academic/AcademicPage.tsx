import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { academicApi } from '../../api/endpoints';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { StudentSearchSelect } from '../../components/ui/StudentSearchSelect';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { useAuth } from '../../hooks/useAuth';
import type { Course, CourseOffering, Program, Semester } from '../../types';
import { sectionFromPath } from '../../utils/routing';

type Tab = 'programs' | 'courses' | 'offerings' | 'enrollments';

export function AcademicPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = useMemo(() => sectionFromPath(pathname, '/app/academic', 'programs') as Tab, [pathname]);
  const { hasRole } = useAuth();
  const canManage = hasRole('Admin', 'Registrar');
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [programForm, setProgramForm] = useState({ code: '', name: '', durationYears: 3 });
  const [courseForm, setCourseForm] = useState({ code: '', name: '', creditUnits: 3, courseType: 'Core' });
  const [offeringForm, setOfferingForm] = useState({
    courseId: '', semesterId: '', lecturerId: '00000000-0000-0000-0000-000000000001', academicYear: '2025/2026',
  });
  const [enrollForm, setEnrollForm] = useState({
    studentId: '', courseOfferingId: '', enrollmentDate: new Date().toISOString().slice(0, 10),
  });

  const fetchPrograms = useCallback(
    (page: number, pageSize: number, search: string) => academicApi.getPrograms(page, pageSize, search || undefined),
    [],
  );
  const fetchCourses = useCallback(
    (page: number, pageSize: number, search: string) => academicApi.getCourses(page, pageSize, search || undefined),
    [],
  );
  const fetchOfferings = useCallback(
    (page: number, pageSize: number, search: string) => academicApi.getCourseOfferings(undefined, page, pageSize, search || undefined),
    [],
  );

  useEffect(() => {
    Promise.all([
      academicApi.getCourses(1, 200),
      academicApi.getSemesters(undefined, 1, 200),
      academicApi.getCourseOfferings(undefined, 1, 200),
    ]).then(([c, s, o]) => {
      setCourses(c.items);
      setSemesters(s.items);
      setOfferings(o.items);
    }).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    if (pathname === '/app/academic' || pathname === '/app/academic/') {
      navigate('/app/academic/programs', { replace: true });
    }
  }, [pathname, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (tab === 'programs') await academicApi.createProgram(programForm);
      else if (tab === 'courses') await academicApi.createCourse(courseForm);
      else if (tab === 'offerings') await academicApi.createCourseOffering(offeringForm);
      else await academicApi.enroll(enrollForm);
      setSuccess('Saved successfully.');
      setShowModal(false);
      setRefreshKey((k) => k + 1);
    } catch {
      setError('Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitles: Record<Tab, string> = {
    programs: 'Add Program', courses: 'Add Course', offerings: 'Add Course Offering', enrollments: 'Enroll Student',
  };

  const sectionLabels: Record<Tab, string> = {
    programs: 'Programs',
    courses: 'Courses',
    offerings: 'Offerings',
    enrollments: 'Enrollments',
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>{sectionLabels[tab]}</h2>
        <p className="text-muted">Programs, courses, offerings, and enrollments.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <Card
        actions={canManage ? <Button size="sm" onClick={() => setShowModal(true)}>{tab === 'enrollments' ? 'Enroll' : 'Add New'}</Button> : undefined}
      >
        {tab === 'programs' && (
          <ServerDataTable<Program>
            columns={[
              { key: 'code', header: 'Code', render: (p) => p.code },
              { key: 'name', header: 'Name', render: (p) => p.name },
              { key: 'duration', header: 'Duration (yrs)', render: (p) => p.durationYears },
              { key: 'active', header: 'Active', render: (p) => (p.isActive ? 'Yes' : 'No') },
            ]}
            keyField="id"
            fetchData={fetchPrograms}
            searchPlaceholder="Search programs..."
            refreshKey={refreshKey}
          />
        )}
        {tab === 'courses' && (
          <ServerDataTable<Course>
            columns={[
              { key: 'code', header: 'Code', render: (c) => c.code },
              { key: 'name', header: 'Name', render: (c) => c.name },
              { key: 'credits', header: 'Credits', render: (c) => c.creditUnits },
              { key: 'type', header: 'Type', render: (c) => c.courseType },
            ]}
            keyField="id"
            fetchData={fetchCourses}
            searchPlaceholder="Search courses..."
            refreshKey={refreshKey}
          />
        )}
        {tab === 'offerings' && (
          <ServerDataTable<CourseOffering>
            columns={[
              { key: 'course', header: 'Course', render: (o) => `${o.courseCode} - ${o.courseName}` },
              { key: 'semester', header: 'Semester', render: (o) => o.semesterName },
              { key: 'lecturer', header: 'Lecturer', render: (o) => o.lecturerName },
              { key: 'year', header: 'Academic Year', render: (o) => o.academicYear },
            ]}
            keyField="id"
            fetchData={fetchOfferings}
            searchPlaceholder="Search offerings..."
            refreshKey={refreshKey}
          />
        )}
        {tab === 'enrollments' && (
          <p className="text-muted">Use the Enroll button to register students in course offerings.</p>
        )}
      </Card>

      <Modal title={modalTitles[tab]} isOpen={showModal} onClose={() => setShowModal(false)}
        footer={<div className="modal-footer"><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button></div>}
      >
        {tab === 'programs' && (
          <form className="form-grid">
            <Input label="Code" value={programForm.code} onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })} required />
            <Input label="Name" value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} required />
            <Input label="Duration (years)" type="number" value={programForm.durationYears} onChange={(e) => setProgramForm({ ...programForm, durationYears: Number(e.target.value) })} required />
          </form>
        )}
        {tab === 'courses' && (
          <form className="form-grid">
            <Input label="Code" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} required />
            <Input label="Name" value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} required />
            <Input label="Credit Units" type="number" value={courseForm.creditUnits} onChange={(e) => setCourseForm({ ...courseForm, creditUnits: Number(e.target.value) })} required />
            <Select label="Course Type" value={courseForm.courseType} onChange={(e) => setCourseForm({ ...courseForm, courseType: e.target.value })} options={[{ value: 'Core', label: 'Core' }, { value: 'Elective', label: 'Elective' }, { value: 'Clinical', label: 'Clinical' }]} />
          </form>
        )}
        {tab === 'offerings' && (
          <form className="form-grid">
            <Select label="Course" value={offeringForm.courseId} onChange={(e) => setOfferingForm({ ...offeringForm, courseId: e.target.value })} options={[{ value: '', label: 'Select...' }, ...courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))]} />
            <Select label="Semester" value={offeringForm.semesterId} onChange={(e) => setOfferingForm({ ...offeringForm, semesterId: e.target.value })} options={[{ value: '', label: 'Select...' }, ...semesters.map((s) => ({ value: s.id, label: s.name }))]} />
            <Input label="Academic Year" value={offeringForm.academicYear} onChange={(e) => setOfferingForm({ ...offeringForm, academicYear: e.target.value })} />
          </form>
        )}
        {tab === 'enrollments' && (
          <form className="form-grid">
            <StudentSearchSelect
              className="full-width"
              label="Student"
              value={enrollForm.studentId}
              onChange={(studentId) => setEnrollForm({ ...enrollForm, studentId })}
              required
            />
            <Select label="Course Offering" value={enrollForm.courseOfferingId} onChange={(e) => setEnrollForm({ ...enrollForm, courseOfferingId: e.target.value })} options={[{ value: '', label: 'Select...' }, ...offerings.map((o) => ({ value: o.id, label: `${o.courseName} (${o.semesterName})` }))]} />
            <Input label="Enrollment Date" type="date" value={enrollForm.enrollmentDate} onChange={(e) => setEnrollForm({ ...enrollForm, enrollmentDate: e.target.value })} />
          </form>
        )}
      </Modal>
    </div>
  );
}
