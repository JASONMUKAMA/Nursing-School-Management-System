/** Module-level cache so table avatars update immediately after upload, independent of table refetch timing. */
const photos = new Map<string, string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setStudentPhoto(studentId: string, url: string | null | undefined): void {
  if (!url) return;
  if (photos.get(studentId) === url) return;
  photos.set(studentId, url);
  emit();
}

export function getStudentPhoto(studentId: string): string | undefined {
  return photos.get(studentId);
}

export function subscribeStudentPhotos(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hydrateStudentPhotos(
  students: { id: string; profilePhotoUrl?: string | null }[],
): void {
  let changed = false;
  for (const student of students) {
    if (!student.profilePhotoUrl) continue;
    if (photos.get(student.id) === student.profilePhotoUrl) continue;
    photos.set(student.id, student.profilePhotoUrl);
    changed = true;
  }
  if (changed) emit();
}
