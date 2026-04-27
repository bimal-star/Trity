/**
 * Removes `.next` so a stale webpack / instrumentation cache cannot keep breaking `next dev`
 * after config or dependency changes (see terminal webpack + instrumentation errors).
 *
 * On Windows, AV/indexers/dev servers can briefly lock files under `.next`; we retry `fs.rmSync`
 * with delays so removal usually succeeds without manual intervention.
 */
const fs = require('fs');
const path = require('path');
const { setTimeout: delay } = require('timers/promises');

const MAX_ATTEMPTS = 5;
const RETRY_MS = 400;

async function removeNextDir() {
  const dir = path.join(process.cwd(), '.next');

  if (!fs.existsSync(dir)) {
    console.log('[clean-next] no .next folder (nothing to remove)');
    return;
  }

  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (!fs.existsSync(dir)) {
      console.log('[clean-next] .next already removed');
      return;
    }
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log('[clean-next] removed', dir);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS) {
        console.error(
          '[clean-next] ERROR: could not remove .next after',
          MAX_ATTEMPTS,
          'attempts (often EPERM / file in use on Windows). Close dev servers and retry.\n' +
            'Path:',
          dir
        );
        console.error('[clean-next] Last error:', err && err.message ? err.message : err);
        if (err && err.code) console.error('[clean-next] Code:', err.code);
        process.exitCode = 1;
        return;
      }
      await delay(RETRY_MS);
    }
  }
}

removeNextDir().catch((err) => {
  console.error('[clean-next] ERROR: unexpected failure:', err && err.message ? err.message : err);
  process.exitCode = 1;
});
