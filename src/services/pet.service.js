const repository = require('../repositories/pet.repository');
const { validatePetForCreation } = require('../validators/pet.validator');

const getAllPets = () => repository.getAll();

const getPetById = (id) => repository.getById(id);

const createPet = (pet) => {
  validatePetForCreation(pet);
  return repository.create(pet);
};

const updatePet = (id, pet) => repository.update(id, pet);

const deletePet = (id) => repository.remove(id);

module.exports = {
  getAllPets,
  getPetById,
  createPet,
  updatePet,
  deletePet
};
