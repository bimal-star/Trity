/**
 * Debug logging: POST to ingest, push to window.__debugLog, and console.log.
 * Use for agent instrumentation. Safe to use in browser only.
 */
const INGEST = 'http://127.0.0.1:7242/ingest/90675596-6667-4a87-b916-bebca6e178c1';

export function debugLog(payload: {
  location: string;
  message: string;
  data: Record<string, unknown>;
  hypothesisId: string;
}) {
  const full = {
    ...payload,
    timestamp: Date.now(),
    sessionId: 'debug-session',
  };
  fetch(INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(full),
  }).catch(() => {});
  if (typeof window !== 'undefined') {
    (window as unknown as { __debugLog?: unknown[] }).__debugLog =
      (window as unknown as { __debugLog?: unknown[] }).__debugLog || [];
    (window as unknown as { __debugLog: unknown[] }).__debugLog.push(full);
    console.log('[DEBUG]', full.hypothesisId, full.message, full.data);
  }
}
