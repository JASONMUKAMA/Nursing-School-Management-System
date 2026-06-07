import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { academicApi, eventsApi } from '../../api/endpoints';
import { monthRange, SchoolCalendar, toDatetimeLocalValue } from '../../components/calendar/SchoolCalendar';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { useAuth } from '../../hooks/useAuth';
import type { CourseOffering, Program, SchoolEvent, Semester } from '../../types';
import { sectionFromPath } from '../../utils/routing';

type Tab = 'calendar' | 'events' | 'programs' | 'semesters' | 'offerings';

const EVENT_TYPES = [
  { value: 'Academic', label: 'Academic' },
  { value: 'Examination', label: 'Examination' },
  { value: 'Clinical', label: 'Clinical' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Social', label: 'Social' },
  { value: 'Administrative', label: 'Administrative' },
];

const AUDIENCE_OPTIONS = [
  { value: 'All Students', label: 'All Students' },
  { value: 'All Staff', label: 'All Staff' },
  { value: 'Students & Parents', label: 'Students & Parents' },
  { value: 'Year 3 Students', label: 'Year 3 Students' },
  { value: 'Year 4 Students', label: 'Year 4 Students' },
  { value: 'Lecturers', label: 'Lecturers' },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-UG', { dateStyle: 'medium' });
}

function matchesEventSearch(event: SchoolEvent, term: string) {
  const q = term.toLowerCase();
  return (
    event.title.toLowerCase().includes(q) ||
    event.description.toLowerCase().includes(q) ||
    event.eventType.toLowerCase().includes(q) ||
    event.location.toLowerCase().includes(q) ||
    event.targetAudience.toLowerCase().includes(q)
  );
}

export function SchedulingPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = useMemo(() => sectionFromPath(pathname, '/app/scheduling', 'calendar') as Tab, [pathname]);
  const { hasRole } = useAuth();
  const canManage = hasRole('Admin', 'Registrar');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarEvents, setCalendarEvents] = useState<SchoolEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [eventSearch, setEventSearch] = useState('');
  const [debouncedEventSearch, setDebouncedEventSearch] = useState('');

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventType: 'Academic',
    startDate: '',
    endDate: '',
    location: '',
    targetAudience: 'All Students',
    isPublished: 'true',
  });

  const [programForm, setProgramForm] = useState({ code: '', name: '', durationYears: 3 });
  const [semesterForm, setSemesterForm] = useState({
    programId: '',
    name: '',
    yearLevel: 1,
    semesterNo: 1,
    startDate: '',
    endDate: '',
  });
  const [offeringForm, setOfferingForm] = useState({
    courseId: '',
    semesterId: '',
    lecturerId: '00000000-0000-0000-0000-000000000001',
    academicYear: '2025/2026',
  });

  const loadCalendar = useCallback(async () => {
    if (tab !== 'calendar') return;
    setCalendarLoading(true);
    try {
      const { start, end } = monthRange(calendarMonth);
      setCalendarEvents(await eventsApi.getCalendar(start, end));
    } catch {
      setError('Failed to load calendar events.');
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarMonth, tab, refreshKey]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEventSearch(eventSearch), 350);
    return () => clearTimeout(timer);
  }, [eventSearch]);

  const filteredCalendarEvents = useMemo(() => {
    if (!debouncedEventSearch.trim()) return calendarEvents;
    return calendarEvents.filter((event) => matchesEventSearch(event, debouncedEventSearch.trim()));
  }, [calendarEvents, debouncedEventSearch]);

  const fetchEvents = useCallback(
    (page: number, pageSize: number, search: string) =>
      eventsApi.getAll(page, pageSize, search || undefined),
    [],
  );

  const eventColumns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        render: (e: SchoolEvent) => e.title,
        print: (e: SchoolEvent) => e.title,
      },
      {
        key: 'type',
        header: 'Type',
        render: (e: SchoolEvent) => e.eventType,
        print: (e: SchoolEvent) => e.eventType,
      },
      {
        key: 'start',
        header: 'Starts',
        render: (e: SchoolEvent) => formatDateTime(e.startDate),
        print: (e: SchoolEvent) => formatDateTime(e.startDate),
      },
      {
        key: 'end',
        header: 'Ends',
        render: (e: SchoolEvent) => formatDateTime(e.endDate),
        print: (e: SchoolEvent) => formatDateTime(e.endDate),
      },
      {
        key: 'location',
        header: 'Location',
        render: (e: SchoolEvent) => e.location,
        print: (e: SchoolEvent) => e.location,
      },
      {
        key: 'audience',
        header: 'Audience',
        render: (e: SchoolEvent) => e.targetAudience,
        print: (e: SchoolEvent) => e.targetAudience,
      },
      {
        key: 'status',
        header: 'Status',
        render: (e: SchoolEvent) => (e.isPublished !== false ? 'Published' : 'Draft'),
        print: (e: SchoolEvent) => (e.isPublished !== false ? 'Published' : 'Draft'),
      },
    ],
    [],
  );

  const fetchPrograms = useCallback(
    (page: number, pageSize: number, search: string) =>
      academicApi.getPrograms(page, pageSize, search || undefined),
    [],
  );
  const fetchSemesters = useCallback(
    (page: number, pageSize: number, search: string) =>
      academicApi.getSemesters(undefined, page, pageSize, search || undefined),
    [],
  );
  const fetchOfferings = useCallback(
    (page: number, pageSize: number, search: string) =>
      academicApi.getCourseOfferings(undefined, page, pageSize, search || undefined),
    [],
  );

  useEffect(() => {
    Promise.all([
      academicApi.getPrograms(1, 200),
      academicApi.getCourses(1, 200),
      academicApi.getSemesters(undefined, 1, 200),
    ])
      .then(([p, c, s]) => {
        setPrograms(p.items);
        setCourses(c.items);
        setSemesters(s.items);
      })
      .catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    if (pathname === '/app/scheduling' || pathname === '/app/scheduling/') {
      navigate('/app/scheduling/calendar', { replace: true });
    }
  }, [pathname, navigate]);

  const sectionTitles: Record<Tab, string> = {
    calendar: 'School Calendar',
    events: 'Scheduled Events',
    programs: 'Programs',
    semesters: 'Semester Terms',
    offerings: 'Course Offerings',
  };

  const modalTitles: Record<Tab, string> = {
    calendar: 'Schedule Event',
    events: 'Schedule Event',
    programs: 'Add Program',
    semesters: 'Add Semester',
    offerings: 'Add Course Offering',
  };

  const isEventTab = tab === 'calendar' || tab === 'events';

  const openNewEvent = (day?: Date) => {
    if (day) {
      setEventForm((f) => ({
        ...f,
        startDate: toDatetimeLocalValue(day, 9),
        endDate: toDatetimeLocalValue(day, 11),
      }));
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (isEventTab) {
        const result = await eventsApi.create({
          title: eventForm.title,
          description: eventForm.description,
          eventType: eventForm.eventType,
          startDate: new Date(eventForm.startDate).toISOString(),
          endDate: new Date(eventForm.endDate).toISOString(),
          location: eventForm.location,
          targetAudience: eventForm.targetAudience,
          isPublished: eventForm.isPublished === 'true',
        });
        setSuccess(
          result.invitationsQueued
            ? 'Event published on the calendar. Email invitations with calendar files are being sent to students, parents, and staff.'
            : 'Event saved as draft.',
        );
      } else if (tab === 'programs') {
        await academicApi.createProgram(programForm);
        setSuccess('Program added.');
      } else if (tab === 'semesters') {
        await academicApi.createSemester(semesterForm);
        setSuccess('Semester added.');
      } else {
        await academicApi.createCourseOffering(offeringForm);
        setSuccess('Course offering scheduled.');
      }
      setShowModal(false);
      setRefreshKey((k) => k + 1);
    } catch {
      setError('Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>{sectionTitles[tab]}</h2>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <Card
        actions={
          canManage ? (
            <Button size="sm" onClick={() => (isEventTab ? openNewEvent() : setShowModal(true))}>
              {isEventTab ? 'Create Event' : 'Add New'}
            </Button>
          ) : undefined
        }
      >
        {tab === 'calendar' && (
          <>
            <p className="text-muted scheduling-calendar-hint">
              Click a day to schedule an event. Published events email calendar invites (.ics) to every student, parent/guardian, and staff member.
            </p>
            <div className="scheduling-events-toolbar">
              <Input
                placeholder="Filter calendar by title, type, location…"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="search-input scheduling-events-search"
              />
            </div>
            <SchoolCalendar
              events={filteredCalendarEvents}
              month={calendarMonth}
              loading={calendarLoading}
              onMonthChange={setCalendarMonth}
              onDayClick={canManage ? (day) => openNewEvent(day) : undefined}
              onEventClick={setSelectedEvent}
            />
          </>
        )}

        {tab === 'events' && (
          <>
            <p className="text-muted scheduling-calendar-hint">
              Search and print the full list of scheduled events. Click a row to view details.
            </p>
            <ServerDataTable<SchoolEvent>
              columns={eventColumns}
              keyField="id"
              fetchData={fetchEvents}
              searchPlaceholder="Search events by title, type, location, audience…"
              emptyMessage="No scheduled events match your search."
              refreshKey={refreshKey}
              printable
              printTitle="NSMS Scheduled Events"
              onRowClick={setSelectedEvent}
            />
          </>
        )}

        {tab === 'programs' && (
          <ServerDataTable<Program>
            columns={[
              { key: 'code', header: 'Code', render: (p) => p.code },
              { key: 'name', header: 'Program', render: (p) => p.name },
              { key: 'duration', header: 'Duration (yrs)', render: (p) => p.durationYears },
              { key: 'active', header: 'Active', render: (p) => (p.isActive ? 'Yes' : 'No') },
            ]}
            keyField="id"
            fetchData={fetchPrograms}
            searchPlaceholder="Search programs..."
            refreshKey={refreshKey}
          />
        )}

        {tab === 'semesters' && (
          <ServerDataTable<Semester>
            columns={[
              { key: 'program', header: 'Program', render: (s) => s.programName },
              { key: 'name', header: 'Semester', render: (s) => s.name },
              { key: 'year', header: 'Year', render: (s) => s.yearLevel },
              { key: 'term', header: 'Term', render: (s) => s.semesterNo },
              { key: 'start', header: 'Starts', render: (s) => formatDate(s.startDate) },
              { key: 'end', header: 'Ends', render: (s) => formatDate(s.endDate) },
            ]}
            keyField="id"
            fetchData={fetchSemesters}
            searchPlaceholder="Search semesters..."
            refreshKey={refreshKey}
          />
        )}

        {tab === 'offerings' && (
          <ServerDataTable<CourseOffering>
            columns={[
              { key: 'course', header: 'Course', render: (o) => `${o.courseCode} — ${o.courseName}` },
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
      </Card>

      <Modal
        title={modalTitles[tab]}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : isEventTab ? 'Publish & Send Invites' : 'Save'}
            </Button>
          </div>
        }
      >
        {(tab === 'calendar' || tab === 'events') && (
          <form className="form-grid">
            <Input label="Title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required className="full-width" />
            <Input label="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className="full-width" />
            <Select label="Event Type" value={eventForm.eventType} onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })} options={EVENT_TYPES} />
            <Select label="Audience" value={eventForm.targetAudience} onChange={(e) => setEventForm({ ...eventForm, targetAudience: e.target.value })} options={AUDIENCE_OPTIONS} />
            <Select label="Visibility" value={eventForm.isPublished} onChange={(e) => setEventForm({ ...eventForm, isPublished: e.target.value })} options={[{ value: 'true', label: 'Published — email everyone' }, { value: 'false', label: 'Draft — calendar only' }]} />
            <Input label="Start" type="datetime-local" value={eventForm.startDate} onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })} required />
            <Input label="End" type="datetime-local" value={eventForm.endDate} onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })} required />
            <Input label="Location" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} required className="full-width" />
          </form>
        )}

        {tab === 'programs' && (
          <form className="form-grid">
            <Input label="Code" value={programForm.code} onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })} required />
            <Input label="Name" value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} required />
            <Input label="Duration (years)" type="number" value={programForm.durationYears} onChange={(e) => setProgramForm({ ...programForm, durationYears: Number(e.target.value) })} required />
          </form>
        )}

        {tab === 'semesters' && (
          <form className="form-grid">
            <Select
              label="Program"
              value={semesterForm.programId}
              onChange={(e) => setSemesterForm({ ...semesterForm, programId: e.target.value })}
              options={[{ value: '', label: 'Select program...' }, ...programs.map((p) => ({ value: p.id, label: p.name }))]}
              required
            />
            <Input label="Semester Name" value={semesterForm.name} onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })} required />
            <Input label="Year Level" type="number" value={semesterForm.yearLevel} onChange={(e) => setSemesterForm({ ...semesterForm, yearLevel: Number(e.target.value) })} required />
            <Input label="Semester No" type="number" value={semesterForm.semesterNo} onChange={(e) => setSemesterForm({ ...semesterForm, semesterNo: Number(e.target.value) })} required />
            <Input label="Start Date" type="date" value={semesterForm.startDate} onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })} required />
            <Input label="End Date" type="date" value={semesterForm.endDate} onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })} required />
          </form>
        )}

        {tab === 'offerings' && (
          <form className="form-grid">
            <Select
              label="Course"
              value={offeringForm.courseId}
              onChange={(e) => setOfferingForm({ ...offeringForm, courseId: e.target.value })}
              options={[{ value: '', label: 'Select course...' }, ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]}
              required
            />
            <Select
              label="Semester"
              value={offeringForm.semesterId}
              onChange={(e) => setOfferingForm({ ...offeringForm, semesterId: e.target.value })}
              options={[{ value: '', label: 'Select semester...' }, ...semesters.map((s) => ({ value: s.id, label: `${s.name} (${s.programName})` }))]}
              required
            />
            <Input label="Academic Year" value={offeringForm.academicYear} onChange={(e) => setOfferingForm({ ...offeringForm, academicYear: e.target.value })} required />
          </form>
        )}
      </Modal>

      <Modal
        title={selectedEvent?.title ?? 'Event'}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        footer={<Button variant="secondary" onClick={() => setSelectedEvent(null)}>Close</Button>}
      >
        {selectedEvent && (
          <div className="event-detail">
            <p><strong>Type:</strong> {selectedEvent.eventType}</p>
            <p><strong>When:</strong> {formatDateTime(selectedEvent.startDate)} – {formatDateTime(selectedEvent.endDate)}</p>
            <p><strong>Where:</strong> {selectedEvent.location}</p>
            <p><strong>Audience:</strong> {selectedEvent.targetAudience}</p>
            <p><strong>Status:</strong> {selectedEvent.isPublished !== false ? 'Published' : 'Draft'}</p>
            {selectedEvent.description && <p className="event-detail-desc">{selectedEvent.description}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
