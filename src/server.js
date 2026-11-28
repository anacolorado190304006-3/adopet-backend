async function startServer() {
  const { loadConfig } = require('./config/runtime');
  const config = loadConfig();
  const app = require('./app');
  const pool = require('./config/database');
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(config.port, config.host, () => resolve(listener));
    listener.once('error', reject);
  });
  console.log(`AdoPet listening on port ${server.address().port}`);
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, 10000);
    deadline.unref();
    server.close(async () => {
      try { await pool.end(); clearTimeout(deadline); }
      catch { console.error('Shutdown failed'); process.exitCode = 1; }
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}

if (require.main === module) {
  startServer().catch(() => {
    console.error('Server startup failed; verify application configuration and port.');
    process.exitCode = 1;
  });
}

module.exports = { startServer };
