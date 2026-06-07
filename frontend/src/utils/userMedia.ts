import type { User } from '../types';

/** Read profile image URL from API payloads (camelCase or PascalCase). */
export function getUserPhotoUrl(
  user: User | (User & Record<string, unknown>),
  cache?: Record<string, string>,
): string | null | undefined {
  const raw = user as User & Record<string, unknown>;
  return (
    user.profileImageUrl ??
    (raw.ProfileImageUrl as string | undefined) ??
    cache?.[user.id]
  );
}

export function mergeUserMedia(base: User, patch: Partial<User>): User {
  return {
    ...base,
    ...patch,
    profileImageUrl: patch.profileImageUrl ?? base.profileImageUrl,
    nationalIdFrontUrl: patch.nationalIdFrontUrl ?? base.nationalIdFrontUrl,
    nationalIdBackUrl: patch.nationalIdBackUrl ?? base.nationalIdBackUrl,
  };
}

export function mergeUserPhotoCache(
  prev: Record<string, string>,
  users: User[],
): Record<string, string> {
  let next: Record<string, string> | null = null;
  for (const user of users) {
    const url = getUserPhotoUrl(user);
    if (!url) continue;
    if ((next ?? prev)[user.id] === url) continue;
    if (!next) next = { ...prev };
    next[user.id] = url;
  }
  return next ?? prev;
}
