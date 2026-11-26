const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config/runtime');

const production = {
  NODE_ENV: 'production', DB_HOST: 'db.example.invalid', DB_NAME: 'adopet',
  DB_USER: 'fixture-user', DB_PASSWORD: 'fixture-value', CORS_ORIGINS: 'https://app.example.invalid',
  AUTH0_AUDIENCE: 'https://api.example.invalid', AUTH0_ISSUER_BASE_URL: 'https://tenant.example.invalid/',
  AUTH0_DOMAIN: 'tenant.example.invalid', AUTH0_MGMT_CLIENT_ID: 'fixture-client',
  AUTH0_MGMT_CLIENT_SECRET: 'fixture-value', AUTH0_CONNECTION: 'fixture-connection'
};

test('production uses verified TLS, bounded DB operations and explicit Auth0/CORS', () => {
  const config = loadConfig(production);
  assert.deepEqual(config.database.ssl, { rejectUnauthorized: true });
  assert.equal(config.database.connectionTimeoutMillis, 5000);
  assert.equal(config.database.query_timeout, 5000);
  assert.equal(config.auth.audience, production.AUTH0_AUDIENCE);
  assert.deepEqual(config.origins, [production.CORS_ORIGINS]);
  assert.equal(config.host, '0.0.0.0');
});

for (const name of Object.keys(production).filter((key) => key !== 'NODE_ENV')) {
  test(`production requires ${name} without leaking its value`, () => {
    assert.throws(() => loadConfig({ ...production, [name]: '' }), new RegExp(name));
  });
}
for (const change of [
  { PORT: 'NaN' }, { PORT: '-1' }, { PORT: '65536' }, { DB_PORT: '0' },
  { CORS_ORIGINS: '*' }, { CORS_ORIGINS: 'http://app.example.invalid' },
  { CORS_ORIGINS: 'https://app.example.invalid/path' }, { DB_SSL: 'false' },
  { DB_SSL: 'invalid' }, { AUTH0_ISSUER_BASE_URL: 'http://tenant.example.invalid' },
  { AUTH0_ISSUER_BASE_URL: 'not-a-url' }, { DB_SSL_CA_FILE: '/not-present/ca.pem' }
]) {
  test(`rejects unsafe production setting ${JSON.stringify(change)}`, () => {
    assert.throws(() => loadConfig({ ...production, ...change }));
  });
}
test('local defaults retain existing API audience, issuer and CORS', () => {
  const config = loadConfig({});
  assert.equal(config.port, 3000);
  assert.equal(config.database.ssl, false);
  assert.equal(config.auth.audience, 'https://api.adopet.com');
  assert.deepEqual(config.origins, ['http://localhost:4200']);
});
test('multiple explicit origins and platform PORT are supported', () => {
  const config = loadConfig({ ...production, PORT: '8080', CORS_ORIGINS: 'https://a.example.invalid,https://b.example.invalid' });
  assert.equal(config.port, 8080);
  assert.equal(config.origins.length, 2);
});
