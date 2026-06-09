import type { Student, StudentResult } from '../types';
import { resolveMediaUrl } from './mediaUrl';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function studentFullName(student: Student) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function averageScore(results: StudentResult[]) {
  if (results.length === 0) return null;
  const total = results.reduce((sum, r) => sum + r.finalScore, 0);
  return total / results.length;
}

function componentSummary(result: StudentResult) {
  if (!result.marks.length) return '—';
  return result.marks
    .map((m) => `${m.componentName}: ${m.score}/${m.maxScore} (${m.weight}%)`)
    .join('; ');
}

function absoluteMediaUrl(url?: string | null): string | undefined {
  const resolved = resolveMediaUrl(url, url ?? undefined);
  if (!resolved) return undefined;
  if (resolved.startsWith('http://') || resolved.startsWith('https://') || resolved.startsWith('data:')) {
    return resolved;
  }
  return `${window.location.origin}${resolved.startsWith('/') ? '' : '/'}${resolved}`;
}

export function printStudentTranscript(student: Student, results: StudentResult[], title = 'Academic Transcript') {
  const printedAt = new Date().toLocaleString('en-UG', { dateStyle: 'full', timeStyle: 'short' });
  const avg = averageScore(results);
  const photoUrl = absoluteMediaUrl(student.profilePhotoUrl);
  const courseRows = results
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.courseCode)}</td>
        <td>${escapeHtml(r.courseName)}</td>
        <td>${escapeHtml(componentSummary(r))}</td>
        <td>${r.finalScore.toFixed(1)}</td>
        <td><strong>${escapeHtml(r.grade)}</strong></td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — ${escapeHtml(student.studentNo)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 24px; }
    .letterhead { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #1a5c52; padding-bottom: 12px; margin-bottom: 20px; }
    .letterhead-photo { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 2px solid #ccc; flex-shrink: 0; }
    .letterhead-text { flex: 1; text-align: center; }
    .letterhead h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: 0.04em; text-transform: uppercase; }
    .letterhead p { margin: 0; font-size: 13px; color: #444; }
    .doc-title { text-align: center; font-size: 16px; font-weight: bold; margin: 0 0 16px; text-transform: uppercase; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; margin-bottom: 20px; }
    .meta dt { font-weight: bold; display: inline; }
    .meta dd { display: inline; margin: 0 0 0 4px; }
    .meta div { margin: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    th, td { border: 1px solid #333; padding: 7px 8px; text-align: left; vertical-align: top; }
    th { background: #eef5f3; }
    tr:nth-child(even) td { background: #fafafa; }
    .summary { font-size: 13px; margin-top: 8px; }
    .footer { margin-top: 24px; font-size: 11px; color: #555; border-top: 1px solid #ccc; padding-top: 10px; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <div class="letterhead">
    ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="" class="letterhead-photo" />` : ''}
    <div class="letterhead-text">
      <h1>Nursing School Management System</h1>
      <p>Official Academic Record</p>
    </div>
  </div>
  <p class="doc-title">${escapeHtml(title)}</p>
  <dl class="meta">
    <div><dt>Student No:</dt><dd>${escapeHtml(student.studentNo)}</dd></div>
    <div><dt>Name:</dt><dd>${escapeHtml(studentFullName(student))}</dd></div>
    <div><dt>Program:</dt><dd>${escapeHtml(student.programName)}</dd></div>
    <div><dt>Status:</dt><dd>${escapeHtml(student.status)}</dd></div>
    <div><dt>Admission Date:</dt><dd>${escapeHtml(new Date(student.admissionDate).toLocaleDateString('en-UG'))}</dd></div>
    <div><dt>Date Issued:</dt><dd>${escapeHtml(printedAt)}</dd></div>
  </dl>
  <table>
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
      ${courseRows || '<tr><td colspan="5">No results on record.</td></tr>'}
    </tbody>
  </table>
  <p class="summary">
    <strong>Courses recorded:</strong> ${results.length}
    ${avg !== null ? ` · <strong>Average score:</strong> ${avg.toFixed(1)}%` : ''}
  </p>
  <p class="footer">
    This document was generated electronically by NSMS. Printed ${escapeHtml(printedAt)}.
  </p>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    window.alert('Allow pop-ups to print the transcript.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export { averageScore, componentSummary, studentFullName };
