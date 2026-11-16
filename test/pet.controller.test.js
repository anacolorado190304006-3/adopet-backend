const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/pet.service');
const controller = require('../src/controllers/pet.controller');
const { PetValidationError } = require('../src/validators/pet.validator');
const pet = require('./fixtures/pet');

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

afterEach(() => mock.restoreAll());

test('createPet devuelve 201 con la mascota creada', async () => {
  const saved = { id: 1, ...pet };
  mock.method(service, 'createPet', async () => saved);
  const res = response();
  await controller.createPet({ body: pet }, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, saved);
});

test('createPet devuelve 400 con campos, sin registrar los valores recibidos', async () => {
  const error = new PetValidationError([{ field: 'name', message: 'Debe ser un texto no vacío' }]);
  mock.method(service, 'createPet', () => { throw error; });
  const log = mock.method(console, 'error', () => {});
  const res = response();
  await controller.createPet({ body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: error.message, errors: error.errors });
  assert.equal(log.mock.callCount(), 0);
});

for (const [method, serviceMethod, message] of [
  ['getPets', 'getAllPets', 'Error obteniendo mascotas'],
  ['getPet', 'getPetById', 'Error obteniendo mascota'],
  ['createPet', 'createPet', 'Error creando mascota'],
  ['updatePet', 'updatePet', 'Error actualizando mascota'],
  ['deletePet', 'deletePet', 'Error eliminando mascota']
]) {
  test(`${method} conserva 500 genérico ante error inesperado`, async () => {
    mock.method(service, serviceMethod, async () => { throw new Error('Detalle interno simulado'); });
    mock.method(console, 'error', () => {});
    const res = response();
    await controller[method]({ params: { id: '1' }, body: pet }, res);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message });
  });
}

for (const [method, serviceMethod] of [
  ['getPet', 'getPetById'], ['updatePet', 'updatePet'], ['deletePet', 'deletePet']
]) {
  test(`${method} conserva 404 si no existe`, async () => {
    mock.method(service, serviceMethod, async () => undefined);
    const res = response();
    await controller[method]({ params: { id: '1' }, body: pet }, res);
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { message: 'Mascota no encontrada' });
  });
}

for (const [method, serviceMethod] of [
  ['getPets', 'getAllPets'], ['getPet', 'getPetById'], ['updatePet', 'updatePet'], ['deletePet', 'deletePet']
]) {
  test(`${method} conserva respuesta exitosa`, async () => {
    const result = method === 'getPets' ? [pet] : pet;
    mock.method(service, serviceMethod, async () => result);
    const res = response();
    await controller[method]({ params: { id: '1' }, body: pet }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, method === 'deletePet'
      ? { message: 'Mascota eliminada correctamente', pet } : result);
  });
}
