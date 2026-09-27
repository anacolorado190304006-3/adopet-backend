const roleRepository = require('../repositories/role.repository');

const getAllRoles = async () => {
  return await roleRepository.findAll();
};

const getRoleById = async (id) => {
  return await roleRepository.findById(id);
};

module.exports = {
  getAllRoles,
  getRoleById
};
