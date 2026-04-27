/**
 * Client-side CSV download helpers for list exports and import flows.
 */

export function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Strip a trailing .csv if present, then download as UTF-8 CSV. */
export function downloadTableCsv(
  filenameBase: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const base = filenameBase.replace(/\.csv$/i, '');
  downloadCsv(`${base}.csv`, headers, rows);
}

/** Split a single CSV line respecting double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(splitCsvLine);
}

export function csvRowsToObjects(headers: string[], rows: string[][]): Record<string, string>[] {
  const h = headers.map((x) => x.trim().toLowerCase());
  return rows.map((cells) => {
    const o: Record<string, string> = {};
    h.forEach((key, i) => {
      o[key] = cells[i] ?? '';
    });
    return o;
  });
}
