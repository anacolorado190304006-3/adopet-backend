const pool = require('../config/database');
const auth0Service = require('../services/auth0-management.service');

const ROLE_IDS = {
  administrador: 1,
  organizacion: 2,
  adoptante: 3
};

const getUsers = async (req, res) => {
  try {
    const users = await auth0Service.getUsers();
    res.json(users);
  } catch (error) {
    console.error(
      'Error obteniendo usuarios de Auth0:',
      error.response?.data || error.message
    );

    res.status(500).json({
      message: 'Error obteniendo usuarios'
    });
  }
};


const createUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      email,
      password,
      name,
      identification,
      role
    } = req.body;

    if (!email || !password || !name || !identification || !role) {
      return res.status(400).json({
        message: 'Faltan datos obligatorios'
      });
    }

    const rolId = ROLE_IDS[role];

    if (!rolId) {
      return res.status(400).json({
        message: 'Rol no válido'
      });
    }

    /*
     * Primero creamos el usuario en Auth0.
     */
    const auth0User = await auth0Service.createUser({
      connection: process.env.AUTH0_CONNECTION,
      email,
      password,
      name,
      user_metadata: {
        role,
        ...(role === 'organizacion'
          ? {
              idOrg: identification,
              nameOrg: name
            }
          : {}),
        ...(role === 'adoptante'
          ? {
              nroDocumento: identification,
              name
            }
          : {})
      }
    });

    try {
      /*
       * Luego lo sincronizamos con PostgreSQL.
       */
      const result = await client.query(
        `
        INSERT INTO users (
          identification,
          name,
          mail,
          rol_id,
          auth0_user_id
        )
        VALUES ($1, $2, $3, $4, $5)
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
          email,
          rolId,
          auth0User.user_id
        ]
      );

      res.status(201).json({
        message: 'Usuario creado correctamente',
        auth0User,
        user: result.rows[0]
      });

    } catch (dbError) {

      /*
       * Si PostgreSQL falla, eliminamos el usuario
       * que acabamos de crear en Auth0.
       */
      try {
        await auth0Service.deleteUser(auth0User.user_id);
      } catch (rollbackError) {
        console.error(
          'Error haciendo rollback en Auth0:',
          rollbackError.response?.data || rollbackError.message
        );
      }

      throw dbError;
    }

  } catch (error) {
    console.error(
      'Error creando usuario:',
      error.response?.data || error.message
    );

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'El usuario ya existe en PostgreSQL'
      });
    }

    if (error.response?.data?.message) {
      return res.status(400).json({
        message: error.response.data.message
      });
    }

    res.status(500).json({
      message: 'Error creando usuario'
    });

  } finally {
    client.release();
  }
};


const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const {
      name,
      email,
      user_metadata
    } = req.body;

    const role = user_metadata?.role;

    /*
     * Validar rol si viene en la actualización.
     */
    if (role && !ROLE_IDS[role]) {
      return res.status(400).json({
        message: 'Rol no válido'
      });
    }

    /*
     * Actualizamos Auth0.
     */
    const updatedUser = await auth0Service.updateUser(
      userId,
      {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(user_metadata !== undefined ? { user_metadata } : {})
      }
    );

    /*
     * Actualizamos PostgreSQL.
     */
    const fields = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(name);
    }

    if (email !== undefined) {
      fields.push(`mail = $${index++}`);
      values.push(email);
    }

    if (role) {
      fields.push(`rol_id = $${index++}`);
      values.push(ROLE_IDS[role]);
    }

    fields.push(`updated_at = NOW()`);

    values.push(userId);

    const result = await pool.query(
      `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE auth0_user_id = $${index}
      RETURNING
        identification,
        name,
        mail,
        rol_id,
        auth0_user_id
      `,
      values
    );

    res.json({
      message: 'Usuario actualizado correctamente',
      auth0User: updatedUser,
      user: result.rows[0] || null
    });

  } catch (error) {
    console.error(
      'Error actualizando usuario:',
      error.response?.data || error.message
    );

    res.status(500).json({
      message: 'Error actualizando usuario'
    });
  }
};


const deleteUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.params.id;

    /*
     * Primero buscamos al usuario en PostgreSQL.
     */
    const userResult = await client.query(
      `
      SELECT identification
      FROM users
      WHERE auth0_user_id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      /*
       * Si no existe localmente, eliminamos solamente Auth0.
       */
      await auth0Service.deleteUser(userId);

      return res.json({
        message: 'Usuario eliminado de Auth0'
      });
    }

    const identification = userResult.rows[0].identification;

    /*
     * Verificamos dependencias antes de tocar Auth0.
     */
    const petsResult = await client.query(
      `
      SELECT COUNT(*)::int AS total
      FROM pets
      WHERE user_identification = $1
      `,
      [identification]
    );

    const requestsResult = await client.query(
      `
      SELECT COUNT(*)::int AS total
      FROM solicitudes_adopciones
      WHERE user_identification = $1
      `,
      [identification]
    );

    const pets = petsResult.rows[0].total;
    const requests = requestsResult.rows[0].total;

    if (pets > 0 || requests > 0) {
      return res.status(409).json({
        message: 'No se puede eliminar el usuario porque tiene información relacionada en PostgreSQL',
        details: {
          mascotas: pets,
          solicitudes: requests
        }
      });
    }

    /*
     * Primero Auth0.
     */
    await auth0Service.deleteUser(userId);

    /*
     * Después PostgreSQL.
     */
    await client.query(
      `
      DELETE FROM users
      WHERE auth0_user_id = $1
      `,
      [userId]
    );

    res.json({
      message: 'Usuario eliminado correctamente de Auth0 y PostgreSQL'
    });

  } catch (error) {
    console.error(
      'Error eliminando usuario:',
      error.response?.data || error.message
    );

    res.status(500).json({
      message: 'Error eliminando usuario'
    });

  } finally {
    client.release();
  }
};


module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};