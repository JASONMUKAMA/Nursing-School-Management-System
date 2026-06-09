import { useSyncExternalStore } from 'react';
import { ZoomableImage } from './ZoomableImage';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { getStudentPhoto, subscribeStudentPhotos } from '../../utils/studentPhotoStore';

interface StudentPhotoCellProps {
  studentId: string;
  url?: string | null;
  zoomLabel?: string;
}

export function StudentPhotoCell({ studentId, url, zoomLabel }: StudentPhotoCellProps) {
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
    <ZoomableImage
      src={src}
      alt=""
      className="table-avatar"
      zoomLabel={zoomLabel ?? 'Profile photo'}
    />
  );
}
