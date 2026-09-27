const pool = require('../config/database');

const findAll = async () => {
  const result = await pool.query(`
    SELECT
      identification,
      name,
      mail,
      rol_id,
      created_at,
      updated_at,
      auth0_user_id
    FROM users
    ORDER BY name
  `);

  return result.rows;
};


const findByIdentification = async (identification) => {
  const result = await pool.query(
    `
    SELECT
      identification,
      name,
      mail,
      rol_id,
      created_at,
      updated_at,
      auth0_user_id
    FROM users
    WHERE identification = $1
    `,
    [identification]
  );

  return result.rows[0];
};

module.exports = {
  findAll,
  findByIdentification
};
