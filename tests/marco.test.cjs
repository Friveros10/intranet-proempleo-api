const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.DOTENV_CONFIG_PATH = '__marco_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'marco-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'marco-test';

const { sequelize } = require('../src/database/sequelize');
const { MarcoModel } = require('../src/models/Marco.model');
const { MarcoDetalleModel } = require('../src/models/MarcoDetalle.model');
const { marcoRepository: repo } = require('../src/repositories/marco.repository');
const { marcoService: service } = require('../src/services/marco.service');
const { listarMarcosSchema, obtenerMarcoSchema, guardarMarcoSchema } = require('../src/validations/marco.validation');
afterEach(() => mock.restoreAll());

test('modelos mapean exactamente las columnas de las queries, sin timestamps ni id implicito', () => {
  const auditoria = ['usu_cre', 'fec_cre', 'usu_mod', 'fec_mod', 'usu_eli', 'fec_eli'];
  assert.deepEqual(Object.keys(MarcoModel.getAttributes()).sort(), [
    'corr_mar', 'ano_mar', 'subtitulo_mar', 'item_mar', 'linea_mar', 'nombre_mar', 'monto_mar',
    ...auditoria, 'est_mar', 'ema_mar', 'tip_mar',
  ].sort());
  assert.deepEqual(Object.keys(MarcoDetalleModel.getAttributes()).sort(), [
    'glo_detmar', 'ano_mar', 'subtitulo_mar', 'item_mar', 'linea_mar', 'corr_detmar',
    'nom_detmar', 'acc_detmar', 'mon_detmar', ...auditoria, 'corr_mar',
  ].sort());
  assert.equal(MarcoModel.getTableName().tableName, 'MARCO');
  assert.equal(MarcoDetalleModel.getTableName().tableName, 'MARCODET');
  assert.equal(MarcoModel.options.timestamps, false);
  assert.equal(MarcoDetalleModel.options.timestamps, false);
  assert.equal(MarcoModel.primaryKeyAttribute, 'corr_mar');
  assert.equal(MarcoDetalleModel.primaryKeyAttribute, 'corr_detmar');
});

test('relacion marco y glosas usa corr_mar, nunca el año compartido entre leyes', () => {
  const { registrarAsociaciones } = require('../src/database/sicapAssociations');
  registrarAsociaciones();
  assert.equal(MarcoModel.associations.detalles.foreignKey, 'corr_mar');
  assert.equal(MarcoModel.associations.detalles.sourceKey, 'corr_mar');
  assert.equal(MarcoDetalleModel.associations.marco.targetKey, 'corr_mar');
});

test('listado pagina 20 leyes y aplica año, orden estable y pagina acotada', async () => {
  const listado = mock.method(sequelize, 'query', async () => [{
    corr_mar: 1, origen: 'proempleo', total: 21, totalPages: 2, pagina: 2, fila: 21,
  }]);
  const resultado = await repo.listar({ anio: 2026, page: 9 });
  assert.deepEqual(resultado.pagination, { page: 2, limit: 20, total: 21, totalPages: 2 });
  const [sql, query] = listado.mock.calls[0].arguments;
  assert.equal(listado.mock.calls.length, 1);
  assert.match(sql, /UNION ALL/);
  assert.match(sql, /\[dbo\]\.\[MARCO\]/);
  assert.match(sql, /\[dbo\]\.\[marco_proempleo\]/);
  assert.match(sql, /filtrados AS \(SELECT \* FROM unificados WHERE \[est_mar\] = 'ACTIVO' AND \[ano_mar\] = :anio\)/);
  assert.match(sql, /ORDER BY \[ano_mar\] DESC, \[corr_mar\] DESC, \[origen\] ASC/);
  assert.equal(query.replacements.anio, 2026);
  assert.equal(query.replacements.pagina, 9);
  assert.equal(query.replacements.limite, 20);
  assert.deepEqual(resultado.data, [{ corr_mar: 1, origen: 'proempleo' }]);
});

test('busqueda de nombre trata comodines como literales y correlativo usa igualdad', async () => {
  const listado = mock.method(sequelize, 'query', async () => [{ total: 0, totalPages: 1, pagina: 1, fila: null }]);
  await repo.listar({ buscar: '100%_[ley]', page: 1 });
  const query = listado.mock.calls[0].arguments[1];
  assert.equal(query.replacements.buscar, '%100[%][_][[]ley[]]%');
  assert.equal(query.replacements.id, null);
  await repo.listar({ buscar: '123', page: 1 });
  assert.equal(listado.mock.calls[1].arguments[1].replacements.id, 123);
  const resultado = await repo.listar({ page: 99 });
  assert.match(listado.mock.calls[2].arguments[0], /filtrados AS \(SELECT \* FROM unificados WHERE \[est_mar\] = 'ACTIVO'\)/);
  assert.deepEqual(resultado.data, []);
  assert.equal(resultado.pagination.page, 1);
});

test('union conserva leyes de ambos origenes aunque compartan correlativo', async () => {
  mock.method(sequelize, 'query', async () => [
    { corr_mar: 1, origen: 'legacy', nombre_mar: 'Historica', total: 2, totalPages: 1, pagina: 1, fila: 1 },
    { corr_mar: 1, origen: 'proempleo', nombre_mar: 'Nueva', total: 2, totalPages: 1, pagina: 1, fila: 2 },
  ]);
  const resultado = await repo.listar({ page: 1 });
  assert.deepEqual(resultado.data.map(({ corr_mar, origen }) => `${origen}:${corr_mar}`), ['legacy:1', 'proempleo:1']);
  assert.equal(resultado.pagination.total, 2);
});

test('catalogo de años proviene de los datos sin valores nulos', async () => {
  const query = mock.method(sequelize, 'query', async () => [
    { ano_mar: 2026 }, { ano_mar: 2025 },
  ]);
  assert.deepEqual(await repo.anios(), [2026, 2025]);
  assert.match(query.mock.calls[0].arguments[0], /UNION SELECT \[ano_mar\] FROM \[dbo\]\.\[marco_proempleo\]/);
});

test('ficha incluye solo glosas relacionadas por correlativo y conserva montos exactos', async () => {
  const query = mock.method(sequelize, 'query', async (sql) => sql.includes('[dbo].[MARCO]')
    ? [{ corr_mar: 12, origen: 'legacy', ano_mar: 2026, nombre_mar: 'Ley de presupuesto', monto_mar: '9007199254740993' }]
    : [{ corr_detmar: 8, corr_mar: 12, glo_detmar: 1, mon_detmar: '123' }]);
  const ficha = await service.obtener(12);
  assert.equal(ficha.corr_mar, 12);
  assert.equal(ficha.monto_mar, '9007199254740993');
  assert.equal(ficha.detalles.length, 1);
  assert.equal(query.mock.calls[1].arguments[1].replacements.corr_mar, 12);
  assert.match(query.mock.calls[1].arguments[0], /\[dbo\]\.\[MARCODET\]/);
  assert.match(query.mock.calls[0].arguments[0], /CONVERT\(VARCHAR\(50\), \[monto_mar\]\)/);
  await service.obtener(12, 'proempleo');
  assert.match(query.mock.calls[2].arguments[0], /\[dbo\]\.\[marco_proempleo\]/);
  assert.match(query.mock.calls[3].arguments[0], /\[dbo\]\.\[marcodet_proempleo\]/);
});

test('ley inexistente retorna 404 y ley sin glosas conserva ficha vacia', async () => {
  const obtener = mock.method(repo, 'obtener', async () => null);
  const detalles = mock.method(repo, 'detalles', async () => []);
  await assert.rejects(service.obtener(1), (err) => err.statusCode === 404);
  assert.equal(detalles.mock.calls.length, 0);
  obtener.mock.mockImplementation(async () => ({ corr_mar: 1 }));
  assert.deepEqual((await service.obtener(1)).detalles, []);
});

test('parametros invalidos son rechazados sin consultas ni defaults silenciosos', () => {
  for (const query of [{ page: '0' }, { page: '-1' }, { anio: 'abc' }, { anio: '0' }, { buscar: 'a'.repeat(151) }]) {
    assert.equal(listarMarcosSchema.safeParse({ query }).success, false);
  }
  assert.equal(listarMarcosSchema.parse({ query: {} }).query.page, 1);
  for (const id of ['abc', '0', '-5', '1.2', '2147483648']) {
    assert.equal(obtenerMarcoSchema.safeParse({ params: { id }, query: {} }).success, false);
  }
});

test('API autoriza ADMIN/MINISTERIO; escrituras solo en ProEmpleo, legacy solo lectura', async () => {
  const express = require('express');
  const auth = require('../src/middlewares/auth.middleware');
  mock.method(auth, 'requireAuth', (req, _res, next) => {
    if (!req.headers['x-test-role']) return next(Object.assign(new Error('No autenticado'), { statusCode: 401 }));
    req.user = { sub: '1', roles: [req.headers['x-test-role']] };
    next();
  });
  mock.method(service, 'listar', async () => ({ data: [], pagination: { total: 0 } }));
  mock.method(service, 'anios', async () => [2026]);
  const obtener = mock.method(service, 'obtener', async (id, origen) => ({ corr_mar: id, origen, detalles: [] }));
  const crear = mock.method(service, 'crear', async () => ({ corr_mar: 100, origen: 'proempleo', detalles: [] }));
  const actualizar = mock.method(service, 'actualizar', async (id) => ({ corr_mar: id, origen: 'proempleo', detalles: [] }));
  const routes = require('../src/routes/marco.routes').default;
  const app = express();
  app.use(express.json());
  app.use('/marcos', routes);
  app.use((err, _req, res, _next) => res.status(err.statusCode ?? 400).json({ message: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/marcos`;
  try {
    assert.equal((await fetch(url)).status, 401);
    for (const role of ['INTENDENCIA', 'OTRO']) {
      assert.equal((await fetch(url, { headers: { 'x-test-role': role } })).status, 403);
      assert.equal((await fetch(url, { method: 'POST', headers: { 'x-test-role': role, 'Content-Type': 'application/json' }, body: JSON.stringify(entrada()) })).status, 403);
    }
    for (const role of ['ADMIN', 'MINISTERIO']) {
      const headers = { 'x-test-role': role };
      for (const path of ['', '/anios', '/12']) {
        assert.equal((await fetch(url + path, { headers })).status, 200);
      }
      assert.equal((await (await fetch(url + '/12?origen=proempleo', { headers })).json()).origen, 'proempleo');
      assert.equal((await fetch(url + '/12?origen=invalido', { headers })).status, 400);
      assert.equal((await fetch(url + '/0', { headers })).status, 400);
      assert.equal((await fetch(url + '?page=0', { headers })).status, 400);
      const escritura = { ...headers, 'Content-Type': 'application/json' };
      assert.equal((await fetch(url, { method: 'POST', headers: escritura, body: JSON.stringify(entrada()) })).status, 201);
      assert.equal((await fetch(url + '/proempleo/100', { method: 'PUT', headers: escritura, body: JSON.stringify(entrada()) })).status, 200);
      assert.equal((await fetch(url + '/100', { method: 'PUT', headers: escritura, body: JSON.stringify(entrada()) })).status, 404);
      assert.equal((await fetch(url, { method: 'POST', headers: escritura, body: JSON.stringify({ ...entrada(), monto_mar: '1.5' }) })).status, 400);
      for (const method of ['PUT', 'PATCH', 'DELETE']) {
        assert.equal((await fetch(url, { method, headers })).status, 404);
      }
    }
    assert.equal(crear.mock.calls.length, 2);
    assert.equal(actualizar.mock.calls.length, 2);
    assert.deepEqual(obtener.mock.calls.map((call) => call.arguments), [[12, 'legacy'], [12, 'proempleo'], [12, 'legacy'], [12, 'proempleo']]);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

function entrada() {
  return {
    ano_mar: 2026, subtitulo_mar: 24, item_mar: 1, linea_mar: 1, nombre_mar: 'Ley nueva',
    monto_mar: '9007199254740993', est_mar: null, ema_mar: null, tip_mar: null,
    detalles: [{ glo_detmar: 1, nom_detmar: 'EJECUCION', acc_detmar: 'Resta', mon_detmar: '9007199254740993' }],
  };
}

test('validacion exacta de numeric(18,0), campos legacy enteros, duplicados y auditoria protegida', () => {
  assert.equal(guardarMarcoSchema.safeParse({ body: entrada() }).success, true);
  for (const monto_mar of ['1.2', '-1', '1e5', '9999999999999999999', '']) {
    assert.equal(guardarMarcoSchema.safeParse({ body: { ...entrada(), monto_mar } }).success, false);
  }
  for (const body of [
    { ...entrada(), usu_cre: 'otro' }, { ...entrada(), corr_mar: 15 },
    { ...entrada(), item_mar: 1.5 }, { ...entrada(), detalles: [] },
    { ...entrada(), detalles: [entrada().detalles[0], entrada().detalles[0]] },
  ]) assert.equal(guardarMarcoSchema.safeParse({ body }).success, false);
});

test('creacion atomica usa solo tablas ProEmpleo y genera IDs sin tocar MARCO/MARCODET', async () => {
  const tx = { test: true };
  mock.method(sequelize, 'transaction', async (callback) => callback(tx));
  const query = mock.method(sequelize, 'query', async (sql) =>
    sql.includes('OUTPUT INSERTED') ? [{ corr_mar: 42 }] : []);
  mock.method(repo, 'obtener', async () => ({ corr_mar: 42, origen: 'proempleo' }));
  mock.method(repo, 'detalles', async () => []);
  assert.equal((await service.crear({
    ...entrada(), est_mar: 'inactivo', tip_mar: 'otro', ema_mar: 'otro@example.com',
  }, '123')).corr_mar, 42);
  assert.equal(query.mock.calls.length, 2);
  for (const call of query.mock.calls) {
    assert.equal(call.arguments[1].transaction, tx);
    assert.doesNotMatch(call.arguments[0], /\[dbo\]\.\[(MARCO|MARCODET)\]/);
    assert.match(call.arguments[0], /GETDATE\(\)/);
  }
  assert.equal(query.mock.calls[0].arguments[1].replacements.monto_mar, '9007199254740993');
  assert.equal(query.mock.calls[0].arguments[1].replacements.est_mar, 'ACTIVO');
  assert.equal(query.mock.calls[0].arguments[1].replacements.tip_mar, null);
  assert.equal(query.mock.calls[0].arguments[1].replacements.ema_mar, null);
  assert.equal(query.mock.calls[1].arguments[1].replacements.corr_mar, 42);
  await assert.rejects(service.crear({ ...entrada(), detalles: [{ ...entrada().detalles[0], corr_detmar: 7 }] }, '123'), /identificador/);
});

test('edicion valida pertenencia, preserva IDs y auditoria, agrega y quita detalles en una transaccion', async () => {
  const tx = { test: true };
  mock.method(sequelize, 'transaction', async (callback) => callback(tx));
  const obtener = mock.method(repo, 'obtener', async () => ({ corr_mar: 42, origen: 'proempleo' }));
  mock.method(repo, 'detalles', async () => [{ corr_detmar: 7 }, { corr_detmar: 8 }]);
  const update = mock.method(repo, 'actualizar', async () => {});
  const remove = mock.method(repo, 'eliminarDetalles', async () => {});
  const detail = mock.method(repo, 'guardarDetalle', async () => {});
  const data = { ...entrada(), detalles: [
    { ...entrada().detalles[0], corr_detmar: 7 },
    { ...entrada().detalles[0], glo_detmar: 2 },
  ] };
  await service.actualizar(42, data, '123');
  assert.deepEqual(obtener.mock.calls[0].arguments, [42, 'proempleo', tx]);
  assert.deepEqual(remove.mock.calls[0].arguments, [42, [8], tx]);
  assert.equal(detail.mock.calls[0].arguments[2].corr_detmar, 7);
  assert.equal(detail.mock.calls[1].arguments[2].corr_detmar, undefined);
  assert.equal(update.mock.calls[0].arguments[3], tx);
  await assert.rejects(service.actualizar(42, {
    ...entrada(), detalles: [{ ...entrada().detalles[0], corr_detmar: 999 }],
  }, '123'), /no pertenece/);
  assert.equal(update.mock.calls.length, 1);
  obtener.mock.mockImplementation(async () => null);
  await assert.rejects(service.actualizar(42, entrada(), '123'), (err) => err.statusCode === 404);
});

test('fallo al guardar detalles propaga el error para rollback de cabecera y todos los detalles', async () => {
  let rollback = false;
  mock.method(sequelize, 'transaction', async (callback) => {
    try { return await callback({}); } catch (err) { rollback = true; throw err; }
  });
  mock.method(repo, 'crear', async () => 42);
  mock.method(repo, 'guardarDetalle', async () => { throw new Error('Fallo detalle'); });
  await assert.rejects(service.crear(entrada(), '123'), /Fallo detalle/);
  assert.equal(rollback, true);
});

test('respuesta de guardado se lee antes de commit; un fallo de lectura tambien revierte', async () => {
  let rollback = false;
  const tx = {};
  mock.method(sequelize, 'transaction', async (callback) => {
    try { return await callback(tx); } catch (err) { rollback = true; throw err; }
  });
  mock.method(repo, 'crear', async () => 42);
  mock.method(repo, 'guardarDetalle', async () => {});
  const obtener = mock.method(repo, 'obtener', async () => { throw new Error('Fallo lectura'); });
  await assert.rejects(service.crear(entrada(), '123'), /Fallo lectura/);
  assert.equal(rollback, true);
  assert.deepEqual(obtener.mock.calls[0].arguments, [42, 'proempleo', tx]);
});

test('migracion crea solo tablas nuevas con columnas exactas e identity, sin FK ni indices adicionales', async () => {
  const migration = require('../migrations/202610260001-create-marcos-proempleo');
  const { MarcoProempleoModel } = require('../src/models/MarcoProempleo.model');
  const { MarcoDetalleProempleoModel } = require('../src/models/MarcoDetalleProempleo.model');
  const calls = [];
  const qi = {
    sequelize: { transaction: async (callback) => callback({ test: true }) },
    createTable: async (table, fields) => calls.push({ table, fields }),
  };
  await migration.up(qi);
  assert.deepEqual(calls.map((call) => call.table.tableName), ['marco_proempleo', 'marcodet_proempleo']);
  for (const [index, model] of [MarcoProempleoModel, MarcoDetalleProempleoModel].entries()) {
    assert.deepEqual(Object.keys(calls[index].fields).sort(), Object.keys(model.getAttributes()).sort());
    assert.equal(model.options.timestamps, false);
    assert.deepEqual(model.options.indexes, []);
    const pk = index === 0 ? 'corr_mar' : 'corr_detmar';
    assert.equal(calls[index].fields[pk].primaryKey, true);
    assert.equal(calls[index].fields[pk].autoIncrement, true);
    for (const field of Object.values(calls[index].fields)) assert.equal(field.references, undefined);
  }
  assert.equal(calls[0].fields.monto_mar.type, 'NUMERIC(18,0)');
  assert.equal(calls[0].fields.usu_cre.type, 'VARCHAR(15)');
  assert.equal(calls[1].fields.usu_cre.type, 'VARCHAR(50)');
});
