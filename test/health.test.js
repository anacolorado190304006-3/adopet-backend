const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const healthRoutes = require('../src/routes/health.routes');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('liveness does not query DB; readiness reflects DB failure without leaking errors', async (t) => {
  let available = true;
  let queries = 0;
  const app = express();
  app.use('/health', healthRoutes({
    version: 'fixture-version',
    pool: { query: async () => { queries++; if (!available) throw new Error('private-db-detail'); } }
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const live = await fetch(`${base}/health/live`);
  assert.equal(live.status, 200);
  assert.equal(queries, 0);
  const ready = await fetch(`${base}/health/ready`);
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).database, 'connected');
  available = false;
  const failed = await fetch(`${base}/health/ready`);
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { status: 'not_ready', database: 'unavailable', version: 'fixture-version' });
  assert.equal((await fetch(`${base}/health/live`)).status, 200);
  assert.equal(queries, 2);
});

test('server starts on platform PORT and drains on SIGTERM without DB connection', { timeout: 15000 }, async (t) => {
  const child = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, NODE_ENV: 'test', PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  const exited = once(child, 'exit');
  let output = '';
  const port = await new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = /listening on port (\d+)/.exec(output);
      if (match) resolve(match[1]);
    });
    child.once('exit', () => reject(new Error('Server exited before listening')));
  });
  assert.equal((await fetch(`http://127.0.0.1:${port}/health/live`)).status, 200);
  child.kill('SIGTERM');
  assert.equal((await exited)[0], 0);
});

test('production with missing configuration fails startup without exposing values', async () => {
  const child = spawn(process.execPath, ['src/server.js'], {
    env: { PATH: process.env.PATH, NODE_ENV: 'production', DB_HOST: '' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  let message = '';
  child.stderr.on('data', (chunk) => { message += chunk; });
  assert.equal((await once(child, 'exit'))[0], 1);
  assert.match(message, /Server startup failed/);
});
