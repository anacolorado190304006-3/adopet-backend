const userService = require('../services/user.service');

const getUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();

    res.status(200).json(users);
  } catch (error) {
    console.error('Error obteniendo los usuarios:', error);

    res.status(500).json({
      message: 'Error obteniendo los usuarios'
    });
  }
};

const getUserByIdentification = async (req, res) => {
  try {
    const user = await userService.getUserByIdentification(
      req.params.identification
    );

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error obteniendo el usuario:', error);

    res.status(500).json({
      message: 'Error obteniendo el usuario'
    });
  }
};

module.exports = {
  getUsers,
  getUserByIdentification
};
