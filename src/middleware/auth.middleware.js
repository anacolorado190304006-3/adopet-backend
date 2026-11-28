const { auth } = require('express-oauth2-jwt-bearer');
const { loadConfig } = require('../config/runtime');

const checkJwt = auth(loadConfig().auth);

module.exports = checkJwt;
