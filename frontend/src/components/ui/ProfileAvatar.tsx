import { useEffect, useState } from 'react';
import { ZoomableImage } from './ZoomableImage';
import { resolveMediaUrl } from '../../utils/mediaUrl';

interface ProfileAvatarProps {
  url?: string | null;
  className?: string;
  emptyClassName?: string;
  cacheBust?: string | number;
  /** Table rows should load immediately; profile views can lazy-load. */
  eager?: boolean;
  zoomable?: boolean;
  zoomLabel?: string;
}

export function ProfileAvatar({
  url,
  className = 'table-avatar',
  emptyClassName = 'table-avatar table-avatar-empty',
  cacheBust,
  eager = false,
  zoomable = false,
  zoomLabel = 'Profile photo',
}: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(url, cacheBust);

  useEffect(() => {
    setFailed(false);
  }, [url, cacheBust]);

  if (!src || failed) {
    return (
      <span className={emptyClassName} aria-hidden>
        👤
      </span>
    );
  }

  if (zoomable) {
    return (
      <ZoomableImage
        src={src}
        alt=""
        className={className}
        zoomLabel={zoomLabel}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      style={{ display: 'block' }}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
