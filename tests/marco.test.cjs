const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.DOTENV_CONFIG_PATH = '__marco_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'marco-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'marco-test';

const { Op } = require('sequelize');
const { MarcoModel } = require('../src/models/Marco.model');
const { MarcoDetalleModel } = require('../src/models/MarcoDetalle.model');
const { marcoRepository: repo } = require('../src/repositories/marco.repository');
const { marcoService: service } = require('../src/services/marco.service');
const { listarMarcosSchema, obtenerMarcoSchema } = require('../src/validations/marco.validation');
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
  mock.method(MarcoModel, 'count', async () => 21);
  const listado = mock.method(MarcoModel, 'findAll', async () => [MarcoModel.build({ corr_mar: 1 })]);
  const resultado = await repo.listar({ anio: 2026, page: 9 });
  assert.deepEqual(resultado.pagination, { page: 2, limit: 20, total: 21, totalPages: 2 });
  const query = listado.mock.calls[0].arguments[0];
  assert.equal(query.where.ano_mar, 2026);
  assert.equal(query.offset, 20);
  assert.equal(query.limit, 20);
  assert.deepEqual(query.order, [['ano_mar', 'DESC'], ['corr_mar', 'DESC']]);
});

test('busqueda de nombre trata comodines como literales y correlativo usa igualdad', async () => {
  mock.method(MarcoModel, 'count', async () => 0);
  const listado = mock.method(MarcoModel, 'findAll', async () => []);
  await repo.listar({ buscar: '100%_[ley]', page: 1 });
  const condiciones = listado.mock.calls[0].arguments[0].where[Op.or];
  assert.equal(condiciones.length, 1);
  assert.equal(condiciones[0].nombre_mar[Op.like], '%100[%][_][[]ley[]]%');
  await repo.listar({ buscar: '123', page: 1 });
  assert.equal(listado.mock.calls[1].arguments[0].where[Op.or][1].corr_mar, 123);
});

test('catalogo de años proviene de los datos sin valores nulos', async () => {
  mock.method(MarcoModel, 'findAll', async () => [
    MarcoModel.build({ ano_mar: 2026 }), MarcoModel.build({ ano_mar: 2025 }),
  ]);
  assert.deepEqual(await repo.anios(), [2026, 2025]);
  assert.deepEqual(MarcoModel.findAll.mock.calls[0].arguments[0].group, ['ano_mar']);
});

test('ficha incluye solo glosas relacionadas por correlativo y conserva montos exactos', async () => {
  mock.method(MarcoModel, 'findByPk', async () => MarcoModel.build({
    corr_mar: 12, ano_mar: 2026, nombre_mar: 'Ley de presupuesto', monto_mar: '9007199254740993.25',
  }));
  const detalles = mock.method(MarcoDetalleModel, 'findAll', async () => [
    MarcoDetalleModel.build({ corr_detmar: 8, corr_mar: 12, glo_detmar: '01', mon_detmar: '123.45' }),
  ]);
  const ficha = await service.obtener(12);
  assert.equal(ficha.corr_mar, 12);
  assert.equal(ficha.monto_mar, '9007199254740993.25');
  assert.equal(ficha.detalles.length, 1);
  assert.deepEqual(detalles.mock.calls[0].arguments[0].where, { corr_mar: 12 });
});

test('ley inexistente retorna 404 y ley sin glosas conserva ficha vacia', async () => {
  const obtener = mock.method(repo, 'obtener', async () => null);
  const detalles = mock.method(repo, 'detalles', async () => []);
  await assert.rejects(service.obtener(1), (err) => err.statusCode === 404);
  assert.equal(detalles.mock.calls.length, 0);
  obtener.mock.mockImplementation(async () => MarcoModel.build({ corr_mar: 1 }));
  assert.deepEqual((await service.obtener(1)).detalles, []);
});

test('parametros invalidos son rechazados sin consultas ni defaults silenciosos', () => {
  for (const query of [{ page: '0' }, { page: '-1' }, { anio: 'abc' }, { anio: '0' }, { buscar: 'a'.repeat(151) }]) {
    assert.equal(listarMarcosSchema.safeParse({ query }).success, false);
  }
  assert.equal(listarMarcosSchema.parse({ query: {} }).query.page, 1);
  for (const id of ['abc', '0', '-5', '1.2']) {
    assert.equal(obtenerMarcoSchema.safeParse({ params: { id } }).success, false);
  }
});

test('API autoriza ADMIN y MINISTERIO, deniega otros perfiles y no ofrece escrituras', async () => {
  const express = require('express');
  const auth = require('../src/middlewares/auth.middleware');
  mock.method(auth, 'requireAuth', (req, _res, next) => {
    if (!req.headers['x-test-role']) return next(Object.assign(new Error('No autenticado'), { statusCode: 401 }));
    req.user = { sub: '1', roles: [req.headers['x-test-role']] };
    next();
  });
  mock.method(service, 'listar', async () => ({ data: [], pagination: { total: 0 } }));
  mock.method(service, 'anios', async () => [2026]);
  mock.method(service, 'obtener', async (id) => ({ corr_mar: id, detalles: [] }));
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
    }
    for (const role of ['ADMIN', 'MINISTERIO']) {
      const headers = { 'x-test-role': role };
      for (const path of ['', '/anios', '/12']) {
        assert.equal((await fetch(url + path, { headers })).status, 200);
      }
      assert.equal((await fetch(url + '/0', { headers })).status, 400);
      assert.equal((await fetch(url + '?page=0', { headers })).status, 400);
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        assert.equal((await fetch(url, { method, headers })).status, 404);
      }
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
