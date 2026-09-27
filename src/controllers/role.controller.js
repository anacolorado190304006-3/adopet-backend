const roleService = require('../services/role.service');

const getRoles = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();

    res.status(200).json(roles);
  } catch (error) {
    console.error('Error obteniendo roles:', error);

    res.status(500).json({
      message: 'Error obteniendo los roles'
    });
  }
};

const getRoleById = async (req, res) => {
  try {
    const role = await roleService.getRoleById(req.params.id);

    if (!role) {
      return res.status(404).json({
        message: 'Rol no encontrado'
      });
    }

    res.status(200).json(role);
  } catch (error) {
    console.error('Error obteniendo el rol:', error);

    res.status(500).json({
      message: 'Error obteniendo el rol'
    });
  }
};

module.exports = {
  getRoles,
  getRoleById
};
