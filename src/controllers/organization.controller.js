const pool = require('../config/database');

const getOrganizations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.identification,
        u.name,
        u.mail,
        u.auth0_user_id,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.rol_id = 2
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Error obteniendo organizaciones'
    });
  }
};

const getOrganization = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.identification,
        u.name,
        u.mail,
        u.auth0_user_id,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.identification = $1
      AND u.rol_id = 2
      `,
      [req.params.identification]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Organización no encontrada'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Error obteniendo organización'
    });
  }
};

const createOrganization = async (req, res) => {
  try {
    const {
      identification,
      name,
      mail,
      auth0_user_id
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO users (
        identification,
        name,
        mail,
        rol_id,
        auth0_user_id
      )
      VALUES ($1, $2, $3, 2, $4)
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
        auth0_user_id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Error creando organización'
    });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const {
      name,
      mail
    } = req.body;

    const result = await pool.query(
      `
      UPDATE users
      SET
        name = $1,
        mail = $2,
        updated_at = NOW()
      WHERE identification = $3
      AND rol_id = 2
      RETURNING
        identification,
        name,
        mail,
        rol_id,
        auth0_user_id
      `,
      [
        name,
        mail,
        req.params.identification
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Organización no encontrada'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Error actualizando organización'
    });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM users
      WHERE identification = $1
      AND rol_id = 2
      RETURNING identification
      `,
      [req.params.identification]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Organización no encontrada'
      });
    }

    res.json({
      message: 'Organización eliminada correctamente'
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Error eliminando organización'
    });
  }
};

module.exports = {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization
};