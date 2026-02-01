/**
 * Owner display utilities
 * Stub: show owner_id slice or "—" until user_profiles / auth resolution is wired.
 */

export function formatOwner(ownerId: string | null | undefined): string {
  if (!ownerId) return '—';
  return ownerId.slice(0, 8);
}
