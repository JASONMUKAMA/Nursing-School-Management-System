/** Resolve API-relative upload paths for use in img/src and href. */
export function resolveMediaUrl(url?: string | null, cacheBust?: string | number): string | undefined {
  if (!url) return undefined;
  let resolved: string;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    resolved = url;
  } else {
    resolved = url.startsWith('/') ? url : `/${url}`;
  }
  if (cacheBust !== undefined && !resolved.startsWith('blob:') && !resolved.startsWith('data:')) {
    const sep = resolved.includes('?') ? '&' : '?';
    return `${resolved}${sep}v=${encodeURIComponent(String(cacheBust))}`;
  }
  return resolved;
}
