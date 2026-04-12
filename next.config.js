const fs = require('fs');
const path = require('path');
const { loadEnvConfig } = require('@next/env');

const projectDir = __dirname;

/**
 * Next.js does not load `.env.credentials` by default. Merge it so local dev works
 * when credentials live there (gitignored). `.env.local` / standard env files win
 * for non-empty values.
 */
function mergeEnvFromFile(relativePath) {
  const fp = path.join(projectDir, relativePath);
  if (!fs.existsSync(fp)) return;
  let raw;
  try {
    raw = fs.readFileSync(fp, 'utf8');
  } catch {
    return;
  }
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
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

// Load .env / .env.local / .env.development* the same way Next does, then overlay credentials.
loadEnvConfig(projectDir);
mergeEnvFromFile('.env.credentials');

/** Allow Supabase (hosted, local CLI, or custom URL) without weakening other CSP directives. */
function connectSrcDirective() {
  const parts = ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'];
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (raw) {
    try {
      const { protocol, host } = new URL(raw);
      if (host) {
        parts.push(`${protocol}//${host}`);
        if (protocol === 'https:') parts.push(`wss://${host}`);
        if (protocol === 'http:') parts.push(`ws://${host}`);
      }
    } catch {
      /* ignore invalid URL */
    }
  }
  return `connect-src ${parts.join(' ')}`;
}

/** script-src: omit unsafe-eval in production (Phase A CSP hardening). Dev keeps eval for tooling. */
function scriptSrcDirective() {
  const base = ["'self'", "'unsafe-inline'"];
  if (process.env.NODE_ENV === 'production') {
    return `script-src ${base.join(' ')}`;
  }
  return `script-src ${base.join(' ')} 'unsafe-eval'`;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Next 14 defaults to cache.type "filesystem" under .next/cache/webpack (see next/dist/build/webpack-config.js).
  // Windows AV/sync often causes PackFileCacheStrategy EPERM/ENOENT on rename (see terminal webpack warnings).
  // Default `npm run dev` uses Turbopack (`--turbo`) and skips webpack in dev; this applies when using `npm run dev:webpack`.
  // Our hook runs after Next's default; `false` disables persistent pack files for webpack dev.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },

  // Security headers - appended without modifying existing functionality
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrcDirective(),
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              connectSrcDirective(),
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
