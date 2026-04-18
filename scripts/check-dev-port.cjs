/**
 * Fails fast if nothing can bind to the given TCP port (default 3100).
 * Catches orphan `next dev` / other apps → EADDRINUSE confusion.
 *
 * Usage: node scripts/check-dev-port.cjs [port]
 */
const net = require('net');

const port = parseInt(process.argv[2] || '3100', 10);

if (Number.isNaN(port) || port < 1 || port > 65535) {
  console.error('[check-dev-port] Invalid port:', process.argv[2]);
  process.exit(1);
}

const server = net.createServer();
server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('[trity] Port ' + port + ' is already in use.');
    console.error('  Stop the other dev server (Ctrl+C in that terminal), or run on another port:');
    console.error('    npm run dev:3101');
    console.error('  Windows — find PID:  netstat -ano | findstr :' + port);
    console.error('');
    process.exit(1);
  }
  console.error('[check-dev-port]', err.message);
  process.exit(1);
});

// Use Node default host (IPv6 :: when available), matching Next dev listen — not 0.0.0.0 only,
// or Windows can report "free" while :::port is already taken → EADDRINUSE after predev.
server.listen(port, () => {
  server.close(() => process.exit(0));
});
