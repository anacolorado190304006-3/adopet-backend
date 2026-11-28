const express = require('express');
const requirePersistence = require('../middleware/persistence.middleware');
const roleController = require('../controllers/role.controller');

const router = express.Router();
router.use(requirePersistence);

router.get('/', roleController.getRoles);
router.get('/:id', roleController.getRoleById);

module.exports = router;
