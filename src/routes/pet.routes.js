const express = require('express');
const requirePersistence = require('../middleware/persistence.middleware');
const checkJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/pet.controller');

const router = express.Router();

router.get('/', checkJwt, requirePersistence, controller.getPets);
router.get('/:id', checkJwt, requirePersistence, controller.getPet);
router.post('/', checkJwt, requirePersistence, controller.createPet);
router.put('/:id', checkJwt, requirePersistence, controller.updatePet);
router.delete('/:id', checkJwt, requirePersistence, controller.deletePet);

module.exports = router;