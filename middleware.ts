/*
 * EDGE RUNTIME — KEEP THIS FILE MINIMAL
 *
 * DO NOT import any of the following here:
 *   - openai
 *   - @opentelemetry
 *   - xlsx
 *   - papaparse
 *   - @supabase/supabase-js (server client)
 *   - Any Node.js-only modules
 *
 * This file runs on the edge on EVERY request that matches `config.matcher`.
 * Target size: under 50KB parsed.
 * Current size: check .next/analyze/edge.html (run `npm run analyze`).
 *
 * `matcher` points at a non-existent path so nothing in the app hits this middleware
 * until you deliberately wire real routes. Re-enable by setting `matcher` to real paths;
 * keep imports tiny.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/__trity_middleware_disabled__'],
};
