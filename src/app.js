const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const roleRoutes = require('./routes/role.routes');
const userRoutes = require('./routes/user.routes');
const checkJwt = require('./middleware/auth.middleware');
const meRoutes = require('./routes/me.routes');
const petRoutes = require('./routes/pet.routes');
const organizationRoutes = require('./routes/organization.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'AdoPet Backend funcionando correctamente 🐾'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      status: 'ok',
      database: 'connected',
      time: result.rows[0].now
    });
  } catch (error) {
    console.error('Error conectando a PostgreSQL:', error);

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

module.exports = app;
