const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

process.env.DOTENV_CONFIG_PATH = '__beneficiarios_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'beneficiarios-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'beneficiarios-test';

const { sequelize } = require('../src/database/sequelize');
const { BeneficiarioModel: legacy } = require('../src/models/Beneficiario.model');
const { BeneficiarioProempleoModel: proempleo } = require('../src/models/BeneficiarioProempleo.model');
const { BeneficiarioConsultaModel: consulta } = require('../src/models/BeneficiarioConsulta.model');
const { RegionModel } = require('../src/models/Region.model');
const { CiudadModel } = require('../src/models/Ciudad.model');
const { ComunaModel } = require('../src/models/Comuna.model');
const { BenProModel } = require('../src/models/BenPro.model');
const { ReemplazoBenProyectoModel } = require('../src/models/ReemplazoBenProyecto.model');
const { registrarAsociaciones } = require('../src/database/sicapAssociations');
const { Op } = require('sequelize');
const { beneficiarioRepository: repository } = require('../src/repositories/sicap/beneficiario.repository');
const { beneficiarioService: service } = require('../src/services/beneficiario.service');
const { usuarioSicapRepository: usuarios } = require('../src/repositories/sicap/usuarioSicap.repository');
const { auditLogRepository: audit } = require('../src/repositories/auditLog.repository');
const migration = require('../migrations/202610070001-remove-legacy-beneficiario-fields');
const createMigration = require('../migrations/202610050001-create-beneficiarios-proempleo');
const viewMigration = require('../migrations/202610070002-create-beneficiarios-consulta-view');

registrarAsociaciones();

const rut = 12345678;
const ficha = { region: 8, ciudad: 101, comuna: 10101, direccion: 'Direccion', email_ben: 'test@example.com' };
afterEach(() => mock.restoreAll());

function historico() {
  mock.method(proempleo, 'findOne', async () => null);
  mock.method(legacy, 'findByPk', async () => legacy.build({ rut_ben: rut, reg_ben: 8 }));
}

test('modelo historico no referencia campos eliminados y ProEmpleo los conserva', () => {
  for (const field of ['email', 'email_ben', 'status', 'statusFicha']) {
    assert.equal(legacy.getAttributes()[field], undefined);
  }
  for (const field of ['email', 'status', 'statusFicha']) {
    assert.ok(proempleo.getAttributes()[field]);
  }
});

function fila(overrides = {}) {
  const row = consulta.build({
    rut_ben: rut, dig_ben: '5', nom_ben: 'Ana', pat_ben: 'Perez', mat_ben: 'Soto',
    dir_ben: 'Direccion', reg_ben: 8, ciu_ben: 101, com_ben: 10101, civ_ben: 1,
    fecnac_ben: '1990-01-01', sex_ben: '2', est_ben: 'ACTIVO', etn_ben: null,
    tel_ben: null, cel_ben: null, email_ben: ' ', status: 1, statusFicha: 2,
    origen: 'historico', ...overrides,
  });
  row.region = RegionModel.build({ Nom_region: 'Region' });
  row.ciudad = CiudadModel.build({ nom_ciu: 'Ciudad' });
  row.comuna = ComunaModel.build({ nom_com: 'Comuna' });
  return row;
}

test('listado ORM pagina la vista y mantiene constantes, catalogos y filtros conjuntos', async () => {
  const spy = mock.method(consulta, 'findAll', async () => [
    fila(), fila({ rut_ben: 2, email_ben: 'test@example.com', statusFicha: 1, origen: 'proempleo' }),
  ]);
  const count = mock.method(consulta, 'count', async () => 102);
  const result = await repository.findAllListado({ page: 2, search: 'Ana' }, 8);
  const options = spy.mock.calls[0].arguments[0];
  assert.equal(options.offset, 50);
  assert.equal(options.limit, 50);
  assert.deepEqual(options.order, [['origen', 'DESC'], ['statusFicha', 'ASC'], ['rut_ben', 'ASC']]);
  assert.deepEqual(count.mock.calls[0].arguments[0].where, options.where);
  assert.deepEqual(options.where[Op.and][0], { statusFicha: { [Op.gt]: 0 }, status: { [Op.gt]: 0 } });
  assert.deepEqual(options.where[Op.and][1], { reg_ben: 8 });
  assert.equal(options.where[Op.and][2][Op.or][1].nom_ben[Op.like], '%Ana%');
  assert.equal(options.include.length, 3);
  assert.equal(options.include.every((include) => include.required === false), true);
  assert.deepEqual(options.include[1].where, { estado: 'ACTIVO' });
  assert.equal(result.data[0].email_ben, ' ');
  assert.equal(result.data[0].statusFicha, 2);
  assert.equal(result.data[0].nombre_region, 'Region');
  assert.equal(result.data[0].nombre_ciudad, 'Ciudad');
  assert.equal(result.data[0].nombre_comuna, 'Comuna');
  assert.equal(result.data[0].fecnac_ben, '1990-01-01');
  assert.equal(result.data[1].statusFicha, 1);
  assert.deepEqual(result.pagination, { page: 2, limit: 50, total: 102, totalPages: 3 });
});

test('detalle y resumenes usan ORM, conservan contrato y priorizan ProEmpleo para RUT duplicado', async () => {
  const detail = mock.method(consulta, 'findOne', async () => fila());
  const summaries = mock.method(consulta, 'findAll', async () => [
    fila(), fila({ origen: 'proempleo', nom_ben: 'Nombre actualizado' }),
  ]);
  assert.equal((await repository.findListadoByRut(rut)).origen, 'historico');
  assert.deepEqual((await repository.findResumenesPorRuts([rut])).get(rut), {
    rut_ben: rut, dig_ben: '5', nom_ben: 'Nombre actualizado',
    pat_ben: 'Perez', mat_ben: 'Soto', fecnac_ben: '1990-01-01',
  });
  assert.deepEqual(detail.mock.calls[0].arguments[0].where, { rut_ben: rut });
  assert.deepEqual(detail.mock.calls[0].arguments[0].order, [['origen', 'DESC']]);
  const options = summaries.mock.calls[0].arguments[0];
  assert.deepEqual(options.where, { rut_ben: { [Op.in]: [rut] } });
  assert.deepEqual(options.order, [['origen', 'ASC']]);
  assert.deepEqual(options.attributes, ['rut_ben', 'dig_ben', 'nom_ben', 'pat_ben', 'mat_ben', 'fecnac_ben']);
  assert.equal((await repository.findResumenesPorRuts([])).size, 0);
  assert.equal(summaries.mock.callCount(), 1);
});

test('filtros globales permiten territorio y regionales no pueden sustituir su region', async () => {
  const spy = mock.method(consulta, 'findAll', async () => []);
  mock.method(consulta, 'count', async () => 0);
  const filtros = { page: 1, region: 5, ciudad: 101, comuna: 10101 };
  assert.equal((await repository.findAllListado(filtros)).pagination.totalPages, 1);
  assert.deepEqual(spy.mock.calls[0].arguments[0].where[Op.and].slice(1), [
    { reg_ben: 5 }, { ciu_ben: 101 }, { com_ben: 10101 },
  ]);
  await repository.findAllListado(filtros, 8);
  assert.deepEqual(spy.mock.calls[1].arguments[0].where[Op.and].slice(1), [{ reg_ben: 8 }]);
});

test('ficha BenPro usa vista ORM con catalogos, campos propios y ultimo proyecto', async () => {
  const record = fila();
  record.ciudad = null;
  const detail = mock.method(consulta, 'findOne', async () => record);
  const project = mock.method(BenProModel, 'findOne', async () => ({ mes_benpro: 10, ano_BenPro: 2026, fol_pro: 123 }));
  mock.method(ReemplazoBenProyectoModel, 'count', async () => 2);
  const result = await repository.findByRutFromBenPro(rut);
  assert.equal(result.civ_ben, 1);
  assert.equal(result.sex_ben, '2');
  assert.equal(result.est_ben, 'ACTIVO');
  assert.equal(result.nombre_ciudad, null);
  assert.equal(result.nombre_region, 'Region');
  assert.equal(result.ultimo_mes_benpro, 10);
  assert.equal(result.ultimo_ano_benpro, 2026);
  assert.equal(result.folio_vigente, 123);
  assert.equal(result.tiene_reemplazo, 2);
  assert.deepEqual(detail.mock.calls[0].arguments[0].order, [['origen', 'DESC']]);
  assert.deepEqual(project.mock.calls[0].arguments[0].order, [['ano_BenPro', 'DESC'], ['mes_benpro', 'DESC']]);
});

test('detalle y ficha inexistentes devuelven null sin consultar proyectos', async () => {
  mock.method(consulta, 'findOne', async () => null);
  const project = mock.method(BenProModel, 'findOne', async () => assert.fail('Consulta innecesaria'));
  assert.equal(await repository.findListadoByRut(rut), null);
  assert.equal(await repository.findByRutFromBenPro(rut), null);
  assert.equal(project.mock.callCount(), 0);
});

test('Sequelize genera SELECT paginado y COUNT sobre vista sin consultas raw del repositorio', async () => {
  const spy = mock.method(sequelize, 'query', async (_sql, options) =>
    options.plain ? { count: 1 } : [fila()]);
  const result = await repository.findAllListado({ page: 3, search: "O'Hara" }, 8);
  assert.equal(result.pagination.total, 1);
  const sql = spy.mock.calls.map((call) => call.arguments[0]);
  const listado = sql.find((query) => query.includes('OFFSET'));
  const count = sql.find((query) => query.includes('count('));
  assert.ok(listado);
  assert.ok(count);
  for (const query of sql) {
    assert.match(query, /\[dbo\]\.\[beneficiarios_consulta\] AS \[BeneficiarioConsultaModel\]/);
    assert.match(query, /CAST\(\[BeneficiarioConsultaModel\]\.\[rut_ben\] AS VARCHAR\(20\)\)/);
    assert.match(query, /O''Hara/);
    assert.doesNotMatch(query, /UNION ALL|dbo\.BENEFICIARIOS/);
  }
  assert.match(listado, /LEFT OUTER JOIN \[dbo\]\.\[REGIONES\]/);
  assert.match(listado, /\[ciudad\]\.\[estado\] = N'ACTIVO'/);
  assert.match(listado, /OFFSET 100 ROWS FETCH NEXT 50 ROWS ONLY/);
  assert.match(listado, /ORDER BY \[BeneficiarioConsultaModel\]\.\[origen\] DESC, \[BeneficiarioConsultaModel\]\.\[statusFicha\] ASC, \[BeneficiarioConsultaModel\]\.\[rut_ben\] ASC OFFSET/);
});

test('modelo de vista usa clave compuesta y bloquea operaciones de escritura', async () => {
  assert.deepEqual(consulta.primaryKeyAttributes, ['rut_ben', 'origen']);
  assert.equal(consulta.getAttributes().id, undefined);
  const query = mock.method(sequelize, 'query', async () => assert.fail('Escritura de vista'));
  await assert.rejects(consulta.update({ nom_ben: 'Cambio' }, { where: { rut_ben: rut } }), /solo lectura/);
  await assert.rejects(consulta.destroy({ where: { rut_ben: rut } }), /solo lectura/);
  await assert.rejects(fila().save(), /solo lectura/);
  await assert.rejects(consulta.bulkCreate([fila().get()]), /solo lectura/);
  await assert.rejects(consulta.upsert(fila().get()), /solo lectura/);
  assert.equal(query.mock.callCount(), 0);
});

test('migracion crea UNION ALL en vista con constantes, fechas ISO y campos de ficha', async () => {
  const queries = [];
  const qi = { sequelize: { query: async (sql) => queries.push(sql) } };
  await viewMigration.up(qi);
  assert.match(queries[0], /CREATE VIEW dbo\.beneficiarios_consulta AS/);
  assert.match(queries[0], /UNION ALL/);
  assert.match(queries[0], /CAST\(' ' AS VARCHAR\(255\)\) AS email_ben/);
  assert.match(queries[0], /1 AS status, 2 AS statusFicha/);
  assert.match(queries[0], /b\.civ_ben/);
  assert.match(queries[0], /b\.sex_ben, b\.est_ben, b\.etn_ben/);
  assert.match(queries[0], /p\.sexo, NULL, p\.etnia/);
  assert.match(queries[0], /CONVERT\(VARCHAR\(10\), b\.fecnac_ben, 23\)/);
  assert.match(queries[0], /CONVERT\(VARCHAR\(10\), p\.fechaNacimiento, 23\)/);
  assert.match(queries[0], /p\.email, p\.status, p\.statusFicha/);
  assert.doesNotMatch(queries[0], /b\.(?:email_ben|email|status|statusFicha)\b/);
  await viewMigration.down(qi);
  assert.equal(queries[1], 'DROP VIEW dbo.beneficiarios_consulta');
});

test('consulta por RUT mantiene lectura de historicos sin campos retirados', async () => {
  historico();
  assert.equal((await repository.findByRut(rut)).rut_ben, rut);
});

test('eliminacion y edicion historicas fallan sin escribir ni auditar exito', async () => {
  historico();
  mock.method(repository, 'findListadoByRut', async () => ({ rut_ben: rut, origen: 'historico' }));
  mock.method(usuarios, 'getPermisosDeUsuario', async () => ['BEN_COMPF']);
  const legacyUpdate = mock.method(legacy, 'update', async () => assert.fail('Escritura historica'));
  const newUpdate = mock.method(proempleo, 'update', async () => assert.fail('Escritura inesperada'));
  const log = mock.method(audit, 'registrar', async () => assert.fail('Auditoria de exito inesperada'));
  await assert.rejects(service.eliminar('12345678-5', 1, {}), { statusCode: 403 });
  await assert.rejects(service.completarFicha('12345678-5', ficha, 1, {}), { statusCode: 403 });
  assert.equal(legacyUpdate.mock.callCount(), 0);
  assert.equal(newUpdate.mock.callCount(), 0);
  assert.equal(log.mock.callCount(), 0);
});

test('completar ficha exige BEN_COMPF y no acepta permisos anteriores', async () => {
  const permissions = mock.method(usuarios, 'getPermisosDeUsuario', async () => ['BEN_CREAR', 'REM_CREAR']);
  const lookup = mock.method(repository, 'findByRut', async () => ({ rut_ben: rut }));
  const update = mock.method(repository, 'completarFicha', async () => {});
  const log = mock.method(audit, 'registrar', async () => {});
  const detail = mock.method(repository, 'findListadoByRut', async () => ({ rut_ben: rut }));
  await assert.rejects(service.completarFicha('12345678-5', ficha, 1, {}), { statusCode: 403 });
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
  assert.equal(log.mock.callCount(), 0);
  permissions.mock.mockImplementation(async () => ['BEN_COMPF']);
  assert.equal((await service.completarFicha('12345678-5', ficha, 1, {})).rut_ben, rut);
  assert.deepEqual(update.mock.calls[0].arguments, [rut, ficha, '1']);
  assert.equal(log.mock.calls[0].arguments[0].accion, 'BENEFICIARIO_FICHA_COMPLETADA');
  assert.equal(detail.mock.callCount(), 1);
});

test('endpoint completar ficha valida BEN_COMPF para los tres perfiles', async () => {
  const express = require('express');
  const auth = require('../src/middlewares/auth.middleware');
  let roles = ['INTENDENCIA'];
  mock.method(auth, 'requireAuth', (req, _res, next) => {
    req.user = { sub: '1', roles };
    next();
  });
  const permissions = mock.method(usuarios, 'getPermisosDeUsuario', async () => ['BEN_CREAR', 'REM_CREAR']);
  const complete = mock.method(service, 'completarFicha', async () => ({ rut_ben: rut }));
  const app = express();
  app.use(express.json());
  app.use('/beneficiarios', require('../src/routes/beneficiario.routes').default);
  app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ message: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/beneficiarios/12345678-5/completar-ficha`;
    const send = () => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ficha) });
    assert.equal((await send()).status, 403);
    assert.equal(complete.mock.callCount(), 0);
    permissions.mock.mockImplementation(async () => ['BEN_COMPF']);
    for (const rol of ['ADMIN', 'MINISTERIO', 'INTENDENCIA']) {
      roles = [rol];
      assert.equal((await send()).status, 200);
    }
    assert.equal(complete.mock.callCount(), 3);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('seeder asigna BEN_COMPF a ADMIN, MINISTERIO e INTENDENCIA sin conceder BEN_CREAR a INTENDENCIA', async () => {
  const { RolSicapModel } = require('../src/models/RolSicap.model');
  const { MenuModel } = require('../src/models/Menu.model');
  const { RolMenuModel } = require('../src/models/RolMenu.model');
  const seeder = require('../seeders/202609210001-reemplazo-roles-permisos');
  const menus = new Map();
  mock.method(RolSicapModel, 'upsert', async () => {});
  mock.method(MenuModel, 'findOne', async () => null);
  mock.method(MenuModel, 'create', async (data) => {
    const id = menus.size + 1;
    menus.set(data.cod_men, id);
    return { corr_men: id };
  });
  mock.method(RolMenuModel, 'findOne', async () => null);
  const assigned = mock.method(RolMenuModel, 'create', async (data) => data);
  await seeder.up();
  const links = assigned.mock.calls.map((call) => call.arguments[0]);
  assert.deepEqual(links.filter((link) => link.corr_men === menus.get('BEN_COMPF')).map((link) => link.corr_rol), [100, 101, 102]);
  assert.equal(links.some((link) => link.corr_rol === 102 && link.corr_men === menus.get('BEN_CREAR')), false);
});

test('seeder no duplica permisos ni asignaciones existentes', async () => {
  const { RolSicapModel } = require('../src/models/RolSicap.model');
  const { MenuModel } = require('../src/models/Menu.model');
  const { RolMenuModel } = require('../src/models/RolMenu.model');
  const seeder = require('../seeders/202609210001-reemplazo-roles-permisos');
  mock.method(RolSicapModel, 'upsert', async () => {});
  mock.method(MenuModel, 'findOne', async () => ({ corr_men: 1 }));
  mock.method(RolMenuModel, 'findOne', async () => ({ corr_RolMen: 1 }));
  const createMenu = mock.method(MenuModel, 'create', async () => assert.fail('Menu duplicado'));
  const createLink = mock.method(RolMenuModel, 'create', async () => assert.fail('Asignacion duplicada'));
  await seeder.up();
  assert.equal(createMenu.mock.callCount(), 0);
  assert.equal(createLink.mock.callCount(), 0);
});

test('RUT inexistente falla explicitamente al intentar escribir', async () => {
  mock.method(proempleo, 'findOne', async () => null);
  mock.method(legacy, 'findByPk', async () => null);
  await assert.rejects(repository.eliminar(rut, '1'), { statusCode: 404 });
  await assert.rejects(repository.completarFicha(rut, ficha, '1'), { statusCode: 404 });
});

test('edicion y eliminacion de ProEmpleo escriben exclusivamente en tabla propia', async () => {
  mock.method(proempleo, 'findOne', async () => proempleo.build({ rutBeneficiario: rut, status: 1 }));
  const oldRead = mock.method(legacy, 'findByPk', async () => assert.fail('Fallback historico'));
  const oldUpdate = mock.method(legacy, 'update', async () => assert.fail('Escritura historica'));
  const update = mock.method(proempleo, 'update', async () => [1]);
  await repository.completarFicha(rut, ficha, '99');
  assert.equal(await repository.eliminar(rut, '99'), 1);
  const edited = update.mock.calls[0].arguments[0];
  assert.equal(edited.email, ficha.email_ben);
  assert.equal(edited.statusFicha, 2);
  assert.equal(edited.idRegion, 8);
  assert.equal(edited.usuarioModificacion, '99');
  assert.equal(update.mock.calls[1].arguments[0].status, -1);
  assert.equal(update.mock.calls[1].arguments[0].usuarioEliminacion, '99');
  assert.equal(oldRead.mock.callCount(), 0);
  assert.equal(oldUpdate.mock.callCount(), 0);
});

test('ProEmpleo eliminado no permite editar ni usa fallback historico', async () => {
  mock.method(proempleo, 'findOne', async () => proempleo.build({ rutBeneficiario: rut, status: -1 }));
  const oldRead = mock.method(legacy, 'findByPk', async () => assert.fail('Fallback historico'));
  const update = mock.method(proempleo, 'update', async () => [0]);
  await assert.rejects(repository.completarFicha(rut, ficha, '1'), { statusCode: 409 });
  assert.equal(update.mock.callCount(), 0);
  assert.equal(await repository.eliminar(rut, '1'), 0);
  assert.equal(oldRead.mock.callCount(), 0);
});

test('edicion concurrente sin filas afectadas no reporta exito', async () => {
  mock.method(proempleo, 'findOne', async () => proempleo.build({ rutBeneficiario: rut, status: 1 }));
  mock.method(proempleo, 'update', async () => [0]);
  await assert.rejects(repository.completarFicha(rut, ficha, '1'), { statusCode: 409 });
});

test('alta completa se mantiene exclusivamente en ProEmpleo', async () => {
  const oldCreate = mock.method(legacy, 'create', async () => assert.fail('Alta historica'));
  const create = mock.method(proempleo, 'create', async (data) => data);
  await repository.createCompleto({
    rut_ben: rut, dig_ben: '5', nombres: 'Ana', apellidoPaterno: 'Perez',
    apellidoMaterno: 'Soto', fechaNacimiento: '1990-01-01', ...ficha,
  }, '99');
  const data = create.mock.calls[0].arguments[0];
  assert.equal(data.rutBeneficiario, rut);
  assert.equal(data.status, 1);
  assert.equal(data.statusFicha, 2);
  assert.equal(oldCreate.mock.callCount(), 0);
});

function migrationInterface(columns) {
  const tx = { test: true };
  const removed = [];
  const added = [];
  const qi = {
    sequelize: { transaction: async (callback) => callback(tx) },
    describeTable: async (table, options) => {
      assert.deepEqual(table, { tableName: 'BENEFICIARIOS', schema: 'dbo' });
      assert.equal(options.transaction, tx);
      return columns;
    },
    removeColumn: async (table, name, options) => {
      assert.equal(table.tableName, 'BENEFICIARIOS');
      assert.equal(options.transaction, tx);
      removed.push(name);
    },
    addColumn: async (table, name, definition, options) => {
      assert.equal(table.tableName, 'BENEFICIARIOS');
      assert.equal(options.transaction, tx);
      added.push({ name, definition });
    },
  };
  return { qi, removed, added };
}

test('migracion retira solo campos legacy existentes dentro de transaccion', async () => {
  const { qi, removed } = migrationInterface({ status: {}, statusFicha: {}, email_ben: {}, email: {}, rut_ben: {} });
  await migration.up(qi);
  assert.deepEqual(removed, ['status', 'statusFicha', 'email_ben', 'email']);
  const empty = migrationInterface({ rut_ben: {} });
  await migration.up(empty.qi);
  assert.deepEqual(empty.removed, []);
});

test('rollback restaura esquema legacy conocido y migracion propia conserva campos', async () => {
  const { qi, added } = migrationInterface({ rut_ben: {} });
  await migration.down(qi);
  assert.deepEqual(added.map((field) => field.name), ['status', 'statusFicha', 'email_ben']);
  assert.equal(added[0].definition.defaultValue, 1);
  assert.equal(added[1].definition.defaultValue, 2);
  let fields;
  await createMigration.up({ createTable: async (table, columns) => {
    assert.equal(table.tableName, 'beneficiarios_proempleo');
    fields = columns;
  } });
  assert.ok(fields.email);
  assert.equal(fields.status.defaultValue, 1);
  assert.equal(fields.statusFicha.defaultValue, 2);
});
