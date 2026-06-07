import { useSyncExternalStore } from 'react';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { getStudentPhoto, subscribeStudentPhotos } from '../../utils/studentPhotoStore';

interface StudentPhotoCellProps {
  studentId: string;
  url?: string | null;
}

export function StudentPhotoCell({ studentId, url }: StudentPhotoCellProps) {
  const photo = useSyncExternalStore(
    subscribeStudentPhotos,
    () => getStudentPhoto(studentId) ?? url ?? null,
    () => url ?? null,
  );

  const src = resolveMediaUrl(photo);

  if (!src) {
    return (
      <span className="table-avatar table-avatar-empty" aria-hidden>
        👤
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="table-avatar"
      style={{ display: 'block' }}
      loading="eager"
      decoding="async"
    />
  );
}
