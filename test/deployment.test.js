const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertDeployment } = require('../scripts/assert-deployment');
const { checkHealth } = require('../scripts/check-health');
const commit = 'a'.repeat(40);
const environment = {
  DEPLOY_ENABLED: 'true', SOURCE_BRANCH: 'refs/heads/staging', CI_EVENT: 'IndividualCI',
  DEPLOY_APP_NAME: 'adopet-backend-integration', DEPLOY_HEALTH_URL: 'https://app.example.invalid',
  AZURE_SERVICE_CONNECTION: 'fixture-service', SOURCE_COMMIT: commit,
  SOURCE_REPOSITORY: 'fixture-owner/adopet-backend'
};
const latest = async () => ({ ok: true, json: async () => ({ object: { sha: commit } }) });

test('allows only configured Azure staging CI', async () => {
  await assertDeployment('azure', environment, latest);
});
const githubEnvironment = {
  ...environment, SOURCE_BRANCH: 'refs/heads/production', CI_EVENT: 'push',
  DEPLOY_APP_NAME: 'adopet-backend-production',
  AZURE_WEBAPP_PUBLISH_PROFILE: '<publishData>synthetic-test-fixture</publishData>'
};
test('allows GitHub production push with a publish profile and no OIDC identifiers', async () => {
  await assertDeployment('github', githubEnvironment, latest);
});
for (const [label, change] of [
  ['missing profile', { AZURE_WEBAPP_PUBLISH_PROFILE: undefined }],
  ['empty profile', { AZURE_WEBAPP_PUBLISH_PROFILE: '' }],
  ['blank profile', { AZURE_WEBAPP_PUBLISH_PROFILE: '   ' }],
  ['wrong target', { DEPLOY_APP_NAME: 'adopet-backend-integration' }],
  ['wrong branch', { SOURCE_BRANCH: 'refs/heads/staging' }],
  ['manual event', { CI_EVENT: 'workflow_dispatch' }],
  ['PR event', { CI_EVENT: 'pull_request' }],
  ['disabled deployment', { DEPLOY_ENABLED: 'false' }]
]) {
  test(`GitHub deployment rejects ${label} before network access`, async () => {
    await assert.rejects(assertDeployment('github', { ...githubEnvironment, ...change },
      () => assert.fail('No network expected')));
  });
}
test('GitHub profile does not replace Azure service connection or bypass current SHA verification', async () => {
  await assert.rejects(assertDeployment('azure', {
    ...environment, AZURE_SERVICE_CONNECTION: undefined,
    AZURE_WEBAPP_PUBLISH_PROFILE: githubEnvironment.AZURE_WEBAPP_PUBLISH_PROFILE
  }, () => assert.fail('No network expected')));
  await assert.rejects(assertDeployment('github', githubEnvironment,
    async () => ({ ok: true, json: async () => ({ object: { sha: 'b'.repeat(40) } }) })));
});
for (const change of [
  { DEPLOY_ENABLED: 'false' }, { CI_EVENT: 'PullRequest' }, { CI_EVENT: 'Manual' },
  { SOURCE_BRANCH: 'refs/heads/feature/example' }, { DEPLOY_APP_NAME: '' },
  { DEPLOY_APP_NAME: 'adopet-backend-production' },
  { AZURE_SERVICE_CONNECTION: 'UNCONFIGURED' }, { DEPLOY_HEALTH_URL: 'http://app.example.invalid' },
  { SOURCE_COMMIT: '' }, { SOURCE_REPOSITORY: '../invalid' }
]) {
  test(`deployment rejects ${JSON.stringify(change)} before network access`, async () => {
    await assert.rejects(assertDeployment('azure', { ...environment, ...change }, () => assert.fail('No network expected')));
  });
}
test('stale commit or inaccessible branch blocks deployment', async () => {
  for (const response of [
    { ok: false }, { ok: true, json: async () => ({ object: { sha: 'b'.repeat(40) } }) }
  ]) await assert.rejects(assertDeployment('azure', environment, async () => response));
});
test('health retries readiness then verifies the deployed SHA', async () => {
  let calls = 0;
  await checkHealth('https://app.example.invalid', commit, {
    attempts: 2, wait: async () => {}, fetchImpl: async () => ({
      ok: ++calls > 1, json: async () => ({ status: 'ready', database: 'connected', version: commit })
    })
  });
  assert.equal(calls, 2);
});
test('HTTP 200 with the previous release is not successful deployment', async () => {
  await assert.rejects(checkHealth('https://app.example.invalid', commit, {
    attempts: 1, fetchImpl: async () => ({ ok: true, json: async () => ({ status: 'ready', database: 'connected', version: 'old' }) })
  }));
});
test('failed readiness, network errors and unsafe health URLs fail', async () => {
  await assert.rejects(checkHealth('https://app.example.invalid', commit, { attempts: 1, fetchImpl: async () => { throw new Error('unreachable'); } }));
  await assert.rejects(checkHealth('http://app.example.invalid', commit));
  await assert.rejects(checkHealth('https://app.example.invalid', 'missing-sha'));
});

test('explicit liveness verifies the live endpoint and the exact deployed commit without claiming DB readiness', async () => {
  await checkHealth('https://app.example.invalid', commit, {
    mode: 'liveness', attempts: 1,
    fetchImpl: async (url) => {
      assert.equal(url.pathname, '/health/live');
      return { ok: true, json: async () => ({ status: 'ok', version: commit, mode: 'demo' }) };
    }
  });
});
test('liveness rejects a previous SHA, unavailable process and invalid check mode', async () => {
  for (const body of [{ status: 'ok', version: 'old' }, { status: 'not_ready', version: commit }]) {
    await assert.rejects(checkHealth('https://app.example.invalid', commit, {
      mode: 'liveness', attempts: 1, fetchImpl: async () => ({ ok: true, json: async () => body })
    }));
  }
  await assert.rejects(checkHealth('https://app.example.invalid', commit, { mode: 'unknown' }));
});
test('readiness remains the default and rejects liveness-only success', async () => {
  await assert.rejects(checkHealth('https://app.example.invalid', commit, {
    attempts: 1, fetchImpl: async (url) => {
      assert.equal(url.pathname, '/health/ready');
      return { ok: true, json: async () => ({ status: 'ok', version: commit }) };
    }
  }));
});
