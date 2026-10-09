const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

process.env.DOTENV_CONFIG_PATH = '__auditoria_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'auditoria-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'auditoria-test';

const { sequelize } = require('../src/database/sequelize');
const { AuditoriaBioBioModel } = require('../src/models/AuditoriaBioBio.model');
const { DocumentoAuditoriaModel } = require('../src/models/DocumentoAuditoria.model');
const seeder = require('../seeders/20261009164028-audit_tables_documents');

function origen(RUT, overrides = {}) {
  return {
    RUT, nombres: ' Ana ', pat: ' Perez ', mat: ' Soto ',
    comuna: ' Concepción ', ejecutor: ' ONG ', proyecto: 'Proyecto', ...overrides,
  };
}

function preparar(origenes, existentes = []) {
  const tx = { test: true };
  mock.method(sequelize, 'transaction', async (callback) => callback(tx));
  const lock = mock.method(sequelize, 'query', async (_sql, options) => {
    assert.equal(options.transaction, tx);
    return [];
  });
  const source = mock.method(AuditoriaBioBioModel, 'findAll', async (options) => {
    assert.ok(lock.mock.callCount() > 0);
    assert.equal(options.transaction, tx);
    return origenes;
  });
  const destination = mock.method(DocumentoAuditoriaModel, 'findAll', async (options) => {
    assert.deepEqual(options.where, { idRegion: 8 });
    assert.deepEqual(options.attributes, ['RUT']);
    assert.equal(options.paranoid, false);
    assert.equal(options.transaction, tx);
    return existentes.map((row) => DocumentoAuditoriaModel.build(row));
  });
  const insert = mock.method(DocumentoAuditoriaModel, 'bulkCreate', async (rows, options) => {
    assert.equal(options.transaction, tx);
    assert.equal(options.validate, true);
    existentes.push(...rows);
    return [];
  });
  const log = mock.method(console, 'log', () => {});
  const warn = mock.method(console, 'warn', () => {});
  return { tx, lock, source, destination, insert, log, warn };
}

afterEach(() => mock.restoreAll());

test('diagnostico muestra errores SQL anidados sin volcar consultas o datos', () => {
  const errorSql = new Error('String or binary data would be truncated.');
  const agregado = { errors: [errorSql, errorSql] };
  const error = {
    message: 'Error de insercion', original: agregado, parent: agregado,
    sql: 'INSERT datos privados', parameters: ['privado'],
  };
  agregado.cause = error;
  assert.deepEqual(seeder.mensajesErrorSql(error), [
    'Error de insercion', 'String or binary data would be truncated.',
  ]);
});

test('omite existentes incluso borrados y no altera documentos o estados', async () => {
  const existentes = [{
    RUT: 12345678, dv: '5', nombres: 'Nombre existente',
    certCotizacionesUrl: '/cert.pdf', estadoCert: 'aprobado',
    comentarioLiquidacion: 'Conservar', deleted_at: new Date(),
  }];
  const original = structuredClone(existentes);
  const { insert, log } = preparar([origen('12.345.678-5'), origen('12345678-K')], existentes);
  await seeder.up();
  assert.equal(insert.mock.callCount(), 0);
  assert.deepEqual(existentes, original);
  assert.match(log.mock.calls[0].arguments[0], /0 insertados, 2 existentes omitidos/);
});

test('segunda ejecucion no duplica y nueva actualizacion del origen solo agrega nuevos', async () => {
  const source = [origen('12.345.678-5')];
  const existentes = [];
  preparar(source, existentes);
  await seeder.up();
  await seeder.up();
  source.push(origen('11.033.516-4'));
  await seeder.up();
  assert.deepEqual(existentes.map((row) => row.RUT), [12345678, 11033516]);
  assert.equal(existentes[0].nombres, 'Ana');
  assert.equal(existentes[0].comuna, 'Concepción');
  assert.equal(existentes[0].dv, '5');
  assert.equal(existentes[0].certCotizacionesUrl, '');
});

test('deduplica formatos y acepta k minuscula sin validar checksum', async () => {
  const { insert, log } = preparar([
    origen('12.345.678-k'), origen('12345678K'), origen(' 12 345 678-K '),
  ]);
  await seeder.up();
  assert.equal(insert.mock.calls[0].arguments[0].length, 1);
  assert.equal(insert.mock.calls[0].arguments[0][0].dv, 'K');
  assert.match(log.mock.calls[0].arguments[0], /2 duplicados de origen omitidos/);
});

test('reporta RUT malformados sin insertarlos ni aceptar parseos parciales', async () => {
  const { insert, warn } = preparar(
    ['', null, 'abc', '12ABC34-5', '12345678-X', '0-0', '123456789-0'].map((rut) => origen(rut)),
  );
  await seeder.up();
  assert.equal(insert.mock.callCount(), 0);
  assert.match(warn.mock.calls[0].arguments[0], /7 registros/);
});

test('origen vacio no consulta destino ni inserta', async () => {
  const { destination, insert } = preparar([]);
  await seeder.up();
  assert.equal(destination.mock.callCount(), 0);
  assert.equal(insert.mock.callCount(), 0);
});

test('inserta lotes de hasta 500 y serializa con bloqueo transaccional', async () => {
  const { insert, lock } = preparar(
    Array.from({ length: 501 }, (_, i) => origen(`${10000000 + i}-0`)),
  );
  await seeder.up();
  assert.deepEqual(insert.mock.calls.map((call) => call.arguments[0].length), [500, 1]);
  assert.match(lock.mock.calls[0].arguments[0], /sp_getapplock/);
  assert.match(lock.mock.calls[0].arguments[0], /THROW/);
});

test('fallo al insertar se propaga sin anunciar exito', async () => {
  const { insert, log } = preparar([origen('12345678-5')]);
  insert.mock.mockImplementation(async () => { throw new Error('fallo SQL'); });
  await assert.rejects(seeder.up(), /fallo SQL/);
  assert.equal(log.mock.callCount(), 0);
});

test('down no elimina fichas preexistentes ni importadas', async () => {
  const destroy = mock.method(DocumentoAuditoriaModel, 'destroy', async () => 0);
  await assert.rejects(seeder.down(), /marca de importación/);
  assert.equal(destroy.mock.callCount(), 0);
});

test('fallo al confirmar transaccion no anuncia exito', async () => {
  const { log, tx } = preparar([origen('12345678-5')]);
  mock.method(sequelize, 'transaction', async (callback) => {
    await callback(tx);
    throw new Error('fallo commit');
  });
  await assert.rejects(seeder.up(), /fallo commit/);
  assert.equal(log.mock.callCount(), 0);
});
