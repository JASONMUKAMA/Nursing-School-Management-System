import { useEffect, useState } from 'react';
import { resolveMediaUrl } from '../../utils/mediaUrl';

interface ProfileAvatarProps {
  url?: string | null;
  className?: string;
  emptyClassName?: string;
  cacheBust?: string | number;
  /** Table rows should load immediately; profile views can lazy-load. */
  eager?: boolean;
}

export function ProfileAvatar({
  url,
  className = 'table-avatar',
  emptyClassName = 'table-avatar table-avatar-empty',
  cacheBust,
  eager = false,
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
