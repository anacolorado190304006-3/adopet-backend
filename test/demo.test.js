const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const { once } = require('node:events');
const express = require('express');
const healthRoutes = require('../src/routes/health.routes');

test('demo readiness returns 503 without attempting an unconfigured database', async (t) => {
  const app = express();
  app.use('/health', healthRoutes({
    demoMode: true, version: 'fixture',
    pool: { query: () => assert.fail('Demo must not contact PostgreSQL') }
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const live = await fetch(base + '/health/live');
  assert.equal(live.status, 200);
  assert.equal((await live.json()).mode, 'demo');
  const ready = await fetch(base + '/health/ready');
  assert.equal(ready.status, 503);
  assert.equal((await ready.json()).reason, 'demo_mode');
});

test('packaged production demo starts without DB credentials, keeps JWT protection and never returns successful persistence', { timeout: 20000 }, async (t) => {
  const folder = await mkdtemp(path.join(tmpdir(), 'adopet-demo-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const zip = path.join(folder, 'backend.zip');
  const runtime = path.join(folder, 'runtime');
  const sha = 'c'.repeat(40);
  await promisify(execFile)('python3', ['scripts/package-deployment.py', '--output', zip, '--commit', sha]);
  await promisify(execFile)('python3', ['-m', 'zipfile', '-e', zip, runtime]);
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: runtime,
    env: {
      PATH: process.env.PATH, NODE_ENV: 'production', PORT: '0', DEMO_MODE: 'true',
      AUTH0_AUDIENCE: 'https://api.example.invalid',
      AUTH0_ISSUER_BASE_URL: 'https://tenant.example.invalid/',
      CORS_ORIGINS: 'https://frontend.example.invalid'
    },
    stdio: ['ignore', 'pipe', 'pipe']
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
    child.once('exit', () => reject(new Error('Demo failed to start')));
  });
  const base = `http://127.0.0.1:${port}`;
  const live = await fetch(base + '/health/live');
  assert.equal(live.status, 200);
  assert.deepEqual(await live.json(), { status: 'ok', version: sha, mode: 'demo' });
  assert.equal((await fetch(base + '/health/ready')).status, 503);
  for (const endpoint of ['/api/health', '/api/roles', '/api/users']) {
    const response = await fetch(base + endpoint);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'DATABASE_UNAVAILABLE');
  }
  for (const endpoint of ['/api/pets', '/api/me', '/api/organizations', '/api/admin/users']) {
    assert.equal((await fetch(base + endpoint)).status, 401);
    assert.equal((await fetch(base + endpoint, { headers: { Authorization: 'Bearer invalid' } })).status, 401);
  }
  assert.equal((await fetch(base + '/api/pets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
  })).status, 401);
  child.kill('SIGTERM');
  assert.equal((await exited)[0], 0);
});
