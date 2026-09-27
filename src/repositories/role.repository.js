const pool = require('../config/database');

const findAll = async () => {
  const result = await pool.query(`
    SELECT id, name, created_at, updated_at
    FROM roles
    ORDER BY id
  `);

  return result.rows;
};

const findById = async (id) => {
  const result = await pool.query(
    `
    SELECT id, name, created_at, updated_at
    FROM roles
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0];
};

module.exports = {
  findAll,
  findById
};
