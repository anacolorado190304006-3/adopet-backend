const service = require('../services/pet.service');

const getPets = async (req, res) => {
  try {
    const pets = await service.getAllPets();
    res.json(pets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo mascotas' });
  }
};

const getPet = async (req, res) => {
  try {
    const pet = await service.getPetById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        message: 'Mascota no encontrada'
      });
    }

    res.json(pet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo mascota' });
  }
};

const createPet = async (req, res) => {
  try {
    const pet = await service.createPet(req.body);
    res.status(201).json(pet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creando mascota' });
  }
};

const updatePet = async (req, res) => {
  try {
    const pet = await service.updatePet(req.params.id, req.body);

    if (!pet) {
      return res.status(404).json({
        message: 'Mascota no encontrada'
      });
    }

    res.json(pet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error actualizando mascota' });
  }
};

const deletePet = async (req, res) => {
  try {
    const pet = await service.deletePet(req.params.id);

    if (!pet) {
      return res.status(404).json({
        message: 'Mascota no encontrada'
      });
    }

    res.json({
      message: 'Mascota eliminada correctamente',
      pet
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error eliminando mascota' });
  }
};

module.exports = {
  getPets,
  getPet,
  createPet,
  updatePet,
  deletePet
};