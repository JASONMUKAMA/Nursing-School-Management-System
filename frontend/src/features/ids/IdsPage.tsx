import { useEffect, useMemo, useState } from 'react';
import { academicApi, studentsApi, usersApi } from '../../api/endpoints';
import { IdCardPrintModal } from '../../components/ids/IdCardPrintModal';
import { IdCardTile } from '../../components/ids/IdCardTile';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { StudentSearchSelect } from '../../components/ui/StudentSearchSelect';
import { TeacherSearchSelect } from '../../components/ui/TeacherSearchSelect';
import type { Program, Student, User } from '../../types';
import type { IdCardData } from '../../utils/idCardPrint';
import {
  MAX_CARDS_PER_PRINT,
  printIdCardsDocument,
  studentToIdCard,
  teacherToIdCard,
} from '../../utils/idCardPrint';
import { toast } from '../../utils/toast';

type IdTab = 'students' | 'teachers';

const TEACHER_ROLES = new Set(['Lecturer', 'ClinicalCoordinator', 'Registrar']);

function isTeacher(user: User) {
  return user.roles.some((role) => TEACHER_ROLES.has(role));
}

interface PrintJob {
  cards: IdCardData[];
  title: string;
}

export function IdsPage() {
  const [tab, setTab] = useState<IdTab>('students');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [teacherId, setTeacherId] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);

  useEffect(() => {
    academicApi.getPrograms(1, 100).then((r) => setPrograms(r.items)).catch(() => {});
  }, []);

  const studentPreview = useMemo(
    () => (selectedStudent ? studentToIdCard(selectedStudent) : null),
    [selectedStudent],
  );

  const teacherPreview = useMemo(
    () => (selectedTeacher ? teacherToIdCard(selectedTeacher) : null),
    [selectedTeacher],
  );

  const runPrint = async (cards: IdCardData[], title: string) => {
    if (cards.length === 0) return;
    if (cards.length > MAX_CARDS_PER_PRINT) {
      toast.info(`Printing first ${MAX_CARDS_PER_PRINT} of ${cards.length} cards. Run again for more.`);
    }
    setPrinting(true);
    toast.info('Preparing print preview…');
    try {
      const ok = await printIdCardsDocument(cards, title);
      if (!ok) toast.error('Could not start printing.');
    } catch {
      toast.error('Failed to prepare print preview.');
    } finally {
      setPrinting(false);
    }
  };

  const printStudent = () => {
    if (!selectedStudent) {
      toast.error('Select a student first.');
      return;
    }
    void runPrint(
      [studentToIdCard(selectedStudent)],
      `Student ID — ${selectedStudent.studentNo}`,
    );
  };

  const printTeacher = () => {
    if (!selectedTeacher) {
      toast.error('Select a teacher first.');
      return;
    }
    void runPrint(
      [teacherToIdCard(selectedTeacher)],
      `Staff ID — ${selectedTeacher.userName}`,
    );
  };

  const fetchAllStudents = async () => {
    const limit = 500;
    const first = await studentsApi.getAll(1, limit, undefined);
    let items = [...first.items];
    const total = first.totalCount;
    if (total > limit) {
      const pages = Math.ceil(total / limit);
      for (let page = 2; page <= pages && page <= 10; page += 1) {
        const next = await studentsApi.getAll(page, limit, undefined);
        items = items.concat(next.items);
      }
    }
    return programId ? items.filter((s) => s.programId === programId) : items;
  };

  const massPrintStudents = async () => {
    setPrinting(true);
    try {
      const students = await fetchAllStudents();
      if (students.length === 0) {
        toast.error('No students found for the selected filter.');
        return;
      }
      const cards: IdCardData[] = [];
      for (let i = 0; i < students.length; i += 50) {
        cards.push(...students.slice(i, i + 50).map(studentToIdCard));
        await new Promise<void>((r) => window.setTimeout(r, 0));
      }
      setPrintJob({ cards, title: `Student IDs (${cards.length})` });
    } catch {
      toast.error('Failed to load students for mass print.');
    } finally {
      setPrinting(false);
    }
  };

  const massPrintTeachers = async () => {
    setPrinting(true);
    try {
      const limit = 500;
      const first = await usersApi.getAll(1, limit);
      let users = first.items.filter(isTeacher);
      const total = first.totalCount;
      if (total > limit) {
        const pages = Math.ceil(total / limit);
        for (let page = 2; page <= pages && page <= 10; page += 1) {
          const next = await usersApi.getAll(page, limit);
          users = users.concat(next.items.filter(isTeacher));
        }
      }
      if (users.length === 0) {
        toast.error('No teachers found.');
        return;
      }
      const cards: IdCardData[] = [];
      for (let i = 0; i < users.length; i += 50) {
        cards.push(...users.slice(i, i + 50).map(teacherToIdCard));
        await new Promise<void>((r) => window.setTimeout(r, 0));
      }
      setPrintJob({ cards, title: `Staff IDs (${cards.length})` });
    } catch {
      toast.error('Failed to load teachers for mass print.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="page ids-page">
      <div className="page-header">
        <h2>ID Cards</h2>
        <p className="text-muted">Print individual or bulk student and teacher identification cards.</p>
      </div>

      <div className="ids-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`ids-tab${tab === 'students' ? ' active' : ''}`}
          aria-selected={tab === 'students'}
          onClick={() => setTab('students')}
        >
          Student IDs
        </button>
        <button
          type="button"
          role="tab"
          className={`ids-tab${tab === 'teachers' ? ' active' : ''}`}
          aria-selected={tab === 'teachers'}
          onClick={() => setTab('teachers')}
        >
          Teacher IDs
        </button>
      </div>

      {tab === 'students' && (
        <div className="ids-panels">
          <Card title="Print one student">
            <div className="ids-form">
              <StudentSearchSelect
                value={studentId}
                onChange={setStudentId}
                onStudentChange={setSelectedStudent}
              />
              <Button onClick={printStudent} disabled={!selectedStudent || printing}>
                Print ID card
              </Button>
            </div>
            {studentPreview && (
              <div className="ids-preview-wrap">
                <p className="ids-preview-label">Preview</p>
                <IdCardTile card={studentPreview} />
              </div>
            )}
          </Card>

          <Card title="Mass print students">
            <div className="ids-form">
              <Select
                label="Program filter"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                options={[
                  { value: '', label: 'All programs' },
                  ...programs.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <Button variant="secondary" onClick={() => void massPrintStudents()} disabled={printing}>
                {printing ? 'Preparing…' : 'Mass print student IDs'}
              </Button>
            </div>
            <p className="text-muted ids-hint">
              Up to {MAX_CARDS_PER_PRINT} cards per print job. Run again to print more.
            </p>
          </Card>
        </div>
      )}

      {tab === 'teachers' && (
        <div className="ids-panels">
          <Card title="Print one teacher">
            <div className="ids-form">
              <TeacherSearchSelect
                value={teacherId}
                onChange={setTeacherId}
                onTeacherChange={setSelectedTeacher}
              />
              <Button onClick={printTeacher} disabled={!selectedTeacher || printing}>
                Print ID card
              </Button>
            </div>
            {teacherPreview && (
              <div className="ids-preview-wrap">
                <p className="ids-preview-label">Preview</p>
                <IdCardTile card={teacherPreview} />
              </div>
            )}
          </Card>

          <Card title="Mass print teachers">
            <div className="ids-form">
              <Button variant="secondary" onClick={() => void massPrintTeachers()} disabled={printing}>
                {printing ? 'Preparing…' : 'Mass print teacher IDs'}
              </Button>
            </div>
            <p className="text-muted ids-hint">
              Up to {MAX_CARDS_PER_PRINT} cards per print job.
            </p>
          </Card>
        </div>
      )}

      {printJob && (
        <IdCardPrintModal
          cards={printJob.cards}
          title={printJob.title}
          onClose={() => setPrintJob(null)}
          onPrint={() => {
            const job = printJob;
            setPrintJob(null);
            void runPrint(job.cards, job.title);
          }}
        />
      )}
    </div>
  );
}
