const { setTimeout: delay } = require('node:timers/promises');

async function checkHealth(baseURL, expectedCommit, { fetchImpl = fetch, attempts = 40, wait = delay } = {}) {
  const url = new URL(baseURL);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Health URL must be an HTTPS origin without credentials');
  }
  if (!/^[a-f0-9]{40}$/.test(expectedCommit)) throw new Error('Expected release SHA is required');
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetchImpl(new URL('/health/ready', url), {
        redirect: 'error', signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const body = await response.json();
        if (body.status === 'ready' && body.database === 'connected' && body.version === expectedCommit) return;
      }
    } catch { /* Retry transient network/readiness errors without logging response data. */ }
    if (attempt + 1 < attempts) await wait(3000);
  }
  throw new Error('Readiness or deployed release verification failed');
}

if (require.main === module) {
  checkHealth(process.env.DEPLOY_HEALTH_URL, process.env.SOURCE_COMMIT)
    .then(() => console.log('Readiness and deployed commit verified.'))
    .catch(() => { console.error('Deployment health check failed.'); process.exitCode = 1; });
}
module.exports = { checkHealth };
