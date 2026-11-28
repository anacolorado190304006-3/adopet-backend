const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const roleRoutes = require('./routes/role.routes');
const userRoutes = require('./routes/user.routes');
const checkJwt = require('./middleware/auth.middleware');
const meRoutes = require('./routes/me.routes');
const petRoutes = require('./routes/pet.routes');
const organizationRoutes = require('./routes/organization.routes');
const adminUserRoutes = require('./routes/admin-user.routes');
const { loadConfig } = require('./config/runtime');
const healthRoutes = require('./routes/health.routes');
const releaseVersion = require('./config/release');

const requirePersistence = require('./middleware/persistence.middleware');
const config = loadConfig();
const app = express();

app.disable('x-powered-by');
app.use(cors({
  origin: config.origins
}));
app.use(express.json());
app.use('/health', healthRoutes({ pool, version: releaseVersion(), demoMode: config.demoMode }));

app.get('/', (req, res) => {
  res.json({
    message: config.demoMode
      ? 'AdoPet Backend en demostración; persistencia no disponible'
      : 'AdoPet Backend funcionando correctamente 🐾'
  });
});

app.get('/api/health', requirePersistence, async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      status: 'ok',
      database: 'connected',
      time: result.rows[0].now
    });
  } catch (error) {
    console.error('Error conectando a PostgreSQL');

    res.status(500).json({
      status: 'error',
      database: 'disconnected'
    });
  }
});

app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/me', meRoutes);app.use('/api/me', meRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/admin/users', adminUserRoutes);

module.exports = app;
