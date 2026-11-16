class PetValidationError extends Error {
  constructor(errors) {
    super('Datos de mascota inválidos');
    this.name = 'PetValidationError';
    this.errors = errors;
  }
}

const isNonEmptyText = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const isValidAge = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0;
  }

  return typeof value === 'string' &&
    /^\d+(?:\.\d+)?$/.test(value.trim()) && Number.isFinite(Number(value));
};

const validatePetForCreation = (pet) => {
  if (!pet || typeof pet !== 'object' || Array.isArray(pet)) {
    throw new PetValidationError([
      { field: 'body', message: 'Debe ser un objeto JSON' }
    ]);
  }

  const errors = [];

  for (const field of ['name', 'specie', 'size', 'pet_state']) {
    if (!isNonEmptyText(pet[field])) {
      errors.push({ field, message: 'Debe ser un texto no vacío' });
    }
  }

  if (!isValidAge(pet.age)) {
    errors.push({ field: 'age', message: 'Debe ser una edad numérica no negativa y finita' });
  }

  if (!isNonEmptyText(pet.user_identification) &&
      !(Number.isSafeInteger(pet.user_identification) && pet.user_identification > 0)) {
    errors.push({ field: 'user_identification', message: 'Debe ser un texto no vacío o un entero positivo seguro' });
  }

  if (pet.description !== undefined && pet.description !== null &&
      typeof pet.description !== 'string') {
    errors.push({ field: 'description', message: 'Debe ser un texto o null' });
  }

  if (errors.length > 0) {
    throw new PetValidationError(errors);
  }
};

module.exports = { PetValidationError, validatePetForCreation };
