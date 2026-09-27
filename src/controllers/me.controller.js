const pool = require('../config/database');

const getMe = async (req, res) => {
  try {
    const auth0UserId = req.auth.payload.sub;

    const result = await pool.query(
      `
      SELECT
        u.identification,
        u.name,
        u.mail,
        u.rol_id,
        r.name AS rol,
        u.auth0_user_id
      FROM users u
      INNER JOIN roles r ON r.id = u.rol_id
      WHERE u.auth0_user_id = $1
      `,
      [auth0UserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Usuario autenticado no registrado en AdoPet'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);

    res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

const syncUser = async (req, res) => {
  try {
    const auth0UserId = req.auth.payload.sub;

    const role = req.auth.payload['https://adopet.com/role'];
    const identification = req.auth.payload['https://adopet.com/identification'];
    const name = req.auth.payload['https://adopet.com/name'];
    const mail = req.auth.payload['https://adopet.com/mail'];

    if (!role || !identification || !name || !mail) {
      return res.status(400).json({
        message: 'Faltan datos del usuario en el token de Auth0',
        data: {
          role,
          identification,
          name,
          mail
        }
      });
    }

    let rolId;

    if (role === 'adoptante') {
      rolId = 3;
    } else if (role === 'organizacion') {
      rolId = 2;
    } else {
      return res.status(400).json({
        message: 'Rol no válido'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO users (
        identification,
        name,
        mail,
        rol_id,
        auth0_user_id
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (auth0_user_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        mail = EXCLUDED.mail,
        updated_at = NOW()
      RETURNING
        identification,
        name,
        mail,
        rol_id,
        auth0_user_id
      `,
      [
        identification,
        name,
        mail,
        rolId,
        auth0UserId
      ]
    );

    res.json({
      message: 'Usuario sincronizado correctamente',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error sincronizando usuario:', error);

    res.status(500).json({
      message: 'Error sincronizando usuario'
    });
  }
};

module.exports = {
  getMe,
  syncUser
};