import { resolveMediaUrl } from './mediaUrl';

export interface IdCardData {
  type: 'student' | 'teacher';
  fullName: string;
  idNumber: string;
  subtitle: string;
  photoUrl?: string | null;
}

const SCHOOL_NAME = 'Nursing School Management System';
const SCHOOL_SHORT = 'NSMS';
const BUILD_CHUNK = 25;

export const MAX_CARDS_PER_PRINT = 50;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absolutePhotoUrl(url?: string | null): string {
  if (!url) return '';
  const resolved = resolveMediaUrl(url);
  if (!resolved) return '';
  if (resolved.startsWith('http://') || resolved.startsWith('https://') || resolved.startsWith('data:')) {
    return resolved;
  }
  return `${window.location.origin}${resolved}`;
}

function renderCard(card: IdCardData): string {
  const photo = absolutePhotoUrl(card.photoUrl);
  const typeLabel = card.type === 'student' ? 'STUDENT ID' : 'STAFF ID';
  const photoHtml = photo
    ? `<img src="${escapeHtml(photo)}" alt="" class="photo" />`
    : '<div class="photo photo-empty">&#128100;</div>';

  return `<article class="card">
      <header class="card-header">
        <span class="school">${escapeHtml(SCHOOL_NAME)}</span>
        <span class="type">${typeLabel}</span>
      </header>
      <div class="card-body">
        ${photoHtml}
        <div class="details">
          <p class="name">${escapeHtml(card.fullName)}</p>
          <p class="number">${escapeHtml(card.idNumber)}</p>
          <p class="subtitle">${escapeHtml(card.subtitle)}</p>
        </div>
      </div>
      <footer class="card-footer">${escapeHtml(SCHOOL_SHORT)} · Nursing School Management System</footer>
    </article>`;
}

const PRINT_STYLES = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 12mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 85.6mm);
      gap: 8mm;
      justify-content: start;
    }
    .card {
      width: 85.6mm;
      height: 53.98mm;
      border: 1px solid #065a4e;
      border-radius: 4mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #f0fdfa;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-header {
      background: #065a4e;
      color: #fff;
      padding: 2mm 3mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2mm;
    }
    .school {
      font-size: 7px;
      font-weight: 700;
      line-height: 1.2;
      max-width: 42mm;
    }
    .type {
      font-size: 7px;
      font-weight: 700;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .card-body {
      flex: 1;
      display: flex;
      gap: 3mm;
      padding: 3mm;
      align-items: center;
      min-height: 0;
      background: #fff;
    }
    .photo {
      width: 18mm;
      height: 22mm;
      object-fit: cover;
      border-radius: 2mm;
      border: 1px solid #d1e7e3;
      flex-shrink: 0;
    }
    .photo-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0fdfa;
      font-size: 16px;
    }
    .details { min-width: 0; }
    .name {
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 1mm;
      word-break: break-word;
    }
    .number {
      font-size: 9px;
      font-weight: 600;
      color: #065a4e;
      margin-bottom: 1mm;
    }
    .subtitle {
      font-size: 8px;
      color: #64748b;
      line-height: 1.25;
      word-break: break-word;
    }
    .card-footer {
      font-size: 6px;
      text-align: center;
      color: #64748b;
      padding: 1.5mm 2mm;
      border-top: 1px solid #d1e7e3;
      background: #fff;
    }
    @media print {
      body { padding: 0; }
      h1, .meta { display: none; }
      .grid { gap: 6mm; }
    }`;

function wrapPrintHtml(cardsHtml: string, cards: IdCardData[], title: string): string {
  const printedAt = new Date().toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">${cards.length} card(s) · ${escapeHtml(printedAt)}</p>
  <div class="grid">${cardsHtml}</div>
</body>
</html>`;
}

async function buildCardsHtmlAsync(cards: IdCardData[]): Promise<string> {
  const parts: string[] = [];
  for (let i = 0; i < cards.length; i += BUILD_CHUNK) {
    const slice = cards.slice(i, i + BUILD_CHUNK);
    parts.push(slice.map(renderCard).join(''));
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0);
    });
  }
  return parts.join('');
}

function openPrintIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print ID cards');
  iframe.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:10001;background:#fff;';

  document.body.appendChild(iframe);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    URL.revokeObjectURL(url);
    iframe.remove();
  };

  iframe.onerror = cleanup;

  const tryPrint = () => {
    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc?.body?.querySelector('.card')) return false;
    win.focus();
    win.print();
    win.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 60000);
    return true;
  };

  iframe.onload = () => {
    tryPrint();
  };

  iframe.src = url;
  window.setTimeout(() => tryPrint(), 500);
}

/** Build HTML off the click stack so the UI stays responsive. */
export async function printIdCardsDocument(
  cards: IdCardData[],
  title: string,
): Promise<boolean> {
  if (cards.length === 0) return false;

  const batch = cards.slice(0, MAX_CARDS_PER_PRINT);
  const cardsHtml = await buildCardsHtmlAsync(batch);
  const html = wrapPrintHtml(cardsHtml, batch, title);
  openPrintIframe(html);
  return true;
}

export function studentToIdCard(student: {
  firstName: string;
  lastName: string;
  studentNo: string;
  programName: string;
  profilePhotoUrl?: string | null;
}): IdCardData {
  return {
    type: 'student',
    fullName: `${student.firstName} ${student.lastName}`.trim(),
    idNumber: student.studentNo,
    subtitle: student.programName,
    photoUrl: student.profilePhotoUrl,
  };
}

export function teacherToIdCard(user: {
  firstName?: string | null;
  lastName?: string | null;
  userName: string;
  roles: string[];
  profileImageUrl?: string | null;
}): IdCardData {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.userName;
  const role = user.roles.find((r) => r === 'Lecturer') ?? user.roles[0] ?? 'Staff';
  return {
    type: 'teacher',
    fullName,
    idNumber: user.userName,
    subtitle: role,
    photoUrl: user.profileImageUrl,
  };
}
