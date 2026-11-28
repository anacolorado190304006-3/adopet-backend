const fs = require('node:fs');
require('dotenv').config({ quiet: true });

function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const demoSetting = env.DEMO_MODE ?? 'false';
  if (!['true', 'false'].includes(demoSetting)) throw new Error('Invalid DEMO_MODE');
  const demoMode = demoSetting === 'true';
  if (production) {
    const required = ['CORS_ORIGINS', 'AUTH0_AUDIENCE', 'AUTH0_ISSUER_BASE_URL'];
    if (!demoMode) required.push(
      'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'AUTH0_DOMAIN',
      'AUTH0_MGMT_CLIENT_ID', 'AUTH0_MGMT_CLIENT_SECRET', 'AUTH0_CONNECTION'
    );
    for (const name of required) {
      if (!env[name]?.trim()) throw new Error(`Missing required configuration: ${name}`);
    }
  }
  const port = Number(env.PORT ?? 3000);
  const dbPort = Number(env.DB_PORT ?? 5432);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
  if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) throw new Error('Invalid DB_PORT');
  const origins = (env.CORS_ORIGINS || 'http://localhost:4200').split(',').map((x) => x.trim());
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error('Invalid CORS_ORIGINS'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin ||
        (production && url.protocol !== 'https:')) throw new Error('Invalid CORS_ORIGINS');
  }
  const issuerBaseURL = env.AUTH0_ISSUER_BASE_URL || 'https://dev-8hr3d7mi5f0134xd.us.auth0.com/';
  let issuer;
  try { issuer = new URL(issuerBaseURL); } catch { throw new Error('Invalid AUTH0_ISSUER_BASE_URL'); }
  if (issuer.protocol !== 'https:' || issuer.username || issuer.password) {
    throw new Error('Invalid AUTH0_ISSUER_BASE_URL');
  }
  const tls = env.DB_SSL ?? (production ? 'true' : 'false');
  if (!['true', 'false'].includes(tls) || (production && tls !== 'true')) {
    throw new Error('DB_SSL must enable verified TLS in production');
  }
  const ssl = tls === 'true' ? { rejectUnauthorized: true } : false;
  if (env.DB_SSL_CA_FILE) {
    if (!ssl) throw new Error('DB_SSL_CA_FILE requires DB_SSL=true');
    try { ssl.ca = fs.readFileSync(env.DB_SSL_CA_FILE, 'utf8'); }
    catch { throw new Error('Cannot read DB_SSL_CA_FILE'); }
  }
  return {
    port, host: '0.0.0.0', origins, demoMode,
    auth: { audience: env.AUTH0_AUDIENCE || 'https://api.adopet.com', issuerBaseURL, tokenSigningAlg: 'RS256' },
    database: {
      host: env.DB_HOST, port: dbPort, database: env.DB_NAME,
      user: env.DB_USER, password: env.DB_PASSWORD, ssl,
      connectionTimeoutMillis: 5000, query_timeout: 5000, statement_timeout: 5000
    }
  };
}

module.exports = { loadConfig };
