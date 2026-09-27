const { auth } = require('express-oauth2-jwt-bearer');

const checkJwt = auth({
  audience: 'https://api.adopet.com',
  issuerBaseURL: 'https://dev-8hr3d7mi5f0134xd.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

module.exports = checkJwt;
