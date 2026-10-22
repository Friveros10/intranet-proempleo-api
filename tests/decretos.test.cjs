const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.DOTENV_CONFIG_PATH = '__decretos_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'decretos-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'decretos-test';

const { Op } = require('sequelize');
const { DecretosModel: Decreto } = require('../src/models/Decretos.model');
const { DecretosDetalleModel: Detalle } = require('../src/models/DecretosDetalle.model');
const { MarcoModel } = require('../src/models/Marco.model');
const { MarcoDetalleModel } = require('../src/models/MarcoDetalle.model');
const { decretosRepository: repo } = require('../src/repositories/decretos.repository');
const { decretosService: service } = require('../src/services/decretos.service');
const { listarDecretosSchema: listarSchema, obtenerDecretoSchema: obtenerSchema } = require('../src/validations/decretos.validation');

afterEach(() => mock.restoreAll());

test('intermediarios se filtran por la region del usuario en servidor, incluso ADMIN', async () => {
  const { usuarioSicapRepository: usuarios } = require('../src/repositories/sicap/usuarioSicap.repository');
  const { IntermediarioModel } = require('../src/models/Intermediario.model');
  const usuario = mock.method(usuarios, 'findByRut', async () => ({ reg_usu: 8 }));
  const find = mock.method(IntermediarioModel, 'findAll', async () => []);
  await service.intermediarios(123);
  assert.equal(usuario.mock.calls[0].arguments[0], 123);
  assert.deepEqual(find.mock.calls[0].arguments[0].where, { reg_int: 8 });
  assert.deepEqual(find.mock.calls[0].arguments[0].attributes, ['rut_int', 'dig_int', 'nom_int', 'reg_int']);
  assert.equal(find.mock.calls[0].arguments[0].limit, undefined);
  for (const region of [null, 0, -1]) {
    usuario.mock.mockImplementation(async () => ({ reg_usu: region }));
    await assert.rejects(service.intermediarios(123), (err) => err.statusCode === 403);
  }
  usuario.mock.mockImplementation(async () => null);
  await assert.rejects(service.intermediarios(123), (err) => err.statusCode === 401);
  assert.equal(find.mock.calls.length, 1);
});

test('modelos usan DECRETOS y DECDET con campos exactos, sin columnas de Hacienda ni id ficticio', () => {
  assert.deepEqual(Object.keys(Decreto.getAttributes()).sort(), [
    'fol_dec', 'folprov_dec', 'ano_dec', 'fec_dec', 'obs_dec', 'mon_dec', 'cob_dec',
    'usu_cre', 'fec_cre', 'usu_mod', 'fec_mod', 'usu_eli', 'fec_eli', 'est_dec', 'rutint_dec', 'programaInt',
  ].sort());
  assert.deepEqual(Object.keys(Detalle.getAttributes()).sort(), [
    'fol_dec', 'corr_mar', 'corr_detmar', 'mon_decdet', 'sublinea',
  ].sort());
  assert.equal(Decreto.getTableName().tableName, 'DECRETOS');
  assert.equal(Detalle.getTableName().tableName, 'DECDET');
  assert.equal(Decreto.primaryKeyAttribute, 'fol_dec');
  assert.deepEqual(Detalle.primaryKeyAttributes, []);
  assert.equal(Decreto.options.timestamps, false);
  assert.equal(Detalle.options.timestamps, false);
});

test('asociaciones consultan por fol_dec sin agregar columnas ni constraints', () => {
  require('../src/database/sicapAssociations').registrarAsociaciones();
  assert.equal(Decreto.associations.detalles.foreignKey, 'fol_dec');
  assert.equal(Detalle.associations.decreto.targetKey, 'fol_dec');
  assert.equal(Decreto.associations.detalles.options.constraints, false);
  assert.equal(Detalle.getAttributes().id, undefined);
});

test('listado combina ano_dec y folio escapado, pagina 20 y ajusta pagina al total', async () => {
  const count = mock.method(Decreto, 'count', async () => 41);
  const find = mock.method(Decreto, 'findAll', async () => []);
  const resultado = await repo.listar({ anio: 2026, folio: 'A%_[26]', page: 99 });
  assert.deepEqual(resultado.pagination, { page: 3, limit: 20, total: 41, totalPages: 3 });
  const query = find.mock.calls[0].arguments[0];
  assert.equal(query.where.ano_dec, 2026);
  assert.equal(query.where.fec_dec, undefined);
  assert.equal(query.where.fol_dec[Op.like], '%A[%][_][[]26[]]%');
  assert.deepEqual(query.where, count.mock.calls[0].arguments[0].where);
  assert.equal(query.offset, 40);
  assert.equal(query.limit, 20);
  assert.deepEqual(query.order, [['ano_dec', 'DESC'], ['fec_dec', 'DESC'], ['fol_dec', 'DESC']]);
  const generator = Decreto.sequelize.getQueryInterface().queryGenerator;
  const sql = generator.selectQuery(Decreto.getTableName(), { where: query.where }, Decreto);
  assert.match(sql, /\[ano_dec\] = 2026/);
  assert.doesNotMatch(sql, /DATEFROMPARTS|YEAR\(/);
});

test('listado sin filtros y sin resultados mantiene pagina 1', async () => {
  const count = mock.method(Decreto, 'count', async () => 0);
  mock.method(Decreto, 'findAll', async () => []);
  assert.deepEqual((await repo.listar({ page: 8 })).pagination, { page: 1, limit: 20, total: 0, totalPages: 1 });
  assert.deepEqual(count.mock.calls[0].arguments[0].where, {});
});

test('catalogo agrupa ano_dec sin depender del formato ISO de fec_dec', async () => {
  const find = mock.method(Decreto, 'findAll', async () => [
    Decreto.build({ ano_dec: 2026 }), Decreto.build({ ano_dec: 2025 }),
  ]);
  assert.deepEqual(await repo.anios(), [2026, 2025]);
  assert.deepEqual(find.mock.calls[0].arguments[0], {
    attributes: ['ano_dec'], where: { ano_dec: { [Op.not]: null } },
    group: ['ano_dec'], order: [['ano_dec', 'DESC']],
  });
});

test('programas devuelve todos los marcos del año actual del servidor, mas de una pagina', async () => {
  const anio = new Date().getFullYear();
  const find = mock.method(MarcoModel, 'findAll', async () =>
    Array.from({ length: 25 }, (_, index) => MarcoModel.build({ corr_mar: index + 1, ano_mar: anio })));
  const resultado = await service.programas();
  assert.equal(resultado.anio, anio);
  assert.equal(resultado.data.length, 25);
  const query = find.mock.calls[0].arguments[0];
  assert.deepEqual(query.where, { ano_mar: anio });
  assert.equal(query.limit, undefined);
});

test('detalle conserva distribuciones de un mismo marco/glosa, sublineas y montos exactos', async () => {
  const obtener = mock.method(Decreto, 'findByPk', async () => Decreto.build({
    fol_dec: 'A26D0001', ano_dec: 2026, fec_dec: new Date('2026-06-30T00:00:00.000Z'),
    mon_dec: '9007199254740993.25', rutint_dec: '60511080-0',
  }));
  const detalles = mock.method(Detalle, 'findAll', async () => [
    Detalle.build({ fol_dec: 'A26D0001', corr_mar: 12, corr_detmar: 1, mon_decdet: '9007199254740993.25', sublinea: 'DPR' }),
    Detalle.build({ fol_dec: 'A26D0001', corr_mar: 12, corr_detmar: 1, mon_decdet: '10.25', sublinea: 'GORE-CONV' }),
    Detalle.build({ fol_dec: 'A26D0001', corr_mar: 13, corr_detmar: 2, mon_decdet: null, sublinea: 'Regular' }),
  ]);
  const marcos = mock.method(MarcoModel, 'findAll', async () => [
    MarcoModel.build({ corr_mar: 12, ano_mar: 2020, nombre_mar: 'Programa histórico' }),
  ]);
  mock.method(MarcoDetalleModel, 'findAll', async () => [
    MarcoDetalleModel.build({ corr_mar: 12, corr_detmar: 1, nom_detmar: 'EJECUCION' }),
    MarcoDetalleModel.build({ corr_mar: 99, corr_detmar: 2, nom_detmar: 'Glosa de otro marco' }),
  ]);
  const ficha = await service.obtener('A26D0001');
  assert.equal(obtener.mock.calls[0].arguments[0], 'A26D0001');
  assert.deepEqual(detalles.mock.calls[0].arguments[0].where, { fol_dec: 'A26D0001' });
  assert.equal(marcos.mock.calls[0].arguments[0].where.ano_mar, undefined);
  assert.equal(ficha.detalles.length, 3);
  assert.equal(ficha.fec_dec.toISOString(), '2026-06-30T00:00:00.000Z');
  assert.equal(ficha.mon_dec, '9007199254740993.25');
  assert.equal(ficha.detalles[0].mon_decdet, '9007199254740993.25');
  assert.equal(ficha.detalles[0].programa.ano_mar, 2020);
  assert.equal(ficha.detalles[0].glosa.nom_detmar, 'EJECUCION');
  assert.equal(ficha.detalles[1].sublinea, 'GORE-CONV');
  assert.equal(ficha.detalles[2].sublinea, 'Regular');
  assert.equal(ficha.detalles[2].programa, null);
  assert.equal(ficha.detalles[2].glosa, null);
});

test('ficha ausente responde 404 y ficha sin distribuciones no consulta referencias', async () => {
  const obtener = mock.method(repo, 'obtener', async () => null);
  const detalles = mock.method(repo, 'detalles', async () => []);
  await assert.rejects(service.obtener('NO-EXISTE'), (err) => err.statusCode === 404);
  assert.equal(detalles.mock.calls.length, 0);
  obtener.mock.mockImplementation(async () => Decreto.build({ fol_dec: 'A26D0001' }));
  const marcos = mock.method(MarcoModel, 'findAll', async () => { throw new Error('No consultar catalogo vacio'); });
  const glosas = mock.method(MarcoDetalleModel, 'findAll', async () => { throw new Error('No consultar catalogo vacio'); });
  assert.deepEqual((await service.obtener('A26D0001')).detalles, []);
  assert.equal(marcos.mock.calls.length, 0);
  assert.equal(glosas.mock.calls.length, 0);
});

test('validacion admite filtros numericos desde URL y rechaza filtros invalidos', () => {
  assert.deepEqual(listarSchema.parse({ query: { anio: '2026', folio: ' A26D ', page: '2' } }).query,
    { anio: 2026, folio: 'A26D', page: 2 });
  assert.equal(listarSchema.parse({ query: {} }).query.page, 1);
  for (const query of [{ anio: 'abc' }, { anio: 0 }, { anio: 9999 }, { page: 0 }, { page: 1.5 }, { folio: 'x'.repeat(151) }]) {
    assert.equal(listarSchema.safeParse({ query }).success, false);
  }
  for (const folio of ['', '  ', 'x'.repeat(151)]) {
    assert.equal(obtenerSchema.safeParse({ params: { folio } }).success, false);
  }
});

test('API autenticada ADMIN/MINISTERIO solo permite GET y expone errores', async () => {
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
  const intermediarios = mock.method(service, 'intermediarios', async () => []);
  mock.method(service, 'obtener', async (folio) => ({ fol_dec: folio, detalles: [] }));
  const app = express();
  app.use('/decretos', require('../src/routes/decretos.routes').default);
  app.use((err, _req, res, _next) => res.status(err.statusCode ?? 400).json({ message: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/decretos`;
  try {
    assert.equal((await fetch(url)).status, 401);
    for (const path of ['', '/anios', '/programas', '/intermediarios', '/A26D0001']) {
      assert.equal((await fetch(url + path, { headers: { 'x-test-role': 'INTENDENCIA' } })).status, 403);
    }
    for (const role of ['ADMIN', 'MINISTERIO']) {
      const headers = { 'x-test-role': role };
      for (const path of ['', '/anios', '/programas', '/intermediarios?region=99', '/A26D0001']) {
        assert.equal((await fetch(url + path, { headers })).status, 200);
      }
      assert.deepEqual(intermediarios.mock.calls.at(-1).arguments, [1]);
      assert.equal((await (await fetch(url + '/A26%20D%2B1', { headers })).json()).fol_dec, 'A26 D+1');
      assert.equal((await fetch(url + '?anio=abc', { headers })).status, 400);
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        for (const path of ['', '/A26D0001']) {
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
