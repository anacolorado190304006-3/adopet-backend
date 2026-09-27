const express = require('express');
const checkJwt = require('../middleware/auth.middleware');
const { getMe, syncUser } = require('../controllers/me.controller');

const router = express.Router();

router.get('/', checkJwt, getMe);
router.post('/sync', checkJwt, syncUser);

module.exports = router;