const express = require('express');
const requirePersistence = require('../middleware/persistence.middleware');
const checkJwt = require('../middleware/auth.middleware');
const { getMe, syncUser } = require('../controllers/me.controller');

const router = express.Router();

router.get('/', checkJwt, requirePersistence, getMe);
router.post('/sync', checkJwt, requirePersistence, syncUser);

module.exports = router;