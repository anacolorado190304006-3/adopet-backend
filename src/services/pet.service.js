const repository = require('../repositories/pet.repository');

const getAllPets = () => repository.getAll();

const getPetById = (id) => repository.getById(id);

const createPet = (pet) => repository.create(pet);

const updatePet = (id, pet) => repository.update(id, pet);

const deletePet = (id) => repository.remove(id);

module.exports = {
  getAllPets,
  getPetById,
  createPet,
  updatePet,
  deletePet
};
