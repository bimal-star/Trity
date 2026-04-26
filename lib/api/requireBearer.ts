/**
 * API routes: reject missing/invalid Bearer tokens before handler work.
 * (Replaces edge middleware so middleware.js stays out of the bundle graph.)
 */
export type BearerParseResult = { ok: true; token: string } | { ok: false; response: Response };

export function parseBearerToken(request: Request): BearerParseResult {
  const header = request.headers.get('authorization');
  if (!header) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  const [type, ...rest] = header.split(' ');
  const token = rest.join(' ').trim();
  if (type?.toLowerCase() !== 'bearer' || !token) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  return { ok: true, token };
}
