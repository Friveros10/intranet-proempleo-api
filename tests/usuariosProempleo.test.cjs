const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

process.env.DOTENV_CONFIG_PATH = '__usuarios_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'usuarios-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'usuarios-test';

const { sequelize } = require('../src/database/sequelize');
const { UsuarioSicapModel, toSafeUsuarioSicap } = require('../src/models/UsuarioSicap.model');
const { RolSicapModel } = require('../src/models/RolSicap.model');
const { usuarioSicapRepository: repository } = require('../src/repositories/sicap/usuarioSicap.repository');
const { usuarioService: service } = require('../src/services/usuario.service');
const { registrarAsociaciones } = require('../src/database/sicapAssociations');
const schemas = require('../src/validations/usuario.validation');
const migration = require('../migrations/202610070003-create-users-proempleo');

registrarAsociaciones();
afterEach(() => mock.restoreAll());

const expected = {
  rut_usu: ['INTEGER', false], log_usu: ['VARCHAR(50)', false],
  dig_usu: ['VARCHAR(1)', false], niv_usu: ['INTEGER', true],
  nom_usu: ['VARCHAR(50)', false], pat_usu: ['VARCHAR(50)', false],
  cla_usu: ['VARCHAR(50)', false], mat_usu: ['VARCHAR(50)', true],
  dir_usu: ['VARCHAR(50)', true], reg_usu: ['INTEGER', true],
  ciu_usu: ['INTEGER', true], com_usu: ['INTEGER', true],
  usu_cre: ['VARCHAR(50)', true], fec_cre: ['DATETIME', true],
  usu_mod: ['VARCHAR(50)', true], fec_mod: ['DATETIME', true],
  usu_eli: ['VARCHAR(50)', true], fec_eli: ['DATETIME', true],
  corr_rol: ['INTEGER', true], ema_usu: ['VARCHAR(50)', true],
  cla2_usu: ['VARBINARY(MAX)', true], est_usu: ['VARCHAR(15)', true],
  fec_cad_pass: ['DATETIME', true],
};

function verifyColumns(columns) {
  assert.deepEqual(Object.keys(columns), Object.keys(expected));
  for (const [name, [type, nullable]] of Object.entries(expected)) {
    assert.equal(String(columns[name].type), type, name);
    assert.equal(columns[name].allowNull, nullable, name);
    assert.equal(columns[name].defaultValue, undefined, name);
  }
  assert.equal(columns.rut_usu.primaryKey, true);
  assert.notEqual(columns.rut_usu.autoIncrement, true);
}

test('tabla y modelo contienen exactamente los 23 campos, tipos y nulabilidad de la imagen', async () => {
  let columns;
  await migration.up({
    createTable: async (table, fields) => {
      assert.deepEqual(table, { tableName: 'users_proempleo', schema: 'dbo' });
      columns = fields;
    },
  });
  verifyColumns(columns);
  verifyColumns(UsuarioSicapModel.getAttributes());
  assert.equal(UsuarioSicapModel.tableName, 'users_proempleo');
  assert.equal(UsuarioSicapModel.options.timestamps, false);
  const generator = sequelize.getQueryInterface().queryGenerator;
  const sql = generator.createTableQuery(
    { tableName: 'users_proempleo', schema: 'dbo' },
    generator.attributesToSQL(columns),
    {},
  );
  assert.match(sql, /\[cla2_usu\] VARBINARY\(MAX\) NULL/);
  assert.match(sql, /\[fec_cre\] DATETIME NULL/);
  assert.match(sql, /\[log_usu\] VARCHAR\(50\) NOT NULL/);
  assert.doesNotMatch(sql, /NVARCHAR|DATETIMEOFFSET|IDENTITY/);
});

test('rollback elimina exclusivamente users_proempleo', async () => {
  let dropped;
  await migration.down({ dropTable: async (table) => { dropped = table; } });
  assert.deepEqual(dropped, { tableName: 'users_proempleo', schema: 'dbo' });
});

test('reemplazo no declara FK legacy y la asociacion de solicitante queda sin constraints', async () => {
  const reemplazoMigration = require('../migrations/202609150001-create-reemplazo-benpro');
  let fields;
  await reemplazoMigration.up({
    createTable: async (table, columns) => {
      assert.deepEqual(table, { tableName: 'Reemplazo_benpro', schema: 'dbo' });
      fields = columns;
    },
  });
  // Ninguna columna debe referenciar tablas legacy (BENEFICIARIOS, PROYECTOS, Usuario)
  for (const [name, definition] of Object.entries(fields)) {
    assert.equal(definition.references, undefined, name);
  }
  assert.ok(fields.rutUsuarioSolicitante);
  const { ReemplazoBenProyectoModel } = require('../src/models/ReemplazoBenProyecto.model');
  assert.equal(ReemplazoBenProyectoModel.associations.usuarioSolicitante.target, UsuarioSicapModel);
  assert.equal(ReemplazoBenProyectoModel.associations.usuarioSolicitante.options.constraints, false);
});

test('login, listados y perfil consultan tabla nueva con asociaciones existentes', async () => {
  const query = mock.method(sequelize, 'query', async (_sql, options) => options.plain ? null : []);
  await repository.findByLogin('login-test');
  await repository.findByRut(12345678);
  await repository.findAllPerfilesValidos();
  for (const call of query.mock.calls) {
    const sql = call.arguments[0];
    assert.match(sql, /\[dbo\]\.\[users_proempleo\]/);
    assert.doesNotMatch(sql, /\[dbo\]\.\[Usuario\]/);
    assert.match(sql, /LEFT OUTER JOIN \[dbo\]\.\[ROLES_proempleo\]/);
  }
});

test('validacion NOT NULL exige los campos requeridos y admite datos binarios', async () => {
  const user = UsuarioSicapModel.build({
    rut_usu: 12345678, log_usu: 'ana', dig_usu: '5',
    nom_usu: 'Ana', pat_usu: 'Perez', cla_usu: 'test-value',
    niv_usu: 1, cla2_usu: Buffer.from([1, 2, 3]),
  });
  await user.validate();
  assert.ok(Buffer.isBuffer(user.cla2_usu));
  await assert.rejects(UsuarioSicapModel.build({ rut_usu: 12345678 }).validate(), /notNull Violation/);
  const safe = toSafeUsuarioSicap(user.get({ plain: true }));
  assert.equal(safe.niv_usu, 1);
  assert.equal('cla_usu' in safe, false);
  assert.equal('cla2_usu' in safe, false);
});

test('escrituras existentes usan modelo nuevo y GETDATE para datetime', async () => {
  const create = mock.method(UsuarioSicapModel, 'create', async (data) => data);
  const update = mock.method(UsuarioSicapModel, 'update', async () => [1]);
  await repository.crear({
    rut_usu: 12345678, log_usu: 'ana', dig_usu: '5', nom_usu: 'Ana',
    pat_usu: 'Perez', mat_usu: 'Soto', cla_usu: 'test-value',
    reg_usu: 8, corr_rol: 100, usu_cre: 'admin',
  });
  assert.equal(create.mock.calls[0].arguments[0].est_usu, 'ACTIVO');
  assert.equal(create.mock.calls[0].arguments[0].fec_cre.fn, 'GETDATE');
  await repository.actualizarDatosPersonales(12345678, { dir_usu: 'Direccion', ciu_usu: 1, com_usu: 2, ema_usu: 'test@example.com' });
  await repository.cambiarClave(12345678, 'test-new-value');
  assert.equal(update.mock.callCount(), 2);
  for (const call of update.mock.calls) {
    assert.equal(call.arguments[0].fec_mod.fn, 'GETDATE');
    assert.deepEqual(call.arguments[1].where, { rut_usu: 12345678 });
  }
});

test('validaciones rechazan valores que exceden varchar(50)', () => {
  const create = { rut: '12345678-5', nom_usu: 'Ana', pat_usu: 'Perez', mat_usu: 'Soto', reg_usu: 8, corr_rol: 100 };
  for (const field of ['nom_usu', 'pat_usu', 'mat_usu']) {
    assert.equal(schemas.crearUsuarioSchema.safeParse({ body: { ...create, [field]: 'a'.repeat(50) } }).success, true);
    assert.equal(schemas.crearUsuarioSchema.safeParse({ body: { ...create, [field]: 'a'.repeat(51) } }).success, false);
  }
  assert.equal(schemas.actualizarDatosPersonalesSchema.safeParse({ body: { dir_usu: 'a'.repeat(51) } }).success, false);
  assert.equal(schemas.actualizarDatosPersonalesSchema.safeParse({ body: { ema_usu: `${'a'.repeat(45)}@test.com` } }).success, false);
  assert.equal(schemas.cambiarClaveSchema.safeParse({ body: { claveActual: 'test', claveNueva: 'a'.repeat(51), claveNuevaConfirmacion: 'a'.repeat(51) } }).success, false);
});

test('login generado respeta 50 caracteres incluso con sufijo por colision', async () => {
  mock.method(repository, 'findByRut', async () => null);
  mock.method(RolSicapModel, 'findByPk', async () => ({ corr_rol: 100 }));
  let checks = 0;
  const exists = mock.method(repository, 'existeLogin', async () => ++checks === 1);
  const create = mock.method(repository, 'crear', async () => {});
  await service.crear({
    rut: '12345678-5', nom_usu: 'Ana', pat_usu: 'p'.repeat(50),
    mat_usu: 'Soto', reg_usu: 8, corr_rol: 100,
  }, 1);
  assert.equal(exists.mock.callCount(), 2);
  for (const call of exists.mock.calls) assert.equal(call.arguments[0].length, 50);
  const generated = create.mock.calls[0].arguments[0].log_usu;
  assert.equal(generated.length, 50);
  assert.equal(generated.endsWith('2'), true);
});
