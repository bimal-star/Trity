import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Require a Bearer token on all /api/* requests so anonymous callers are rejected
 * before route handlers run. OPTIONS is exempt (CORS preflight has no Authorization).
 * Handlers still validate the JWT with Supabase.
 */
export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  const auth = request.headers.get('authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
