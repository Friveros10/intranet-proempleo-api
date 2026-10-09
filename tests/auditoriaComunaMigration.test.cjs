const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const migration = require('../migrations/202610090001-documentos-auditoria-comuna-texto');

afterEach(() => mock.restoreAll());

function preparar(columns, invalidos = 0) {
  const transaction = { test: true };
  const operations = [];
  const queryInterface = {
    sequelize: {
      transaction: async (callback) => callback(transaction),
      query: async (sql, options) => {
        assert.equal(options.transaction, transaction);
        operations.push(['query', sql]);
        return [{ invalidos }];
      },
    },
    describeTable: async () => columns,
    addColumn: async (_table, name, definition, options) => {
      assert.equal(options.transaction, transaction);
      operations.push(['add', name, definition]);
    },
    changeColumn: async (_table, name, definition, options) => {
      assert.equal(options.transaction, transaction);
      operations.push(['change', name, definition]);
    },
    removeColumn: async (_table, name, options) => {
      assert.equal(options.transaction, transaction);
      operations.push(['remove', name]);
    },
  };
  return { queryInterface, operations, transaction };
}

test('agrega comuna nullable, copia catalogo, valida y solo entonces elimina idComuna', async () => {
  const { queryInterface, operations } = preparar({ idComuna: {} });
  await migration.up(queryInterface);
  assert.deepEqual(operations.map(([op]) => op), ['add', 'query', 'query', 'change', 'remove']);
  assert.equal(operations[0][2].allowNull, true);
  assert.match(operations[1][1], /JOIN[\s\S]*dbo\.COMUNAS/);
  assert.match(operations[1][1], /HAVING COUNT\(\*\) = 1/);
  assert.match(operations[2][1], /comuna IS NULL/);
  assert.equal(operations[3][2].allowNull, false);
  assert.equal(operations[4][1], 'idComuna');
});

test('registros sin correspondencia bloquean eliminacion y rechazan transaccion', async () => {
  const { queryInterface, operations, transaction } = preparar({ idComuna: {} }, 2);
  let rollback = false;
  queryInterface.sequelize.transaction = async (callback) => {
    try {
      return await callback(transaction);
    } catch (error) {
      rollback = true;
      throw error;
    }
  };
  await assert.rejects(migration.up(queryInterface), /2 fichas/);
  assert.equal(rollback, true);
  assert.equal(operations.some(([op]) => op === 'remove'), false);
});

test('esquema textual existente no vuelve a agregar columna ni consulta catalogo', async () => {
  const { queryInterface, operations } = preparar({ comuna: {} });
  await migration.up(queryInterface);
  assert.deepEqual(operations.map(([op]) => op), ['query', 'change']);
});

test('esquema sin ambas columnas falla antes de modificar datos', async () => {
  const { queryInterface, operations } = preparar({});
  await assert.rejects(migration.up(queryInterface), /no tiene comuna ni idComuna/);
  assert.equal(operations.length, 0);
});

test('down bloquea conversion destructiva del texto', async () => {
  await assert.rejects(migration.down(), /Restaura un respaldo/);
});
