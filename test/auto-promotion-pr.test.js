const { test } = require('node:test');
const assert = require('node:assert/strict');
const openPromotionPr = require('../scripts/auto-promotion-pr');

function fixture(options = {}) {
  const calls = { list: [], get: [], compare: [], create: [], failures: [], logs: [] };
  const context = {
    eventName: 'push', ref: 'refs/heads/development', sha: 'source-sha',
    payload: { deleted: false }, repo: { owner: 'adopet-owner', repo: 'adopet-backend' },
    ...options.context
  };
  const github = { rest: {
    pulls: {
      list: async (args) => {
        calls.list.push(args);
        if (options.listError) throw options.listError;
        return { data: options.open || (calls.list.length > 1 ? options.concurrent || [] : []) };
      },
      create: async (args) => {
        calls.create.push(args);
        if (options.createError) throw options.createError;
        return { data: { number: 42 } };
      }
    },
    repos: {
      getCommit: async (args) => {
        calls.get.push(args);
        if (options.getError) throw options.getError;
        const source = args.ref === context.ref.slice('refs/heads/'.length);
        return { data: {
          sha: source ? options.sourceSha || 'source-sha' : 'base-sha',
          commit: { tree: { sha: options.identical ? 'same-tree' : `${args.ref}-tree` } }
        } };
      },
      compareCommitsWithBasehead: async (args) => {
        calls.compare.push(args);
        if (options.compareError) throw options.compareError;
        return { data: options.comparison || { ahead_by: 1, files: [{ filename: 'src/example.js' }] } };
      }
    }
  } };
  const core = {
    info: (value) => calls.logs.push(value),
    setFailed: (value) => calls.failures.push(value)
  };
  return { calls, run: () => openPromotionPr({ github, context, core }) };
}

for (const [head, base] of [['development', 'staging'], ['staging', 'production']]) {
  test(`opens only ${head} -> ${base}`, async () => {
    const f = fixture({ context: { ref: `refs/heads/${head}` } });
    assert.deepEqual(await f.run(), { status: 'created', number: 42 });
    assert.equal(f.calls.create.length, 1);
    assert.equal(f.calls.create[0].head, head);
    assert.equal(f.calls.create[0].base, base);
    assert.equal(f.calls.create[0].draft, false);
    assert.equal(f.calls.list[0].head, `adopet-owner:${head}`);
    assert.equal(f.calls.list[0].state, 'open');
    assert.equal(f.calls.compare[0].basehead, 'base-sha...source-sha');
    assert.equal(f.calls.failures.length, 0);
  });
}

for (const context of [
  { ref: 'refs/heads/production' }, { ref: 'refs/heads/main' },
  { ref: 'refs/heads/feature/example' }, { ref: 'refs/tags/development' },
  { eventName: 'pull_request' }, { payload: { deleted: true } }
]) {
  test(`ignores unsupported event ${JSON.stringify(context)}`, async () => {
    const f = fixture({ context });
    assert.equal((await f.run()).status, 'ignored');
    assert.equal(f.calls.list.length, 0);
    assert.equal(f.calls.create.length, 0);
  });
}

test('reuses an open PR, including a draft, without updating it', async () => {
  const f = fixture({ open: [{ number: 9, draft: true }] });
  assert.deepEqual(await f.run(), { status: 'existing', number: 9 });
  assert.equal(f.calls.get.length, 0);
  assert.equal(f.calls.create.length, 0);
});

test('does not act on a stale push', async () => {
  const f = fixture({ sourceSha: 'newer-sha' });
  assert.equal((await f.run()).status, 'stale');
  assert.equal(f.calls.create.length, 0);
});

test('does not open PR for identical trees even with different commits', async () => {
  const f = fixture({ identical: true });
  assert.equal((await f.run()).status, 'identical');
  assert.equal(f.calls.compare.length, 0);
  assert.equal(f.calls.create.length, 0);
});

for (const comparison of [
  { ahead_by: 0, files: [{ filename: 'target-only.js' }] },
  { ahead_by: 2, files: [] }
]) {
  test(`does not open a PR without changes ${JSON.stringify(comparison)}`, async () => {
    const f = fixture({ comparison });
    assert.equal((await f.run()).status, 'no-diff');
    assert.equal(f.calls.create.length, 0);
  });
}

test('fails closed when comparison data is incomplete', async () => {
  const f = fixture({ comparison: { ahead_by: 1 } });
  assert.equal((await f.run()).status, 'failed');
  assert.equal(f.calls.create.length, 0);
  assert.equal(f.calls.failures.length, 1);
});

test('handles concurrent duplicate creation (422) by looking up the open PR again', async () => {
  const f = fixture({ createError: { status: 422 }, concurrent: [{ number: 43 }] });
  assert.deepEqual(await f.run(), { status: 'existing', number: 43 });
  assert.equal(f.calls.list.length, 2);
  assert.equal(f.calls.create.length, 1);
  assert.equal(f.calls.failures.length, 0);
});

for (const status of [401, 403, 404, 422, 429, 500]) {
  test(`reports API failure ${status} without exposing response details`, async () => {
    const f = fixture({ createError: { status, message: 'private-response-marker' } });
    assert.equal((await f.run()).status, 'failed');
    assert.equal(f.calls.failures.length, 1);
    assert.match(f.calls.failures[0], new RegExp(`HTTP ${status}`));
    assert.ok(![...f.calls.logs, ...f.calls.failures].join().includes('private-response-marker'));
  });
}

for (const options of [
  { listError: { status: 403 } }, { getError: { status: 404 } },
  { compareError: { status: 500 } }
]) {
  test(`read failure never creates a PR: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.equal((await f.run()).status, 'failed');
    assert.equal(f.calls.create.length, 0);
    assert.equal(f.calls.failures.length, 1);
  });
}
