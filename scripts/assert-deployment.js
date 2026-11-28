async function assertDeployment(platform, env = process.env, fetchImpl = fetch) {
  const branch = platform === 'azure' ? 'staging' : platform === 'github' ? 'production' : null;
  const allowedEvents = platform === 'azure' ? ['IndividualCI', 'BatchedCI'] : ['push'];
  if (!branch || env.DEPLOY_ENABLED !== 'true' || env.SOURCE_BRANCH !== `refs/heads/${branch}` ||
      !allowedEvents.includes(env.CI_EVENT)) throw new Error('Deployment is not authorized for this event');
  const targetApp = platform === 'azure' ? 'adopet-backend-integration' : 'adopet-backend-production';
  if (env.DEPLOY_APP_NAME !== targetApp) {
    throw new Error('Deployment application does not match the authorized destination');
  }
  const health = new URL(env.DEPLOY_HEALTH_URL);
  if (health.protocol !== 'https:' || health.username || health.password || health.search || health.hash || health.pathname !== '/') {
    throw new Error('Invalid deployment health origin');
  }
  const names = platform === 'azure' ? ['AZURE_SERVICE_CONNECTION'] :
    ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID'];
  for (const name of names) {
    if (!env[name] || /UNCONFIGURED|\$\(|[<>]/.test(env[name])) throw new Error(`Missing deployment setting: ${name}`);
  }
  if (!/^[a-f0-9]{40}$/.test(env.SOURCE_COMMIT || '') ||
      !/^[\w.-]+\/[\w.-]+$/.test(env.SOURCE_REPOSITORY || '')) throw new Error('Invalid source metadata');
  const headers = { Accept: 'application/vnd.github+json' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const response = await fetchImpl(`https://api.github.com/repos/${env.SOURCE_REPOSITORY}/git/ref/heads/${branch}`, {
    headers, redirect: 'error', signal: AbortSignal.timeout(10000)
  });
  if (!response.ok || (await response.json()).object?.sha !== env.SOURCE_COMMIT) {
    throw new Error('Deployment commit is stale or branch could not be verified');
  }
}

if (require.main === module) {
  assertDeployment(process.argv[2]).then(() => console.log('Deployment preconditions verified.'))
    .catch(() => { console.error('Deployment preconditions failed; check configuration, branch and commit.'); process.exitCode = 1; });
}
module.exports = { assertDeployment };
