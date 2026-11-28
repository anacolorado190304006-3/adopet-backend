const express = require('express');
const requirePersistence = require('../middleware/persistence.middleware');
const checkJwt = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');

const controller = require('../controllers/organization.controller');

const router = express.Router();

router.use(checkJwt);
router.use(requirePersistence);
router.use(requireRole(['administrador']));

router.get('/', controller.getOrganizations);

router.get(
  '/:identification',
  controller.getOrganization
);

router.post(
  '/',
  controller.createOrganization
);

router.put(
  '/:identification',
  controller.updateOrganization
);

router.delete(
  '/:identification',
  controller.deleteOrganization
);

module.exports = router;