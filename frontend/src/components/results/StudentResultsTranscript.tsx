import { Button } from '../ui/Button';
import { ZoomableImage } from '../ui/ZoomableImage';
import type { Student, StudentResult } from '../../types';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { averageScore, printStudentTranscript, studentFullName } from '../../utils/printStudentTranscript';

interface StudentResultsTranscriptProps {
  student: Student | null;
  results: StudentResult[];
  title?: string;
}

export function StudentResultsTranscript({
  student,
  results,
  title = 'Academic Transcript',
}: StudentResultsTranscriptProps) {
  const avg = averageScore(results);
  const issuedAt = new Date().toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' });
  const photoUrl = resolveMediaUrl(student?.profilePhotoUrl, student?.profilePhotoUrl ?? student?.id);

  if (!student) {
    return null;
  }

  return (
    <div className="student-transcript">
      <div className="student-transcript-toolbar no-print">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => printStudentTranscript(student, results, title)}
          disabled={results.length === 0}
        >
          Print transcript
        </Button>
      </div>

      <div className="student-transcript-sheet">
        <header className="student-transcript-header">
          <div className="student-transcript-hero">
            {photoUrl ? (
              <ZoomableImage
                src={photoUrl}
                alt={`${studentFullName(student)} profile photo`}
                className="student-transcript-photo"
                zoomLabel={`${studentFullName(student)} — profile photo`}
              />
            ) : (
              <span className="student-transcript-photo student-transcript-photo-empty" aria-hidden>
                👤
              </span>
            )}
            <div className="student-transcript-header-text">
              <p className="student-transcript-school">Nursing School Management System</p>
              <h3 className="student-transcript-title">{title}</h3>
              <p className="student-transcript-subtitle">Official Academic Record</p>
            </div>
          </div>
        </header>

        <dl className="student-transcript-meta">
          <div>
            <dt>Student No</dt>
            <dd>{student.studentNo}</dd>
          </div>
          <div>
            <dt>Student Name</dt>
            <dd>{studentFullName(student)}</dd>
          </div>
          <div>
            <dt>Program</dt>
            <dd>{student.programName}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{student.status}</dd>
          </div>
          <div>
            <dt>Admission Date</dt>
            <dd>{new Date(student.admissionDate).toLocaleDateString('en-UG')}</dd>
          </div>
          <div>
            <dt>Date Issued</dt>
            <dd>{issuedAt}</dd>
          </div>
        </dl>

        {results.length === 0 ? (
          <p className="empty-state">No results on record for this student.</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table student-transcript-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course</th>
                    <th>Assessment Components</th>
                    <th>Final Score</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.courseOfferingId}>
                      <td>{result.courseCode}</td>
                      <td>{result.courseName}</td>
                      <td className="student-transcript-components">
                        {result.marks.length === 0 ? (
                          '—'
                        ) : (
                          <ul>
                            {result.marks.map((mark) => (
                              <li key={mark.id}>
                                {mark.componentName}: {mark.score}/{mark.maxScore} ({mark.weight}%)
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>{result.finalScore.toFixed(1)}</td>
                      <td>
                        <span className="badge">{result.grade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="student-transcript-summary">
              <span>
                <strong>Courses recorded:</strong> {results.length}
              </span>
              {avg !== null && (
                <span>
                  <strong>Average score:</strong> {avg.toFixed(1)}%
                </span>
              )}
            </footer>
          </>
        )}

        <p className="student-transcript-footer">
          Generated electronically by NSMS · {issuedAt}
        </p>
      </div>
    </div>
  );
}
