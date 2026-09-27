const express = require('express');
const roleController = require('../controllers/role.controller');

const router = express.Router();

router.get('/', roleController.getRoles);
router.get('/:id', roleController.getRoleById);

module.exports = router;
