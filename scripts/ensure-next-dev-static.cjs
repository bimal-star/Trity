/**
 * Ensures `.next/static/development` exists before `next dev`.
 * Without it, Turbopack/webpack dev can throw ENOENT writing `_buildManifest.js.tmp.*`
 * (internal server error in the browser) after a partial `.next` delete or race on Windows.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), '.next', 'static', 'development');
fs.mkdirSync(dir, { recursive: true });
