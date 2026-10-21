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
  mock.method(UsuarioSicapModel, 'count', async () => 0);
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

test('usuarios se paginan de 20 en 20 por region descendente con desempate estable', async () => {
  const count = mock.method(UsuarioSicapModel, 'count', async () => 45);
  const rows = Array.from({ length: 20 }, (_, i) => ({ rut_usu: i + 21 }));
  const find = mock.method(UsuarioSicapModel, 'findAll', async () => rows);
  const response = await service.listar(2);
  assert.deepEqual(response, {
    data: rows, pagination: { page: 2, limit: 20, total: 45, totalPages: 3 },
  });
  const options = find.mock.calls[0].arguments[0];
  assert.equal(options.limit, 20);
  assert.equal(options.offset, 20);
  assert.deepEqual(options.order, [['reg_usu', 'DESC'], ['nom_usu', 'ASC'], ['rut_usu', 'ASC']]);
  assert.deepEqual(options.where, count.mock.calls[0].arguments[0].where);
  assert.equal(options.where.corr_rol[require('sequelize').Op.in].length, 3);
});

test('usuarios ajusta paginas fuera de rango y admite una lista vacia', async () => {
  const count = mock.method(UsuarioSicapModel, 'count', async () => 45);
  const find = mock.method(UsuarioSicapModel, 'findAll', async () => []);
  let response = await service.listar(100);
  assert.deepEqual(response.pagination, { page: 3, limit: 20, total: 45, totalPages: 3 });
  assert.equal(find.mock.calls[0].arguments[0].offset, 40);
  count.mock.mockImplementation(async () => 0);
  response = await service.listar();
  assert.deepEqual(response, {
    data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });
  assert.equal(find.mock.calls[1].arguments[0].offset, 0);
});

test('paginacion de usuarios valida pagina positiva entera y usa pagina uno por defecto', () => {
  assert.equal(schemas.listarUsuariosSchema.parse({ query: {} }).query.page, 1);
  assert.equal(schemas.listarUsuariosSchema.parse({ query: { page: '2' } }).query.page, 2);
  for (const page of ['0', '-1', '1.5', 'abc', '', '9007199254740992']) {
    assert.equal(schemas.listarUsuariosSchema.safeParse({ query: { page } }).success, false);
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
    reg_usu: 8, corr_rol: 100, usu_cre: 'admin', ema_usu: 'test@example.com',
  });
  assert.equal(create.mock.calls[0].arguments[0].est_usu, 'ACTIVO');
  assert.equal(create.mock.calls[0].arguments[0].fec_cre.fn, 'GETDATE');
  assert.equal(create.mock.calls[0].arguments[0].ema_usu, 'test@example.com');
  await repository.actualizarDatosPersonales(12345678, { dir_usu: 'Direccion', ciu_usu: 1, com_usu: 2 });
  await repository.cambiarClave(12345678, 'test-new-value');
  assert.equal(update.mock.callCount(), 2);
  for (const call of update.mock.calls) {
    assert.equal(call.arguments[0].fec_mod.fn, 'GETDATE');
    assert.deepEqual(call.arguments[1].where, { rut_usu: 12345678 });
  }
});

test('validaciones rechazan valores que exceden varchar(50)', () => {
  const create = { rut: '12345678-5', nom_usu: 'Ana', pat_usu: 'Perez', mat_usu: 'Soto', reg_usu: 8, corr_rol: 100, ema_usu: 'test@example.com' };
  for (const field of ['nom_usu', 'pat_usu', 'mat_usu']) {
    assert.equal(schemas.crearUsuarioSchema.safeParse({ body: { ...create, [field]: 'a'.repeat(50) } }).success, true);
    assert.equal(schemas.crearUsuarioSchema.safeParse({ body: { ...create, [field]: 'a'.repeat(51) } }).success, false);
  }
  assert.equal(schemas.actualizarDatosPersonalesSchema.safeParse({ body: { dir_usu: 'a'.repeat(51) } }).success, false);
  assert.equal(schemas.crearUsuarioSchema.safeParse({ body: { ...create, ema_usu: `${'a'.repeat(45)}@test.com` } }).success, false);
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
    mat_usu: 'Soto', reg_usu: 8, corr_rol: 100, ema_usu: 'test@example.com',
  }, 1);
  assert.equal(exists.mock.callCount(), 2);
  for (const call of exists.mock.calls) assert.equal(call.arguments[0].length, 50);
  const generated = create.mock.calls[0].arguments[0].log_usu;
  assert.equal(generated.length, 50);
  assert.equal(generated.endsWith('2'), true);
  assert.equal(create.mock.calls[0].arguments[0].ema_usu, 'test@example.com');
});

test('crear usuario exige correo valido, recorta espacios y respeta el limite de 50 caracteres', () => {
  const body = { rut: '12345678-5', nom_usu: 'Ana', pat_usu: 'Perez', mat_usu: 'Soto', reg_usu: 8, corr_rol: 100 };
  for (const ema_usu of [undefined, null, '', '   ', 'correo-invalido']) {
    assert.equal(schemas.crearUsuarioSchema.safeParse({ body: { ...body, ema_usu } }).success, false);
  }
  const email = `${'a'.repeat(41)}@test.com`;
  assert.equal(email.length, 50);
  const parsed = schemas.crearUsuarioSchema.parse({ body: { ...body, ema_usu: ` ${email} ` } });
  assert.equal(parsed.body.ema_usu, email);
  assert.equal(schemas.crearUsuarioSchema.safeParse({ body: { ...body, ema_usu: `a${email}` } }).success, false);
});

test('perfil rechaza cualquier cambio de correo y permite actualizar los otros datos', () => {
  const body = { dir_usu: 'Direccion', ciu_usu: 1, com_usu: 2 };
  assert.deepEqual(schemas.actualizarDatosPersonalesSchema.parse({ body }).body, body);
  for (const ema_usu of ['nuevo@example.com', '', null]) {
    const result = schemas.actualizarDatosPersonalesSchema.safeParse({ body: { ...body, ema_usu } });
    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /no se puede modificar/);
  }
});

test('actualizar perfil conserva el correo existente y actualiza direccion, ciudad y comuna', async () => {
  const user = UsuarioSicapModel.build({
    rut_usu: 12345678, log_usu: 'ana', dig_usu: '5', nom_usu: 'Ana',
    pat_usu: 'Perez', cla_usu: 'test-value', ema_usu: 'original@example.com',
  });
  mock.method(repository, 'findByRut', async () => user);
  const update = mock.method(UsuarioSicapModel, 'update', async (data) => {
    user.set(data);
    return [1];
  });
  const result = await service.actualizarPerfil(12345678, { dir_usu: 'Direccion', ciu_usu: 1, com_usu: 2 });
  assert.equal(result.ema_usu, 'original@example.com');
  assert.equal(result.dir_usu, 'Direccion');
  assert.equal(result.ciu_usu, 1);
  assert.equal(result.com_usu, 2);
  assert.equal(Object.hasOwn(update.mock.calls[0].arguments[0], 'ema_usu'), false);
});

test('repositorio de perfil no persiste correo aunque reciba un campo adicional', async () => {
  const update = mock.method(UsuarioSicapModel, 'update', async () => [1]);
  await repository.actualizarDatosPersonales(12345678, {
    dir_usu: 'Direccion', ciu_usu: 1, com_usu: 2, ema_usu: 'nuevo@example.com',
  });
  assert.equal(Object.hasOwn(update.mock.calls[0].arguments[0], 'ema_usu'), false);
});
