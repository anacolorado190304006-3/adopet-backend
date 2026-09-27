const express = require('express');
const checkJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/pet.controller');

const router = express.Router();

router.get('/', checkJwt, controller.getPets);
router.get('/:id', checkJwt, controller.getPet);
router.post('/', checkJwt, controller.createPet);
router.put('/:id', checkJwt, controller.updatePet);
router.delete('/:id', checkJwt, controller.deletePet);

module.exports = router;