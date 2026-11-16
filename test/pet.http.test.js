const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const repository = require('../src/repositories/pet.repository');
const controller = require('../src/controllers/pet.controller');
const routes = require('../src/routes/pet.routes');
const pet = require('./fixtures/pet');

afterEach(() => mock.restoreAll());

const serve = async (t, app) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  }));
  return `http://127.0.0.1:${server.address().port}/api/pets`;
};

// Harness del controlador: no emite tokens ni sustituye la autenticación de producción.
test('HTTP: Express, controlador y servicio validan antes de persistir', async (t) => {
  const app = express();
  app.use(express.json());
  app.post('/api/pets', controller.createPet);
  const url = await serve(t, app);
  const create = mock.method(repository, 'create', async (input) => ({ id: 1, ...input }));

  const valid = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pet)
  });
  assert.equal(valid.status, 201);
  assert.deepEqual(await valid.json(), { id: 1, ...pet });

  for (const body of [JSON.stringify({ ...pet, age: -1 }), '{}', '[]', undefined]) {
    const invalid = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body
    });
    assert.equal(invalid.status, 400);
    const result = await invalid.json();
    assert.equal(result.message, 'Datos de mascota inválidos');
    assert.ok(result.errors.length > 0);
  }
  assert.equal(create.mock.callCount(), 1);
});

test('HTTP: la ruta real rechaza solicitudes sin JWT antes de persistir', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/pets', routes);
  app.use((error, req, res, next) => res.status(error.status || 500).json({ message: error.message }));
  const url = await serve(t, app);
  const create = mock.method(repository, 'create', () => assert.fail('No debe persistir'));
  const result = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pet)
  });
  assert.equal(result.status, 401);
  assert.equal(create.mock.callCount(), 0);
});
