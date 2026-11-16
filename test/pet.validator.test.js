const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validatePetForCreation, PetValidationError } = require('../src/validators/pet.validator');
const pet = require('./fixtures/pet');

const rejectsField = (input, field) => {
  assert.throws(() => validatePetForCreation(input), (error) => {
    assert.ok(error instanceof PetValidationError);
    assert.equal(error.message, 'Datos de mascota inválidos');
    assert.ok(error.errors.some((entry) => entry.field === field));
    assert.ok(error.errors.every((entry) => Object.keys(entry).sort().join() === 'field,message'));
    return true;
  });
};

test('acepta datos válidos sin mutar el objeto ni sus campos adicionales', () => {
  const input = Object.freeze({ ...pet, name: ' Luna ', extra: 'compatible' });
  assert.doesNotThrow(() => validatePetForCreation(input));
  assert.equal(input.name, ' Luna ');
});

for (const body of [undefined, null, [], '', 'texto', 1, true]) {
  test(`rechaza body inválido: ${JSON.stringify(body)}`, () => rejectsField(body, 'body'));
}

for (const field of ['name', 'specie', 'size', 'pet_state']) {
  for (const value of [undefined, null, '', ' \t\n ', 1, true, {}, []]) {
    test(`rechaza ${field}: ${JSON.stringify(value)}`, () => rejectsField({ ...pet, [field]: value }, field));
  }
}

for (const age of [0, 0.5, 2, '0', '0.5', ' 2 ', '002']) {
  test(`acepta edad ${JSON.stringify(age)}`, () => {
    assert.doesNotThrow(() => validatePetForCreation({ ...pet, age }));
  });
}

for (const age of [undefined, null, -1, NaN, Infinity, -Infinity, true, {}, [], '', ' ', '-1', 'abc', '0x10', '1e3', '9'.repeat(400)]) {
  test(`rechaza edad ${String(age).slice(0, 30)}`, () => rejectsField({ ...pet, age }, 'age'));
}

for (const user_identification of [1, Number.MAX_SAFE_INTEGER, '0001', 'ABC-123']) {
  test(`acepta identificación ${user_identification}`, () => {
    assert.doesNotThrow(() => validatePetForCreation({ ...pet, user_identification }));
  });
}

for (const user_identification of [undefined, null, '', ' ', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, true, {}, []]) {
  test(`rechaza identificación ${String(user_identification)}`, () => {
    rejectsField({ ...pet, user_identification }, 'user_identification');
  });
}

for (const description of [undefined, null, '', ' ', 'Texto 🐾']) {
  test(`acepta descripción ${JSON.stringify(description)}`, () => {
    assert.doesNotThrow(() => validatePetForCreation({ ...pet, description }));
  });
}

for (const description of [1, true, {}, []]) {
  test(`rechaza descripción ${JSON.stringify(description)}`, () => rejectsField({ ...pet, description }, 'description'));
}

test('acumula todos los campos obligatorios ausentes', () => {
  assert.throws(() => validatePetForCreation({}), (error) => {
    assert.deepEqual(error.errors.map(({ field }) => field), [
      'name', 'specie', 'size', 'pet_state', 'age', 'user_identification'
    ]);
    return true;
  });
});
