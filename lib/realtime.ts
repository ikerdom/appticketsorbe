export const PRESENCE_TTL_MS = 60_000;
export const EDIT_LOCK_TTL_MS = 180_000;

export function presenceCutoffDate() {
  return new Date(Date.now() - PRESENCE_TTL_MS);
}

export function nextEditLockExpiry() {
  return new Date(Date.now() + EDIT_LOCK_TTL_MS);
}
