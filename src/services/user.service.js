const userRepository = require('../repositories/user.repository');

const getAllUsers = async () => {
  return await userRepository.findAll();
};

const getUserByIdentification = async (identification) => {
  return await userRepository.findByIdentification(identification);
};

module.exports = {
  getAllUsers,
  getUserByIdentification
};
