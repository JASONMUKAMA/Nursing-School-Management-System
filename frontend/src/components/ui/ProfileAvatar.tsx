import { resolveMediaUrl } from '../../utils/mediaUrl';

interface ProfileAvatarProps {
  url?: string | null;
  className?: string;
  emptyClassName?: string;
}

export function ProfileAvatar({
  url,
  className = 'table-avatar',
  emptyClassName = 'table-avatar table-avatar-empty',
}: ProfileAvatarProps) {
  const src = resolveMediaUrl(url);
  if (!src) {
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
      loading="lazy"
    />
  );
}
