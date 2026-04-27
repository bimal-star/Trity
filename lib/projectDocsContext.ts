import fs from 'fs/promises';
import path from 'path';

/**
 * Fixed allowlist only — never pass user input as a path.
 * Root-relative to process.cwd() (Next.js project root in dev/build).
 */
const ALLOWED_FILES = [
  'README.md',
  'TRITY_CONTEXT.md',
  'SUPABASE_INTEGRATION_STATUS.md',
  'QUICK_REFERENCE.md',
] as const;

const MAX_CHARS_PER_FILE = 14_000;
const MAX_TOTAL_CHARS = 28_000;

/**
 * Load concatenated excerpts from key project markdown files for AI context.
 * Missing files are skipped. Content is truncated to stay within limits.
 */
export async function loadProjectDocsContext(): Promise<string> {
  const root = process.cwd();
  const parts: string[] = [];
  let remaining = MAX_TOTAL_CHARS;

  for (const rel of ALLOWED_FILES) {
    if (remaining <= 0) break;
    const fullPath = path.join(root, rel);
    try {
      const raw = (await fs.readFile(fullPath, 'utf8')).replace(/\r\n/g, '\n');
      const capped = raw.slice(0, MAX_CHARS_PER_FILE);
      const header = `\n\n--- File: ${rel} ---\n`;
      if (header.length >= remaining) break;
      remaining -= header.length;
      const body = capped.slice(0, remaining);
      parts.push(header + body);
      remaining -= body.length;
      if (capped.length > body.length) {
        parts.push('\n[…truncated…]\n');
        break;
      }
    } catch {
      // ENOENT or unreadable: skip
    }
  }

  return parts.join('').trim();
}
