const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.DOTENV_CONFIG_PATH = '__decretos_hacienda_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'hacienda-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'hacienda-test';

const { fn, Op } = require('sequelize');
const { DecretosHaciendaModel: Decreto } = require('../src/models/DecretosHacienda.model');
const { DecretosHaciendaDetalleModel: Detalle } = require('../src/models/DecretosHaciendaDetalle.model');
const { MarcoModel } = require('../src/models/Marco.model');
const { MarcoDetalleModel } = require('../src/models/MarcoDetalle.model');
const { decretosHaciendaRepository: repo } = require('../src/repositories/decretosHacienda.repository');
const { decretosHaciendaService: service } = require('../src/services/decretosHacienda.service');
const { listarDecretosHaciendaSchema: listarSchema, obtenerDecretoHaciendaSchema: obtenerSchema } = require('../src/validations/decretosHacienda.validation');

afterEach(() => mock.restoreAll());

test('modelos mapean solo los campos solicitados, sin id/timestamps ni tabla paralela', () => {
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
});

test('asociaciones de decreto y glosas usan folio, sin crear constraints legacy', () => {
  require('../src/database/sicapAssociations').registrarAsociaciones();
  assert.equal(Decreto.associations.detalles.foreignKey, 'fol_dechac');
  assert.equal(Detalle.associations.decreto.targetKey, 'fol_dechac');
  assert.equal(Decreto.associations.detalles.options.constraints, false);
});

test('listado combina año por fecha y folio, pagina 20 y limita la pagina al total', async () => {
  const count = mock.method(Decreto, 'count', async () => 41);
  const find = mock.method(Decreto, 'findAll', async () => []);
  const resultado = await repo.listar({ anio: 2026, folio: 'A10DH', page: 99 });
  assert.deepEqual(resultado.pagination, { page: 3, limit: 20, total: 41, totalPages: 3 });
  const query = find.mock.calls[0].arguments[0];
  assert.deepEqual(query.where.fec_dechac, {
    [Op.gte]: fn('DATEFROMPARTS', 2026, 1, 1),
    [Op.lt]: fn('DATEFROMPARTS', 2027, 1, 1),
  });
  assert.equal(query.where.fol_dechac[Op.like], '%A10DH%');
  assert.equal(query.offset, 40);
  assert.equal(query.limit, 20);
  assert.deepEqual(query.where, count.mock.calls[0].arguments[0].where);
  assert.deepEqual(query.order, [['fec_dechac', 'DESC'], ['fol_dechac', 'DESC']]);
});

test('SQL del filtro anual usa fechas nativas sin cadenas ni desplazamientos de zona horaria', async () => {
  const count = mock.method(Decreto, 'count', async () => 1);
  const find = mock.method(Decreto, 'findAll', async () => []);
  await repo.listar({ anio: 2026, page: 1 });

  const generator = Decreto.sequelize.getQueryInterface().queryGenerator;
  for (const consulta of [count, find]) {
    const { where } = consulta.mock.calls[0].arguments[0];
    const sql = generator.selectQuery(Decreto.getTableName(), { attributes: ['fol_dechac'], where }, Decreto);
    assert.match(sql, /\[fec_dechac\] >= DATEFROMPARTS\(2026, 1, 1\)/);
    assert.match(sql, /\[fec_dechac\] < DATEFROMPARTS\(2027, 1, 1\)/);
    assert.doesNotMatch(sql, /N'202[67]-01-01|[+-]\d{2}:\d{2}/);
  }
});

test('busqueda trata comodines de folio como literales y listado vacio mantiene pagina 1', async () => {
  mock.method(Decreto, 'count', async () => 0);
  const find = mock.method(Decreto, 'findAll', async () => []);
  const resultado = await repo.listar({ folio: 'A%_[10]', page: 8 });
  assert.equal(find.mock.calls[0].arguments[0].where.fol_dechac[Op.like], '%A[%][_][[]10[]]%');
  assert.equal(resultado.pagination.page, 1);
  assert.equal(resultado.pagination.totalPages, 1);
});

test('catalogo de años agrupa YEAR de fecha y excluye fechas nulas', async () => {
  const find = mock.method(Decreto, 'findAll', async () => [
    { get: () => 2026 }, { get: () => 2025 },
  ]);
  assert.deepEqual(await repo.anios(), [2026, 2025]);
  const query = find.mock.calls[0].arguments[0];
  assert.equal(query.attributes[0][0].fn, 'YEAR');
  assert.equal(query.attributes[0][0].args[0].col, 'fec_dechac');
  assert.deepEqual(query.where, { fec_dechac: { [Op.not]: null } });
});

test('programas consulta todos los marcos del año vigente sin truncarlos a 20', async () => {
  const anio = new Date().getFullYear();
  const rows = Array.from({ length: 25 }, (_, index) => MarcoModel.build({
    corr_mar: index + 1, ano_mar: anio, nombre_mar: `Programa ${index + 1}`,
  }));
  const find = mock.method(MarcoModel, 'findAll', async () => rows);
  const resultado = await service.programas();
  assert.equal(resultado.anio, anio);
  assert.equal(resultado.data.length, 25);
  const query = find.mock.calls[0].arguments[0];
  assert.deepEqual(query.where, { ano_mar: anio });
  assert.equal(query.limit, undefined);
  assert.equal(query.offset, undefined);
});

test('ficha resuelve por folio exacto y une programa y glosa de su mismo marco, incluso historicos', async () => {
  const folio = 'A10DH0025';
  mock.method(Decreto, 'findByPk', async () => Decreto.build({
    fol_dechac: folio, mon_dechac: '9007199254740993.25', obs_dechac: 'Histórico',
  }));
  const detalles = mock.method(Detalle, 'findAll', async () => [
    Detalle.build({ fol_dechac: folio, corr_dethac: 1, corr_mar: 12, corr_detmar: 1, acc_dethac: 'R', mon_dethac: '123.45' }),
    Detalle.build({ fol_dechac: folio, corr_dethac: 2, corr_mar: 13, corr_detmar: 2, acc_dethac: '=', mon_dethac: null }),
  ]);
  mock.method(MarcoModel, 'findAll', async () => [
    MarcoModel.build({ corr_mar: 12, ano_mar: 2020, nombre_mar: 'Programa histórico' }),
  ]);
  mock.method(MarcoDetalleModel, 'findAll', async () => [
    MarcoDetalleModel.build({ corr_detmar: 1, corr_mar: 12, nom_detmar: 'EJECUCION' }),
    MarcoDetalleModel.build({ corr_detmar: 2, corr_mar: 99, nom_detmar: 'Glosa de otro programa' }),
  ]);
  const ficha = await service.obtener(folio);
  assert.equal(Decreto.findByPk.mock.calls[0].arguments[0], folio);
  assert.deepEqual(detalles.mock.calls[0].arguments[0].where, { fol_dechac: folio });
  assert.equal(ficha.mon_dechac, '9007199254740993.25');
  assert.equal(ficha.detalles[0].programa.ano_mar, 2020);
  assert.equal(ficha.detalles[0].glosa.nom_detmar, 'EJECUCION');
  assert.equal(ficha.detalles[0].acc_dethac, 'R');
  assert.equal(ficha.detalles[1].programa, null);
  assert.equal(ficha.detalles[1].glosa, null);
  assert.equal(ficha.detalles[1].corr_detmar, 2);
});

test('ficha vacia no consulta catalogos y folio inexistente responde 404', async () => {
  const obtener = mock.method(repo, 'obtener', async () => null);
  const detalles = mock.method(repo, 'detalles', async () => []);
  await assert.rejects(service.obtener('NO-EXISTE'), (err) => err.statusCode === 404);
  assert.equal(detalles.mock.calls.length, 0);
  obtener.mock.mockImplementation(async () => Decreto.build({ fol_dechac: 'A10' }));
  const marcos = mock.method(MarcoModel, 'findAll', async () => { throw new Error('No consultar catalogo vacio'); });
  const glosas = mock.method(MarcoDetalleModel, 'findAll', async () => { throw new Error('No consultar catalogo vacio'); });
  assert.deepEqual((await service.obtener('A10')).detalles, []);
  assert.equal(marcos.mock.calls.length, 0);
  assert.equal(glosas.mock.calls.length, 0);
});

test('validacion admite folio alfanumerico pero rechaza filtros, paginas y folios invalidos', () => {
  assert.equal(listarSchema.parse({ query: {} }).query.page, 1);
  assert.equal(obtenerSchema.parse({ params: { folio: 'A10DH0025' } }).params.folio, 'A10DH0025');
  for (const query of [{ anio: 'abc' }, { anio: 0 }, { anio: 9999 }, { page: 0 }, { page: -1 }, { page: 1.2 }, { folio: 'a'.repeat(151) }]) {
    assert.equal(listarSchema.safeParse({ query }).success, false);
  }
  for (const folio of ['', '  ', 'a'.repeat(151)]) {
    assert.equal(obtenerSchema.safeParse({ params: { folio } }).success, false);
  }
});

test('API solo permite consultas ADMIN/MINISTERIO y mantiene errores explicitos', async () => {
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
  mock.method(service, 'obtener', async (folio) => ({ fol_dechac: folio, detalles: [] }));
  const routes = require('../src/routes/decretosHacienda.routes').default;
  const app = express();
  app.use(express.json());
  app.use('/decretos-hacienda', routes);
  app.use((err, _req, res, _next) => res.status(err.statusCode ?? 400).json({ message: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/decretos-hacienda`;
  try {
    assert.equal((await fetch(url)).status, 401);
    for (const role of ['INTENDENCIA', 'OTRO']) {
      for (const path of ['', '/anios', '/programas', '/A10DH0025']) {
        assert.equal((await fetch(url + path, { headers: { 'x-test-role': role } })).status, 403);
      }
    }
    for (const role of ['ADMIN', 'MINISTERIO']) {
      const headers = { 'x-test-role': role };
      for (const path of ['', '/anios', '/programas', '/A10DH0025']) {
        assert.equal((await fetch(url + path, { headers })).status, 200);
      }
      const decoded = await (await fetch(url + '/A10%20DH%2B25', { headers })).json();
      assert.equal(decoded.fol_dechac, 'A10 DH+25');
      assert.equal((await fetch(url + '?anio=abc', { headers })).status, 400);
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        for (const path of ['', '/A10DH0025']) {
          assert.equal((await fetch(url + path, { method, headers })).status, 404);
        }
      }
    }
    service.programas.mock.mockImplementation(async () => { throw Object.assign(new Error('Catalogo no disponible'), { statusCode: 503 }); });
    assert.equal((await fetch(url + '/programas', { headers: { 'x-test-role': 'ADMIN' } })).status, 503);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
