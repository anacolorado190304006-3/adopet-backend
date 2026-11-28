const { loadConfig } = require('../config/runtime');
const { demoMode } = loadConfig();

// Run after JWT verification on protected routes and before DB-based role checks.
module.exports = function requirePersistence(req, res, next) {
  if (demoMode) {
    return res.status(503).json({
      code: 'DATABASE_UNAVAILABLE',
      message: 'La persistencia no está disponible en modo de demostración.'
    });
  }
  return next();
};
