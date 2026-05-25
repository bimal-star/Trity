import fs from 'fs';
import path from 'path';

let credentialsMerged = false;

/**
 * Merge gitignored `.env.credentials` into process.env when a server secret is missing.
 * next.config.js does this at startup; API routes may load before or without that merge in some setups.
 */
export function ensureServerSecretsFromCredentialsFile(): void {
  if (credentialsMerged) return;
  credentialsMerged = true;

  const fp = path.join(process.cwd(), '.env.credentials');
  if (!fs.existsSync(fp)) return;

  let raw: string;
  try {
    raw = fs.readFileSync(fp, 'utf8');
  } catch {
    return;
  }
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  for (let line of raw.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    const cur = process.env[key];
    if (cur == null || String(cur).trim() === '') {
      process.env[key] = val;
    }
  }
}

export function getSupabaseServiceRoleKey(): string | null {
  ensureServerSecretsFromCredentialsFile();

  const candidates = [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SERVICE_KEY];

  for (const c of candidates) {
    const trimmed = c?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
