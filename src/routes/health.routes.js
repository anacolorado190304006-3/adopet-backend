const express = require('express');

function healthRoutes({ pool, version }) {
  const router = express.Router();
  router.get('/live', (req, res) => res.json({ status: 'ok', version }));
  router.get('/ready', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready', database: 'connected', version });
    } catch {
      res.status(503).json({ status: 'not_ready', database: 'unavailable', version });
    }
  });
  return router;
}

module.exports = healthRoutes;
