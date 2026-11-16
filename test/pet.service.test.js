const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const repository = require('../src/repositories/pet.repository');
const service = require('../src/services/pet.service');
const { PetValidationError } = require('../src/validators/pet.validator');
const pet = require('./fixtures/pet');

afterEach(() => mock.restoreAll());

test('crea una mascota una sola vez con el objeto original', async () => {
  const saved = { id: 1, ...pet };
  const create = mock.method(repository, 'create', async () => saved);
  assert.equal(await service.createPet(pet), saved);
  assert.equal(create.mock.callCount(), 1);
  assert.equal(create.mock.calls[0].arguments[0], pet);
});

test('no persiste una mascota inválida', () => {
  const create = mock.method(repository, 'create', () => assert.fail('No debe persistir'));
  assert.throws(() => service.createPet({ ...pet, age: -1 }), PetValidationError);
  assert.equal(create.mock.callCount(), 0);
});

test('propaga un error de base de datos', async () => {
  const error = new Error('Fallo de persistencia simulado');
  mock.method(repository, 'create', async () => { throw error; });
  await assert.rejects(async () => service.createPet(pet), (actual) => actual === error);
});

for (const [method, repositoryMethod, args] of [
  ['getAllPets', 'getAll', []],
  ['getPetById', 'getById', ['1']],
  ['updatePet', 'update', ['1', pet]],
  ['deletePet', 'remove', ['1']]
]) {
  test(`${method} conserva la delegación existente`, async () => {
    const result = { id: 1, ...pet };
    const delegated = mock.method(repository, repositoryMethod, async () => result);
    assert.equal(await service[method](...args), result);
    assert.deepEqual(delegated.mock.calls[0].arguments, args);
  });
}
