import type { Student } from '../types';

/** Normalize API student payloads (camelCase or PascalCase). */
export function normalizeStudent(raw: Student & Record<string, unknown>): Student {
  return {
    ...raw,
    profilePhotoUrl: (raw.profilePhotoUrl ?? raw.ProfilePhotoUrl ?? null) as string | null,
    nationalIdFrontUrl: (raw.nationalIdFrontUrl ?? raw.NationalIdFrontUrl ?? null) as string | null,
    nationalIdBackUrl: (raw.nationalIdBackUrl ?? raw.NationalIdBackUrl ?? null) as string | null,
  };
}

/** Read profile photo URL from API payloads (camelCase or PascalCase). */
export function getStudentPhotoUrl(
  student: Student | (Student & Record<string, unknown>),
  cache?: Record<string, string>,
): string | null | undefined {
  const raw = student as Student & Record<string, unknown>;
  return (
    student.profilePhotoUrl ??
    (raw.ProfilePhotoUrl as string | undefined) ??
    cache?.[student.id]
  );
}

export function rememberStudentPhoto(
  cache: Record<string, string>,
  student: Student,
): Record<string, string> {
  const url = getStudentPhotoUrl(student);
  if (!url || cache[student.id] === url) return cache;
  return { ...cache, [student.id]: url };
}

export function mergeStudentMedia(base: Student, patch: Partial<Student>): Student {
  return {
    ...base,
    ...patch,
    profilePhotoUrl: patch.profilePhotoUrl ?? base.profilePhotoUrl,
    nationalIdFrontUrl: patch.nationalIdFrontUrl ?? base.nationalIdFrontUrl,
    nationalIdBackUrl: patch.nationalIdBackUrl ?? base.nationalIdBackUrl,
  };
}

export function mergePhotoCache(
  prev: Record<string, string>,
  students: Student[],
): Record<string, string> {
  let next: Record<string, string> | null = null;
  for (const student of students) {
    const url = getStudentPhotoUrl(student);
    if (!url) continue;
    if ((next ?? prev)[student.id] === url) continue;
    if (!next) next = { ...prev };
    next[student.id] = url;
  }
  return next ?? prev;
}
