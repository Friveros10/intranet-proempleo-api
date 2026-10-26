const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.DOTENV_CONFIG_PATH = '__decretos_hacienda_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'hacienda-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'hacienda-test';

const { sequelize } = require('../src/database/sequelize');
const { DecretosHaciendaModel: Decreto } = require('../src/models/DecretosHacienda.model');
const { DecretosHaciendaDetalleModel: Detalle } = require('../src/models/DecretosHaciendaDetalle.model');
const { DecretosHaciendaProempleoModel: Nuevo } = require('../src/models/DecretosHaciendaProempleo.model');
const { DecretosHaciendaDetalleProempleoModel: NuevoDetalle } = require('../src/models/DecretosHaciendaDetalleProempleo.model');
const { decretosHaciendaRepository: repo } = require('../src/repositories/decretosHacienda.repository');
const { decretosHaciendaService: service } = require('../src/services/decretosHacienda.service');
const {
  listarDecretosHaciendaSchema: listarSchema, obtenerDecretoHaciendaSchema: obtenerSchema,
  guardarDecretoHaciendaSchema: guardarSchema,
} = require('../src/validations/decretosHacienda.validation');

afterEach(() => mock.restoreAll());

function entrada() {
  return {
    fol_dechac: 'A10DH0025', fec_dechac: '2026-06-30', mon_dechac: '999999999999999999', obs_dechac: null,
    detalles: [{ corr_mar: 12, origen_mar: 'proempleo', glosa_dethac: 'EJECUCION', acc_dethac: 'Resta', mon_dethac: '9007199254740993' }],
  };
}

test('modelos legacy conservan columnas, claves y asociaciones sin constraints', () => {
  assert.deepEqual(Object.keys(Decreto.getAttributes()).sort(), [
    'fol_dechac', 'fec_dechac', 'mon_dechac', 'obs_dechac', 'est_dechac',
    'usu_cre', 'fec_cre', 'usu_mod', 'fec_mod', 'usu_eli', 'fec_eli',
  ].sort());
  assert.deepEqual(Object.keys(Detalle.getAttributes()).sort(), [
    'fol_dechac', 'corr_dethac', 'corr_mar', 'corr_detmar', 'acc_dethac', 'mon_dethac',
  ].sort());
  assert.equal(Decreto.getTableName().tableName, 'DECHACIENDA');
  assert.equal(Detalle.getTableName().tableName, 'DETDECHACIENDA');
  assert.equal(Decreto.options.timestamps, false);
  assert.equal(Detalle.options.timestamps, false);
  assert.equal(Decreto.primaryKeyAttribute, 'fol_dechac');
  assert.deepEqual(Detalle.primaryKeyAttributes, ['fol_dechac', 'corr_dethac']);
  require('../src/database/sicapAssociations').registrarAsociaciones();
  assert.equal(Decreto.associations.detalles.foreignKey, 'fol_dechac');
  assert.equal(Detalle.associations.decreto.targetKey, 'fol_dechac');
  assert.equal(Decreto.associations.detalles.options.constraints, false);
});

test('migracion y modelos nuevos conservan tipos, identity, PK acordadas y glosas sin IDs ficticios', async () => {
  const migration = require('../migrations/202610260002-create-decretos-hacienda-proempleo');
  const tables = [];
  await migration.up({
    sequelize: { transaction: async (callback) => callback({}) },
    createTable: async (table, fields) => tables.push({ table, fields }),
  });
  assert.deepEqual(tables.map(({ table }) => table.tableName), ['dechacienda_proempleo', 'detdechacienda_proempleo']);
  for (const [i, model] of [Nuevo, NuevoDetalle].entries()) {
    assert.deepEqual(Object.keys(tables[i].fields).sort(), Object.keys(model.getAttributes()).sort());
    assert.equal(model.options.timestamps, false);
    assert.deepEqual(model.options.indexes, []);
    for (const field of Object.values(tables[i].fields)) assert.equal(field.references, undefined);
  }
  assert.equal(tables[0].fields.fol_dechac.type, 'VARCHAR(50)');
  assert.equal(tables[0].fields.mon_dechac.type, 'NUMERIC(18,0)');
  assert.equal(tables[0].fields.fec_dechac.type, 'DATETIME');
  assert.equal(tables[0].fields.fol_dechac.primaryKey, true);
  assert.equal(tables[1].fields.corr_dethac.primaryKey, true);
  assert.equal(tables[1].fields.corr_dethac.autoIncrement, true);
  assert.equal(tables[1].fields.fol_dechac.primaryKey, true);
  assert.equal(tables[1].fields.corr_detmar.allowNull, true);
  assert.equal(tables[1].fields.origen_mar.allowNull, false);
  assert.equal(tables[1].fields.glosa_dethac.allowNull, false);
});

test('listado usa una sentencia UNION ALL, filtros compartidos, fechas nativas y pagina acotada', async () => {
  const query = mock.method(sequelize, 'query', async () => [{
    fol_dechac: 'A10DH0025', origen: 'legacy', total: 41, totalPages: 3, pagina: 3, fila: 41,
  }]);
  const resultado = await repo.listar({ anio: 2026, folio: 'A10DH', page: 99 });
  assert.deepEqual(resultado.pagination, { page: 3, limit: 20, total: 41, totalPages: 3 });
  assert.equal(query.mock.calls.length, 1);
  const [sql, options] = query.mock.calls[0].arguments;
  assert.match(sql, /FROM \[dbo\]\.\[DECHACIENDA\]\s+UNION ALL SELECT/);
  assert.match(sql, /FROM \[dbo\]\.\[dechacienda_proempleo\]/);
  assert.match(sql, /fec_dechac >= DATEFROMPARTS\(:anio, 1, 1\)/);
  assert.match(sql, /fec_dechac < DATEFROMPARTS\(:siguiente, 1, 1\)/);
  assert.match(sql, /AND fol_dechac LIKE :folio/);
  assert.match(sql, /ORDER BY fec_dechac DESC, fol_dechac DESC, origen ASC/);
  assert.match(sql, /CONVERT\(VARCHAR\(50\), \[mon_dechac\]\)/);
  assert.equal(options.replacements.anio, 2026);
  assert.equal(options.replacements.siguiente, 2027);
  assert.equal(options.replacements.folio, '%A10DH%');
  assert.equal(options.replacements.pagina, 99);
  assert.deepEqual(resultado.data, [{ fol_dechac: 'A10DH0025', origen: 'legacy' }]);
});

test('busqueda literal, pagina vacia y folios coincidentes mantienen origen', async () => {
  const query = mock.method(sequelize, 'query', async () => [{ total: 0, totalPages: 1, pagina: 1, fila: null }]);
  assert.deepEqual((await repo.listar({ folio: 'A%_[10]', page: 8 })).data, []);
  assert.equal(query.mock.calls[0].arguments[1].replacements.folio, '%A[%][_][[]10[]]%');
  query.mock.mockImplementation(async () => [
    { fol_dechac: 'A10', origen: 'legacy', total: 2, totalPages: 1, pagina: 1, fila: 1 },
    { fol_dechac: 'A10', origen: 'proempleo', total: 2, totalPages: 1, pagina: 1, fila: 2 },
  ]);
  assert.deepEqual((await repo.listar({ page: 1 })).data.map((row) => row.origen), ['legacy', 'proempleo']);
});

test('catalogo de anios une ambas tablas; programas une activos del anio actual sin paginacion', async () => {
  const query = mock.method(sequelize, 'query', async () => [{ anio: 2026 }, { anio: 2025 }]);
  assert.deepEqual(await repo.anios(), [2026, 2025]);
  assert.match(query.mock.calls[0].arguments[0], /UNION SELECT YEAR\(fec_dechac\)/);
  query.mock.mockImplementation(async () => Array.from({ length: 25 }, (_, i) => ({ corr_mar: i + 1 })));
  assert.equal((await service.programas()).data.length, 25);
  const [sql, options] = query.mock.calls[1].arguments;
  assert.match(sql, /FROM \[dbo\]\.\[MARCO\]/);
  assert.match(sql, /FROM \[dbo\]\.\[marco_proempleo\]/);
  assert.match(sql, /WHERE ano_mar = :anio AND est_mar = 'ACTIVO'/);
  assert.doesNotMatch(sql, /OFFSET|FETCH|TOP /);
  assert.equal(options.replacements.anio, new Date().getFullYear());
});

test('ficha legacy une solo MARCO/MARCODET legacy y conserva acciones y montos originales', async () => {
  const query = mock.method(sequelize, 'query', async (sql) => sql.includes('WHERE fol_dechac = :folio')
    ? [{ fol_dechac: 'A10', origen: 'legacy', mon_dechac: '9007199254740993' }]
    : [{
      fol_dechac: 'A10', corr_dethac: 1, corr_mar: 12, corr_detmar: 8, origen_mar: 'legacy',
      acc_dethac: 'R', mon_dethac: '999999999999999999', glosa_dethac: null,
      programa_nombre: 'Programa historico', programa_anio: 2020, glosa_nombre: 'Glosa historica', glosa_codigo: 1,
    }]);
  const ficha = await service.obtener('A10');
  assert.equal(ficha.mon_dechac, '9007199254740993');
  assert.equal(ficha.detalles[0].programa.ano_mar, 2020);
  assert.equal(ficha.detalles[0].glosa.nom_detmar, 'Glosa historica');
  assert.equal(ficha.detalles[0].acc_dethac, 'R');
  const sql = query.mock.calls[1].arguments[0];
  assert.match(sql, /FROM \[dbo\]\.\[DETDECHACIENDA\] d/);
  assert.match(sql, /p.origen = 'legacy'/);
  assert.match(sql, /g.corr_mar = d.corr_mar AND g.corr_detmar = d.corr_detmar/);
});

test('detalle ProEmpleo resuelve programa por ID y origen, guarda etiquetas no referencias inventadas', async () => {
  const query = mock.method(sequelize, 'query', async () => [{
    corr_dethac: 3, corr_mar: 12, corr_detmar: null, origen_mar: 'proempleo', glosa_dethac: 'EJECUCION',
    programa_nombre: 'Programa nuevo', programa_anio: 2026, glosa_nombre: null, glosa_codigo: null,
  }]);
  const detalles = await repo.detalles('A10', 'proempleo');
  assert.equal(detalles[0].programa.origen, 'proempleo');
  assert.equal(detalles[0].glosa, null);
  assert.equal(detalles[0].glosa_dethac, 'EJECUCION');
  assert.match(query.mock.calls[0].arguments[0], /p.origen = d.origen_mar/);
  assert.match(query.mock.calls[0].arguments[0], /FROM \[dbo\]\.\[detdechacienda_proempleo\] d/);
  query.mock.mockImplementation(async () => [{
    corr_mar: 999, programa_nombre: null, programa_anio: null, glosa_nombre: null, glosa_codigo: null,
  }]);
  assert.equal((await repo.detalles('A10'))[0].programa, null);
});

test('ficha inexistente devuelve 404; una cabecera sin detalles conserva lista vacia', async () => {
  const obtener = mock.method(repo, 'obtener', async () => null);
  const detalles = mock.method(repo, 'detalles', async () => []);
  await assert.rejects(service.obtener('NO-EXISTE'), (err) => err.statusCode === 404);
  assert.equal(detalles.mock.calls.length, 0);
  obtener.mock.mockImplementation(async () => ({ fol_dechac: 'A10' }));
  assert.deepEqual((await service.obtener('A10')).detalles, []);
});

test('validacion respeta calendario, numeric(18,0), longitudes y opciones, rechaza auditoria/IDs ficticios', () => {
  assert.equal(guardarSchema.safeParse({ body: entrada() }).success, true);
  assert.equal(guardarSchema.safeParse({ body: { ...entrada(), fec_dechac: '2024-02-29' } }).success, true);
  for (const data of [
    { fec_dechac: '2026-02-29' }, { fec_dechac: '2026-06-31' }, { fec_dechac: '2026-06-30T00:00:00Z' },
    { fec_dechac: '1752-01-01' }, { fol_dechac: 'a'.repeat(51) }, { fol_dechac: '../folio' },
    { mon_dechac: '1.5' }, { mon_dechac: '1e5' }, { mon_dechac: '1'.repeat(19) }, { mon_dechac: '-1' },
    { obs_dechac: 'a'.repeat(201) }, { usu_cre: 'otro' }, { detalles: [] },
    { detalles: [{ ...entrada().detalles[0], corr_detmar: 1 }] },
    { detalles: [{ ...entrada().detalles[0], origen_mar: 'otro' }] },
    { detalles: [{ ...entrada().detalles[0], glosa_dethac: 'otra' }] },
    { detalles: [{ ...entrada().detalles[0], acc_dethac: 'otra' }] },
    { detalles: [1, 2].map(() => ({ ...entrada().detalles[0], corr_dethac: 1 })) },
  ]) assert.equal(guardarSchema.safeParse({ body: { ...entrada(), ...data } }).success, false, JSON.stringify(data));
  for (const query of [{ anio: 'abc' }, { anio: 9999 }, { page: 0 }, { folio: 'a'.repeat(151) }]) {
    assert.equal(listarSchema.safeParse({ query }).success, false);
  }
  assert.equal(obtenerSchema.parse({ params: { folio: 'A10' } }).query.origen, 'legacy');
  assert.equal(obtenerSchema.safeParse({ params: { folio: '' } }).success, false);
});

test('crear valida programas activos de ambos origenes y solo escribe en tablas nuevas en una transaccion', async () => {
  const tx = {};
  mock.method(sequelize, 'transaction', async (callback) => callback(tx));
  mock.method(repo, 'obtener', async () => null);
  const programa = mock.method(repo, 'programaDisponible', async () => true);
  const query = mock.method(sequelize, 'query', async () => []);
  const ficha = mock.method(service, 'obtener', async () => ({ fol_dechac: 'A10DH0025', origen: 'proempleo' }));
  const data = { ...entrada(), detalles: [entrada().detalles[0], { ...entrada().detalles[0], origen_mar: 'legacy' }] };
  await service.crear(data, '123');
  assert.equal(programa.mock.calls.length, 2);
  assert.deepEqual(programa.mock.calls.map((call) => call.arguments.slice(0, 2)), [[12, 'proempleo'], [12, 'legacy']]);
  assert.equal(query.mock.calls.length, 3);
  for (const call of query.mock.calls) {
    assert.equal(call.arguments[1].transaction, tx);
    assert.doesNotMatch(call.arguments[0], /(?:INSERT INTO|UPDATE|DELETE FROM) \[dbo\]\.\[(DECHACIENDA|DETDECHACIENDA|MARCO|MARCODET)\]/);
  }
  assert.match(query.mock.calls[0].arguments[0], /'ACTIVO'.*GETDATE\(\)/s);
  assert.match(query.mock.calls[0].arguments[0], /DATEFROMPARTS\(:anioFecha, :mesFecha, :diaFecha\)/);
  assert.equal(query.mock.calls[0].arguments[1].replacements.anioFecha, 2026);
  assert.equal(query.mock.calls[0].arguments[1].replacements.mesFecha, 6);
  assert.equal(query.mock.calls[0].arguments[1].replacements.diaFecha, 30);
  assert.equal(query.mock.calls[0].arguments[1].replacements.mon_dechac, '999999999999999999');
  assert.match(query.mock.calls[1].arguments[0], /VALUES \(:folio, :corr_mar, NULL,/);
  assert.deepEqual(ficha.mock.calls[0].arguments, ['A10DH0025', 'proempleo', tx]);
});

test('crear rechaza folio duplicado, ID preasignado o programa no disponible antes de escribir', async () => {
  mock.method(sequelize, 'transaction', async (callback) => callback({}));
  const obtener = mock.method(repo, 'obtener', async () => ({}));
  const crear = mock.method(repo, 'crear', async () => {});
  const programa = mock.method(repo, 'programaDisponible', async () => false);
  await assert.rejects(service.crear(entrada(), '1'), (err) => err.statusCode === 409);
  assert.throws(() => service.crear({ ...entrada(), detalles: [{ ...entrada().detalles[0], corr_dethac: 1 }] }, '1'), /identificadores/);
  obtener.mock.mockImplementation(async () => null);
  await assert.rejects(service.crear(entrada(), '1'), /no está activo/);
  assert.equal(crear.mock.calls.length, 0);
  assert.equal(programa.mock.calls.length, 1);
});

test('editar preserva IDs y programas historicos sin cambios; agrega, modifica y elimina detalles propios', async () => {
  const tx = {};
  mock.method(sequelize, 'transaction', async (callback) => callback(tx));
  mock.method(repo, 'obtener', async () => ({ fol_dechac: 'A10DH0025' }));
  mock.method(repo, 'detalles', async () => [
    { corr_dethac: 7, corr_mar: 12, origen_mar: 'proempleo' }, { corr_dethac: 8, corr_mar: 13, origen_mar: 'legacy' },
  ]);
  const programa = mock.method(repo, 'programaDisponible', async () => true);
  const update = mock.method(repo, 'actualizar', async () => {});
  const remove = mock.method(repo, 'eliminarDetalles', async () => {});
  const detail = mock.method(repo, 'guardarDetalle', async () => {});
  mock.method(service, 'obtener', async () => ({}));
  const data = { ...entrada(), detalles: [
    { ...entrada().detalles[0], corr_dethac: 7 },
    { ...entrada().detalles[0], corr_mar: 13, origen_mar: 'legacy' },
  ] };
  await service.actualizar(data.fol_dechac, data, '2');
  assert.equal(programa.mock.calls.length, 1);
  assert.deepEqual(programa.mock.calls[0].arguments, [13, 'legacy', new Date().getFullYear(), tx]);
  assert.deepEqual(remove.mock.calls[0].arguments, [data.fol_dechac, [8], tx]);
  assert.equal(detail.mock.calls[0].arguments[1].corr_dethac, 7);
  assert.equal(detail.mock.calls[1].arguments[1].corr_dethac, undefined);
  assert.equal(update.mock.calls[0].arguments[3], tx);
  await assert.rejects(service.actualizar(data.fol_dechac, {
    ...entrada(), detalles: [{ ...entrada().detalles[0], corr_dethac: 999 }],
  }, '2'), /no pertenece/);
  assert.equal(update.mock.calls.length, 1);
  assert.throws(() => service.actualizar('otro', data, '2'), /no se puede cambiar/);
});

test('editar no puede usar una cabecera legacy; cambiar origen exige programa activo', async () => {
  mock.method(sequelize, 'transaction', async (callback) => callback({}));
  const obtener = mock.method(repo, 'obtener', async () => null);
  await assert.rejects(service.actualizar(entrada().fol_dechac, entrada(), '1'), (err) => err.statusCode === 404);
  assert.equal(obtener.mock.calls[0].arguments[1], 'proempleo');
  obtener.mock.mockImplementation(async () => ({}));
  mock.method(repo, 'detalles', async () => [{ corr_dethac: 1, corr_mar: 12, origen_mar: 'legacy' }]);
  mock.method(repo, 'programaDisponible', async () => false);
  await assert.rejects(service.actualizar(entrada().fol_dechac, {
    ...entrada(), detalles: [{ ...entrada().detalles[0], corr_dethac: 1 }],
  }, '1'), /no está activo/);
});

test('fallos de detalle o de respuesta propagan error y revierten toda la transaccion', async () => {
  let rollbacks = 0;
  mock.method(sequelize, 'transaction', async (callback) => {
    try { return await callback({}); } catch (err) { rollbacks++; throw err; }
  });
  mock.method(repo, 'obtener', async () => null);
  mock.method(repo, 'programaDisponible', async () => true);
  mock.method(repo, 'crear', async () => {});
  const detail = mock.method(repo, 'guardarDetalle', async () => { throw new Error('Error detalle'); });
  await assert.rejects(service.crear(entrada(), '1'), /Error detalle/);
  detail.mock.mockImplementation(async () => {});
  mock.method(service, 'obtener', async () => { throw new Error('Error lectura'); });
  await assert.rejects(service.crear(entrada(), '1'), /Error lectura/);
  assert.equal(rollbacks, 2);
});

test('SQL de modificacion/eliminacion queda limitado al folio y detalle de tablas nuevas', async () => {
  const query = mock.method(sequelize, 'query', async () => []);
  await repo.actualizar('A10', entrada(), '2', {});
  await repo.guardarDetalle('A10', { ...entrada().detalles[0], corr_dethac: 7 }, {});
  await repo.eliminarDetalles('A10', [8], {});
  assert.match(query.mock.calls[0].arguments[0], /WHERE fol_dechac = :folio/);
  assert.match(query.mock.calls[1].arguments[0], /WHERE fol_dechac = :folio AND corr_dethac = :corr_dethac/);
  assert.match(query.mock.calls[2].arguments[0], /WHERE fol_dechac = :folio AND corr_dethac IN \(:ids\)/);
});

test('API autentica ADMIN/MINISTERIO, ofrece escrituras solo ProEmpleo y conserva consultas legacy', async () => {
  const express = require('express');
  const auth = require('../src/middlewares/auth.middleware');
  mock.method(auth, 'requireAuth', (req, _res, next) => {
    const role = req.headers['x-test-role'];
    if (!role) return next(Object.assign(new Error('No autenticado'), { statusCode: 401 }));
    req.user = { sub: '1', roles: [role] };
    next();
  });
  mock.method(service, 'listar', async () => ({ data: [], pagination: { page: 1, totalPages: 1 } }));
  mock.method(service, 'anios', async () => [2026]);
  mock.method(service, 'programas', async () => ({ anio: 2026, data: [] }));
  mock.method(service, 'obtener', async (folio, origen) => ({ fol_dechac: folio, origen, detalles: [] }));
  const crear = mock.method(service, 'crear', async () => ({ origen: 'proempleo' }));
  const actualizar = mock.method(service, 'actualizar', async () => ({ origen: 'proempleo' }));
  const app = express();
  app.use(express.json());
  app.use('/decretos-hacienda', require('../src/routes/decretosHacienda.routes').default);
  app.use((err, _req, res, _next) => res.status(err.statusCode ?? 400).json({ message: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/decretos-hacienda`;
  try {
    assert.equal((await fetch(url)).status, 401);
    for (const role of ['INTENDENCIA', 'OTRO']) {
      const headers = { 'x-test-role': role, 'Content-Type': 'application/json' };
      assert.equal((await fetch(url, { headers })).status, 403);
      assert.equal((await fetch(url, { method: 'POST', headers, body: JSON.stringify(entrada()) })).status, 403);
      assert.equal((await fetch(url + '/proempleo/A10', { method: 'PUT', headers, body: JSON.stringify(entrada()) })).status, 403);
    }
    for (const role of ['ADMIN', 'MINISTERIO']) {
      const headers = { 'x-test-role': role, 'Content-Type': 'application/json' };
      for (const path of ['', '/anios', '/programas', '/A10DH0025']) {
        assert.equal((await fetch(url + path, { headers })).status, 200);
      }
      assert.equal((await (await fetch(url + '/A10%20DH%2B25', { headers })).json()).fol_dechac, 'A10 DH+25');
      assert.equal((await (await fetch(url + '/A10?origen=proempleo', { headers })).json()).origen, 'proempleo');
      assert.equal((await fetch(url + '/A10?origen=otro', { headers })).status, 400);
      assert.equal((await fetch(url + '?anio=abc', { headers })).status, 400);
      assert.equal((await fetch(url, { method: 'POST', headers, body: JSON.stringify(entrada()) })).status, 201);
      assert.equal((await fetch(url + '/proempleo/A10DH0025', { method: 'PUT', headers, body: JSON.stringify(entrada()) })).status, 200);
      assert.equal((await fetch(url + '/A10DH0025', { method: 'PUT', headers, body: JSON.stringify(entrada()) })).status, 404);
      assert.equal((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ ...entrada(), mon_dechac: '1.5' }) })).status, 400);
      for (const method of ['PATCH', 'DELETE']) assert.equal((await fetch(url + '/A10DH0025', { method, headers })).status, 404);
    }
    assert.equal(crear.mock.calls.length, 2);
    assert.equal(actualizar.mock.calls.length, 2);
    assert.equal(crear.mock.calls[0].arguments[1], '1');
    service.programas.mock.mockImplementation(async () => { throw Object.assign(new Error('Catalogo no disponible'), { statusCode: 503 }); });
    assert.equal((await fetch(url + '/programas', { headers: { 'x-test-role': 'ADMIN' } })).status, 503);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
