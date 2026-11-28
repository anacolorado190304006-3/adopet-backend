const express = require('express');
const requirePersistence = require('../middleware/persistence.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();
router.use(requirePersistence);

router.get('/', userController.getUsers);
router.get('/:identification', userController.getUserByIdentification);

module.exports = router;
