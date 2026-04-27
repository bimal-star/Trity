/**
 * Next.js App Router <Link> rejects hrefs that contain literal dynamic segment
 * syntax (e.g. `/admin/tenants/[id]`). Navigation paths must be concrete URLs.
 */
export function hasAppRouterDynamicSegments(path: string): boolean {
  return /\[[^\]]+\]/.test(path);
}

/** Non-null when `path` must not be passed to next/link. */
export function navigationPathLinkError(path: string): string | null {
  const p = path.trim();
  if (!p) return null;
  if (hasAppRouterDynamicSegments(p)) {
    return 'Path cannot contain dynamic segments like [id]. Use a real URL (e.g. /admin/tenants).';
  }
  return null;
}
