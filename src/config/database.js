const { Pool } = require('pg');
const { loadConfig } = require('./runtime');

const pool = new Pool(loadConfig().database);
pool.on('error', () => console.error('Unexpected PostgreSQL pool error'));

module.exports = pool;
