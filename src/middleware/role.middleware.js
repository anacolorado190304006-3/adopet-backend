const pool = require('../config/database');

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const auth0UserId = req.auth.payload.sub;

      const result = await pool.query(
        `
        SELECT r.name AS rol
        FROM users u
        INNER JOIN roles r ON r.id = u.rol_id
        WHERE u.auth0_user_id = $1
        `,
        [auth0UserId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          message: 'Usuario no registrado en AdoPet'
        });
      }

      const userRole = result.rows[0].rol;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          message: 'No tienes permisos para realizar esta acción'
        });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Error verificando rol:', error);

      res.status(500).json({
        message: 'Error interno del servidor'
      });
    }
  };
};

module.exports = requireRole;