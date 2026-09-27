const pool = require('../config/database');

const getAll = async () => {
  const result = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.age,
      p.specie,
      p.size,
      p.description,
      p.pet_state,
      p.user_identification,
      p.created_at,
      p.updated_at
    FROM pets p
    ORDER BY p.id DESC
  `);

  return result.rows;
};

const getById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM pets WHERE id = $1`,
    [id]
  );

  return result.rows[0];
};

const create = async (pet) => {
  const result = await pool.query(
    `
    INSERT INTO pets (
      name,
      age,
      specie,
      size,
      description,
      pet_state,
      user_identification
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      pet.name,
      pet.age,
      pet.specie,
      pet.size,
      pet.description,
      pet.pet_state,
      pet.user_identification
    ]
  );

  return result.rows[0];
};

const update = async (id, pet) => {
  const result = await pool.query(
    `
    UPDATE pets
    SET
      name = $1,
      age = $2,
      specie = $3,
      size = $4,
      description = $5,
      pet_state = $6,
      updated_at = NOW()
    WHERE id = $7
    RETURNING *
    `,
    [
      pet.name,
      pet.age,
      pet.specie,
      pet.size,
      pet.description,
      pet.pet_state,
      id
    ]
  );

  return result.rows[0];
};

const remove = async (id) => {
  const result = await pool.query(
    `DELETE FROM pets WHERE id = $1 RETURNING *`,
    [id]
  );

  return result.rows[0];
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};