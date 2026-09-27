const express = require('express');

const checkJwt = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');

const controller = require('../controllers/admin-user.controller');

const router = express.Router();

router.use(checkJwt);
router.use(requireRole(['administrador']));

router.get('/', controller.getUsers);
router.patch('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);
router.post('/', controller.createUser);

module.exports = router;