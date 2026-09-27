const express = require('express');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.get('/', userController.getUsers);
router.get('/:identification', userController.getUserByIdentification);

module.exports = router;
