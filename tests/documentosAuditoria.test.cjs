const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

// Estas pruebas nunca se conectan a la base configurada en el entorno.
process.env.DOTENV_CONFIG_PATH = '__auditoria_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'auditoria-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'auditoria-test';

const { sequelize } = require('../src/database/sequelize');
const { Op } = require('sequelize');
const { DocumentoAuditoriaModel } = require('../src/models/DocumentoAuditoria.model');
const { documentoAuditoriaService: service } = require('../src/services/documentoAuditoria.service');
const { documentoAuditoriaRepository: repository } = require('../src/repositories/documentoAuditoria.repository');
const { usuarioSicapRepository: usuarios } = require('../src/repositories/sicap/usuarioSicap.repository');
const { regionRepository: regiones } = require('../src/repositories/sicap/region.repository');
const { auditLogRepository: audit } = require('../src/repositories/auditLog.repository');
const files = require('../src/utils/archivosAuditoria');
const schemas = require('../src/validations/documentoAuditoria.validation');
const { puedeVerTodasRegionesAuditoria } = require('../src/constants/documentosAuditoria');
const migration = require('../migrations/202610060001-create-documentos-auditoria');

const data = {
  rut: '12.345.678-5', nombres: 'Ana', apellidoPaterno: 'Perez',
  apellidoMaterno: 'Soto', ong: 'ONG Test', comuna: 'Concepción',
};
const pdf = {
  originalname: 'documento.pdf', mimetype: 'application/pdf',
  buffer: Buffer.from('%PDF-1.7\ncontenido de prueba'), size: 31,
};
function req(roles = ['INTENDENCIA']) {
  return { user: { sub: '12345678', roles } };
}
function ficha(overrides = {}) {
  return DocumentoAuditoriaModel.build({
    id: 1, RUT: 12345678, dv: '5', nombres: 'Ana', apellidoPaterno: 'Perez',
    apellidoMaterno: 'Soto', ong: 'ONG Test', comuna: 'Concepción', idRegion: 8,
    certCotizacionesUrl: '/api/documentos-auditoria/1/documentos/certCotizaciones/certCotizaciones-abcd.pdf',
    liquidacionUrl: '/api/documentos-auditoria/1/documentos/liquidacion/liquidacion-abcd.pdf',
    certCotizacionesNombre: 'cert.pdf', liquidacionNombre: 'liq.pdf',
    estadoCert: 'pendiente', estadoLiquidacion: 'pendiente',
    created_usr: 12345678, updated_usr: 12345678, ...overrides,
  });
}
function perfil(region = 8) {
  mock.method(usuarios, 'findByRut', async () => ({ reg_usu: region }));
}
function transaction() {
  const tx = { test: true };
  mock.method(sequelize, 'transaction', async (callback) => callback(tx));
  return tx;
}
afterEach(() => mock.restoreAll());

test('migracion contiene todos los campos, defaults, checks e indice regional', async () => {
  let columns;
  const checks = [];
  const indexes = [];
  await migration.up({
    createTable: async (table, fields) => {
      assert.deepEqual(table, { tableName: 'documentos_auditoria', schema: 'dbo' });
      columns = fields;
    },
    addConstraint: async (_table, constraint) => checks.push(constraint),
    addIndex: async (_table, fields) => indexes.push(fields),
  });
  assert.deepEqual(Object.keys(columns), [
    'id', 'RUT', 'dv', 'nombres', 'apellidoPaterno', 'apellidoMaterno', 'ong',
    'idComuna', 'idRegion', 'certCotizacionesUrl', 'liquidacionUrl',
    'certCotizacionesNombre', 'liquidacionNombre', 'estadoCert', 'estadoLiquidacion',
    'comentarioCert', 'comentarioLiquidacion', 'created_at', 'updated_at', 'deleted_at',
    'created_usr', 'updated_usr', 'deleted_usr',
  ]);
  assert.equal(columns.id.autoIncrement, true);
  assert.equal(columns.estadoCert.defaultValue, 'pendiente');
  assert.equal(columns.estadoLiquidacion.defaultValue, 'pendiente');
  assert.equal(checks.length, 2);
  assert.deepEqual(checks[0].where.estadoCert, ['pendiente', 'rechazado', 'aprobado']);
  assert.deepEqual(indexes, [['idRegion', 'deleted_at']]);
});

test('valida ficha y no acepta region suministrada por el cliente', () => {
  const parsed = schemas.crearDocumentoAuditoriaSchema.parse({ body: { ...data, nombres: ' Ana ', comuna: ' Concepción ' } });
  assert.equal(parsed.body.nombres, 'Ana');
  assert.equal(parsed.body.comuna, 'Concepción');
  assert.equal(schemas.crearDocumentoAuditoriaSchema.safeParse({ body: { ...data, idComuna: 101 } }).success, false);
  for (const comuna of [undefined, null, 101, '', ' ', 'a'.repeat(256)]) {
    assert.equal(schemas.crearDocumentoAuditoriaSchema.safeParse({ body: { ...data, comuna } }).success, false);
  }
  assert.equal(schemas.crearDocumentoAuditoriaSchema.safeParse({ body: { ...data, comuna: 'a'.repeat(255) } }).success, true);
  assert.equal(schemas.crearDocumentoAuditoriaSchema.safeParse({ body: { ...data, idRegion: 5 } }).success, false);
  assert.equal(schemas.crearDocumentoAuditoriaSchema.safeParse({ body: { ...data, rut: 'abc' } }).success, false);
  assert.equal(schemas.crearDocumentoAuditoriaSchema.safeParse({ body: { ...data, rut: '123456-0' } }).success, true);
  assert.equal(schemas.crearDocumentoAuditoriaSchema.safeParse({ body: { ...data, ong: ' ' } }).success, false);
});

test('rechazo exige comentario, params conservan filename y validan id/tipo', () => {
  const params = { id: '1', tipo: 'certCotizaciones', filename: 'certCotizaciones-abcd.pdf' };
  assert.equal(schemas.documentoAuditoriaParamsSchema.parse({ params }).params.filename, params.filename);
  assert.equal(schemas.documentoAuditoriaParamsSchema.safeParse({ params: { id: '0', tipo: 'certCotizaciones' } }).success, false);
  assert.equal(schemas.documentoAuditoriaParamsSchema.safeParse({ params: { id: '1', tipo: 'otro' } }).success, false);
  assert.equal(schemas.estadoDocumentoAuditoriaSchema.safeParse({ params, body: { status: 'rechazado', comentario: ' ' } }).success, false);
  assert.equal(schemas.estadoDocumentoAuditoriaSchema.safeParse({ params, body: { status: 'aprobado' } }).success, true);
});

test('listado regional ignora region solicitada y global admite filtro', async () => {
  perfil();
  const spy = mock.method(repository, 'listar', async () => []);
  await service.listar(5, req(), 2, 'ONG Test', '12345678-5');
  assert.equal(spy.mock.calls[0].arguments[0], 8);
  assert.equal(spy.mock.calls[0].arguments[1], 2);
  assert.equal(spy.mock.calls[0].arguments[2], 'ONG Test');
  assert.equal(spy.mock.calls[0].arguments[3], '12345678-5');
  await service.listar(5, req(['MINISTERIO']));
  assert.equal(spy.mock.calls[1].arguments[0], 5);
  await service.listar(undefined, req(['ADMIN']));
  assert.equal(spy.mock.calls[2].arguments[0], undefined);
  assert.equal(puedeVerTodasRegionesAuditoria(['INTENDENCIA']), false);
});

test('perfil sin region falla explicitamente y no lista globalmente', async () => {
  perfil(null);
  const spy = mock.method(repository, 'listar', async () => []);
  await assert.rejects(service.listar(undefined, req()), { statusCode: 403 });
  assert.equal(spy.mock.callCount(), 0);
});

test('lectura de documentos aplica region y excluye inexistentes', async () => {
  perfil();
  const spy = mock.method(repository, 'obtener', async () => ficha({ idRegion: 5 }));
  await assert.rejects(service.obtenerVisible(1, req()), { statusCode: 403 });
  assert.equal((await service.obtenerVisible(1, req(['MINISTERIO']))).idRegion, 5);
  spy.mock.mockImplementation(async () => null);
  await assert.rejects(service.obtenerVisible(1, req()), { statusCode: 404 });
});

test('query de listado excluye borrados y parametriza region', async () => {
  const rows = Array.from({ length: 50 }, (_, index) => ({ id: index + 51 }));
  const spy = mock.method(sequelize, 'query', async (sql) =>
    sql.includes('COUNT(*)') ? [{ total: 101 }] : sql.includes('SELECT DISTINCT') ? [{ ong: 'ONG Test' }] : rows);
  const response = await repository.listar(8, 2);
  const [sql, options] = spy.mock.calls[0].arguments;
  assert.match(sql, /deleted_at IS NULL/);
  assert.match(sql, /a.idRegion = :region/);
  assert.doesNotMatch(sql, /idComuna|nombreComuna|JOIN dbo\.COMUNAS/);
  assert.match(sql, /ORDER BY a.created_at DESC, a.id DESC/);
  assert.match(sql, /OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY/);
  assert.deepEqual(options.replacements, { region: 8, ong: undefined, rutNumero: undefined, dv: undefined, offset: 50, limit: 50 });
  const [countSql, countOptions] = spy.mock.calls[1].arguments;
  assert.match(countSql, /deleted_at IS NULL/);
  assert.match(countSql, /a.idRegion = :region/);
  assert.deepEqual(countOptions.replacements, { region: 8, ong: undefined, rutNumero: undefined, dv: undefined });
  assert.deepEqual(response, {
    data: rows, ejecutores: ['ONG Test'], pagination: { page: 2, limit: 50, total: 101, totalPages: 3 },
  });
});

test('paginacion valida pagina y usa primera por defecto', () => {
  assert.equal(schemas.listarDocumentoAuditoriaSchema.parse({ query: {} }).query.page, 1);
  assert.equal(schemas.listarDocumentoAuditoriaSchema.parse({ query: { page: '3' } }).query.page, 3);
  for (const page of ['0', '-1', '1.5', 'abc', '', 'Infinity', '42949674']) {
    assert.equal(schemas.listarDocumentoAuditoriaSchema.safeParse({ query: { page } }).success, false);
  }
});

test('paginacion sin region admite vacio y pagina fuera de rango', async () => {
  const spy = mock.method(sequelize, 'query', async (sql) =>
    sql.includes('COUNT(*)') ? [{ total: 0 }] : []);
  const response = await repository.listar(undefined, 3);
  assert.deepEqual(response, {
    data: [], ejecutores: [], pagination: { page: 3, limit: 50, total: 0, totalPages: 1 },
  });
  assert.doesNotMatch(spy.mock.calls[0].arguments[0], /a.idRegion = :region/);
  assert.doesNotMatch(spy.mock.calls[1].arguments[0], /a.idRegion = :region/);
  assert.equal(spy.mock.calls[0].arguments[1].replacements.offset, 100);
});

test('filtros ONG y RUT se validan y normalizan sin aceptar entradas invalidas', () => {
  const parse = (query) => schemas.listarDocumentoAuditoriaSchema.parse({ query }).query;
  assert.equal(parse({ ong: ' ONG Test ' }).ong, 'ONG Test');
  assert.equal(parse({ rut: '12.345.678-k' }).rut, '12345678-K');
  assert.equal(parse({ rut: '12.345.678' }).rut, '12345678');
  assert.equal(parse({ rut: '12345678' }).rut, '12345678');
  for (const ong of ['', ' ', 'a'.repeat(256), ['ONG']]) {
    assert.equal(schemas.listarDocumentoAuditoriaSchema.safeParse({ query: { ong } }).success, false);
  }
  for (const rut of ['', 'abc', '123-XX', '0', '123456789', "123' OR 1=1", ['123']]) {
    assert.equal(schemas.listarDocumentoAuditoriaSchema.safeParse({ query: { rut } }).success, false);
  }
});

test('filtra ONG y RUT en datos y conteo, opciones usan toda la region sin paginacion', async () => {
  const ong = "Fundación O'Higgins";
  const spy = mock.method(sequelize, 'query', async (sql) =>
    sql.includes('COUNT(*)') ? [{ total: 1 }] :
      sql.includes('SELECT DISTINCT') ? [{ ong }, { ong: 'Otra ONG' }] : [{ id: 1 }]);
  const response = await repository.listar(8, 1, ong, '12345678-K');
  for (const call of spy.mock.calls.slice(0, 2)) {
    const [sql, options] = call.arguments;
    assert.match(sql, /LTRIM\(RTRIM\(a.ong\)\) = :ong/);
    assert.match(sql, /a.RUT = :rutNumero/);
    assert.match(sql, /a.dv = :dv/);
    assert.equal(sql.includes(ong), false);
    assert.equal(options.replacements.ong, ong);
    assert.equal(options.replacements.rutNumero, 12345678);
    assert.equal(options.replacements.dv, 'K');
  }
  const [sql, options] = spy.mock.calls[2].arguments;
  assert.match(sql, /SELECT DISTINCT/);
  assert.match(sql, /a.idRegion = :region/);
  assert.match(sql, /deleted_at IS NULL/);
  assert.doesNotMatch(sql, /:ong|:rutNumero|:dv|OFFSET/);
  assert.deepEqual(options.replacements, { region: 8 });
  assert.deepEqual(response.ejecutores, [ong, 'Otra ONG']);
  assert.equal(response.pagination.total, 1);
});

test('filtro por cuerpo RUT no exige digito verificador', async () => {
  const spy = mock.method(sequelize, 'query', async (sql) =>
    sql.includes('COUNT(*)') ? [{ total: 0 }] : []);
  await repository.listar(undefined, 1, undefined, '12345678');
  assert.match(spy.mock.calls[0].arguments[0], /a.RUT = :rutNumero/);
  assert.doesNotMatch(spy.mock.calls[0].arguments[0], /a.dv = :dv/);
});

test('creacion separa RUT/dv, usa region del perfil y audita en misma transaccion', async () => {
  perfil();
  const comunas = mock.method(regiones, 'findComunasByRegion', async () => {
    throw new Error('No debe consultar el catalogo de comunas');
  });
  const tx = transaction();
  const row = ficha();
  const create = mock.method(DocumentoAuditoriaModel, 'create', async () => row);
  const update = mock.method(row, 'update', async () => row);
  const log = mock.method(audit, 'registrar', async () => ({}));
  mock.method(files, 'guardarPdfAuditoria', (id, tipo) => `/api/documentos-auditoria/${id}/documentos/${tipo}/${tipo}-abcd.pdf`);
  await service.crear(data, { certCotizaciones: pdf, liquidacion: pdf }, req());
  const [insert, options] = create.mock.calls[0].arguments;
  assert.equal(insert.RUT, 12345678);
  assert.equal(insert.dv, '5');
  assert.equal(insert.idRegion, 8);
  assert.equal(insert.comuna, 'Concepción');
  assert.equal(Object.hasOwn(insert, 'idComuna'), false);
  assert.equal(comunas.mock.callCount(), 0);
  assert.equal(insert.created_usr, 12345678);
  assert.equal(options.transaction, tx);
  assert.match(update.mock.calls[0].arguments[0].liquidacionUrl, /liquidacion-abcd.pdf$/);
  assert.equal(log.mock.calls[0].arguments[0].transaction, tx);
});

test('modelo almacena comuna textual sin idComuna', () => {
  const atributos = DocumentoAuditoriaModel.getAttributes();
  assert.equal(atributos.comuna.type.key, 'STRING');
  assert.equal(atributos.comuna.type.options.length, 255);
  assert.equal(atributos.comuna.allowNull, false);
  assert.equal(Object.hasOwn(atributos, 'idComuna'), false);
  assert.equal(ficha().comuna, 'Concepción');
});

test('catalogos conserva region del perfil sin consultar comunas', async () => {
  perfil();
  mock.method(regiones, 'findAll', async () => [
    { cod_region: 8, nom_region: 'Biobío' },
    { cod_region: 5, nom_region: 'Valparaíso' },
  ]);
  const comunas = mock.method(regiones, 'findComunasByRegion', async () => {
    throw new Error('No debe consultar el catalogo de comunas');
  });
  const result = await service.catalogos(req());
  assert.equal(result.idRegion, 8);
  assert.deepEqual(result.regiones.map((region) => region.cod_region), [8]);
  assert.equal(Object.hasOwn(result, 'comunas'), false);
  assert.equal(comunas.mock.callCount(), 0);
});

test('si falla segundo archivo se limpia primero y se propaga error', async () => {
  perfil();
  transaction();
  mock.method(DocumentoAuditoriaModel, 'create', async () => ficha());
  mock.method(files, 'guardarPdfAuditoria', (_id, tipo) => {
    if (tipo === 'liquidacion') throw new Error('disco lleno');
    return '/cert.pdf';
  });
  const cleanup = mock.method(files, 'eliminarPdfAuditoria', () => {});
  await assert.rejects(service.crear(data, { certCotizaciones: pdf, liquidacion: pdf }, req()), /disco lleno/);
  assert.deepEqual(cleanup.mock.calls[0].arguments, [1, '/cert.pdf']);
});

test('rechazo modifica solo documento seleccionado y exige pendiente en update', async () => {
  transaction();
  const row = ficha();
  mock.method(repository, 'obtener', async () => row);
  mock.method(row, 'reload', async () => row);
  const update = mock.method(DocumentoAuditoriaModel, 'update', async () => [1]);
  mock.method(audit, 'registrar', async () => ({}));
  await service.actualizarEstado(1, 'liquidacion', { status: 'rechazado', comentario: 'Ilegible' }, req(['MINISTERIO']));
  const [values, options] = update.mock.calls[0].arguments;
  assert.equal(values.estadoLiquidacion, 'rechazado');
  assert.equal(values.comentarioLiquidacion, 'Ilegible');
  assert.equal(values.estadoCert, undefined);
  assert.deepEqual(options.where, {
    id: 1, estadoLiquidacion: { [Op.in]: ['pendiente', 'subidos'] },
    liquidacionUrl: row.liquidacionUrl,
  });
});

test('carga inicial de ficha importada guarda PDF sin intentar borrar ruta vacia', async () => {
  perfil();
  transaction();
  const row = ficha({ certCotizacionesUrl: '', certCotizacionesNombre: '' });
  mock.method(repository, 'obtener', async () => row);
  mock.method(row, 'reload', async () => row);
  mock.method(files, 'guardarPdfAuditoria', () => '/nuevo.pdf');
  const update = mock.method(DocumentoAuditoriaModel, 'update', async () => [1]);
  const cleanup = mock.method(files, 'eliminarPdfAuditoria', () => {});
  const log = mock.method(audit, 'registrar', async () => ({}));
  await service.reemplazar(1, 'certCotizaciones', pdf, req());
  const [values, options] = update.mock.calls[0].arguments;
  assert.equal(values.certCotizacionesUrl, '/nuevo.pdf');
  assert.equal(values.estadoCert, 'pendiente');
  assert.equal(values.comentarioCert, null);
  assert.deepEqual(options.where, { id: 1, estadoCert: 'pendiente', certCotizacionesUrl: '' });
  assert.equal(cleanup.mock.callCount(), 0);
  assert.equal(log.mock.calls[0].arguments[0].accion, 'DOCUMENTO_CARGADO');
});

function prepararGuardado(overrides = {}) {
  perfil();
  const tx = transaction();
  const row = ficha({ certCotizacionesUrl: '', liquidacionUrl: '', ...overrides });
  mock.method(repository, 'obtener', async () => row);
  mock.method(row, 'reload', async () => row);
  const store = mock.method(files, 'guardarPdfAuditoria', (_id, tipo) => `/nuevo-${tipo}.pdf`);
  const cleanup = mock.method(files, 'eliminarPdfAuditoria', () => {});
  const update = mock.method(DocumentoAuditoriaModel, 'update', async () => [1]);
  const log = mock.method(audit, 'registrar', async () => ({}));
  return { tx, row, store, cleanup, update, log };
}

test('Guardar carga ambos PDF con una actualizacion y audita en la misma transaccion', async () => {
  const { tx, update, cleanup, log } = prepararGuardado({
    certCotizacionesUrl: '', liquidacionUrl: '', estadoLiquidacion: 'rechazado',
  });
  await service.guardarDocumentos(1, { certCotizaciones: pdf, liquidacion: pdf }, req());
  assert.equal(update.mock.callCount(), 1);
  const [values, options] = update.mock.calls[0].arguments;
  assert.equal(values.estadoCert, 'pendiente');
  assert.equal(values.estadoLiquidacion, 'pendiente');
  assert.equal(values.comentarioLiquidacion, null);
  assert.equal(values.certCotizacionesUrl, '/nuevo-certCotizaciones.pdf');
  assert.equal(values.liquidacionUrl, '/nuevo-liquidacion.pdf');
  assert.equal(options.transaction, tx);
  assert.equal(log.mock.calls[0].arguments[0].transaction, tx);
  assert.equal(cleanup.mock.callCount(), 0);
});

test('Guardar conserva aprobados y solo carga el rechazado', async () => {
  const { update, row } = prepararGuardado({ estadoCert: 'aprobado', estadoLiquidacion: 'rechazado' });
  await service.guardarDocumentos(1, { liquidacion: pdf }, req());
  const [values, options] = update.mock.calls[0].arguments;
  assert.equal(Object.hasOwn(values, 'estadoCert'), false);
  assert.equal(Object.hasOwn(values, 'certCotizacionesUrl'), false);
  assert.equal(options.where.estadoCert, 'aprobado');
  assert.equal(options.where.certCotizacionesUrl, row.certCotizacionesUrl);
});

test('Guardar permite reemplazar subidos con PDF y conserva pendiente con archivo', async () => {
  const { update, store } = prepararGuardado({
    estadoCert: 'subidos', certCotizacionesUrl: '/subido.pdf',
    liquidacionUrl: '/pendiente.pdf',
  });
  await service.guardarDocumentos(1, { certCotizaciones: pdf }, req());
  const [values] = update.mock.calls[0].arguments;
  assert.equal(values.estadoCert, 'pendiente');
  assert.equal(values.certCotizacionesUrl, '/nuevo-certCotizaciones.pdf');
  assert.equal(Object.hasOwn(values, 'liquidacionUrl'), false);
  assert.equal(store.mock.callCount(), 1);
});

test('Guardar conserva pendiente con PDF y carga solo el documento faltante', async () => {
  const { update, store } = prepararGuardado({ certCotizacionesUrl: '/existente.pdf' });
  await service.guardarDocumentos(1, { liquidacion: pdf }, req());
  const [values] = update.mock.calls[0].arguments;
  assert.equal(Object.hasOwn(values, 'certCotizacionesUrl'), false);
  assert.equal(Object.hasOwn(values, 'estadoCert'), false);
  assert.equal(store.mock.callCount(), 1);
  await assert.rejects(service.guardarDocumentos(1, { certCotizaciones: pdf, liquidacion: pdf }, req()), { statusCode: 409 });
});

test('Guardar valida todos los PDF antes de escribir archivos', async () => {
  const { store, update } = prepararGuardado();
  await assert.rejects(service.guardarDocumentos(1, { certCotizaciones: pdf }, req()), { statusCode: 400 });
  await assert.rejects(service.guardarDocumentos(1, {
    certCotizaciones: pdf, liquidacion: { ...pdf, buffer: Buffer.from('falso') },
  }, req()), { statusCode: 400 });
  assert.equal(store.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
});

test('Guardar limpia archivos nuevos si falla segundo archivo y no borra anteriores', async () => {
  const { store, update, cleanup } = prepararGuardado();
  store.mock.mockImplementation((_id, tipo) => {
    if (tipo === 'liquidacion') throw new Error('disco lleno');
    return '/nuevo-cert.pdf';
  });
  await assert.rejects(service.guardarDocumentos(1, { certCotizaciones: pdf, liquidacion: pdf }, req()), /disco lleno/);
  assert.equal(update.mock.callCount(), 0);
  assert.deepEqual(cleanup.mock.calls.map((call) => call.arguments), [[1, '/nuevo-cert.pdf']]);
});

test('Guardar detecta concurrencia y elimina solo nuevos archivos', async () => {
  const { update, cleanup, log } = prepararGuardado();
  update.mock.mockImplementation(async () => [0]);
  await assert.rejects(service.guardarDocumentos(1, { certCotizaciones: pdf, liquidacion: pdf }, req()), { statusCode: 409 });
  assert.equal(log.mock.callCount(), 0);
  assert.deepEqual(cleanup.mock.calls.map((call) => call.arguments[1]), [
    '/nuevo-certCotizaciones.pdf', '/nuevo-liquidacion.pdf',
  ]);
});

test('Guardar rechaza reemplazo de aprobado y carga en otra region', async () => {
  const { store } = prepararGuardado({ estadoCert: 'aprobado' });
  await assert.rejects(service.guardarDocumentos(1, { certCotizaciones: pdf, liquidacion: pdf }, req()), { statusCode: 409 });
  assert.equal(store.mock.callCount(), 0);
  mock.method(repository, 'obtener', async () => ficha({ idRegion: 5 }));
  await assert.rejects(service.guardarDocumentos(1, { liquidacion: pdf }, req(['ADMIN', 'INTENDENCIA'])), { statusCode: 403 });
  assert.equal(store.mock.callCount(), 0);
});

test('no revisa documentos sin PDF ni reemplaza pendientes ya cargados', async () => {
  perfil();
  transaction();
  const lookup = mock.method(repository, 'obtener', async () => ficha({ certCotizacionesUrl: '' }));
  const update = mock.method(DocumentoAuditoriaModel, 'update', async () => [1]);
  await assert.rejects(service.actualizarEstado(1, 'certCotizaciones', { status: 'aprobado' }, req(['MINISTERIO'])), { statusCode: 409 });
  assert.equal(update.mock.callCount(), 0);
  lookup.mock.mockImplementation(async () => ficha());
  const store = mock.method(files, 'guardarPdfAuditoria', () => '/no.pdf');
  await assert.rejects(service.reemplazar(1, 'certCotizaciones', pdf, req()), { statusCode: 409 });
  assert.equal(store.mock.callCount(), 0);
});

test('carga inicial concurrente elimina nuevo archivo y propaga conflicto', async () => {
  perfil();
  transaction();
  mock.method(repository, 'obtener', async () => ficha({ certCotizacionesUrl: '' }));
  mock.method(files, 'guardarPdfAuditoria', () => '/nuevo.pdf');
  mock.method(DocumentoAuditoriaModel, 'update', async () => [0]);
  const cleanup = mock.method(files, 'eliminarPdfAuditoria', () => {});
  await assert.rejects(service.reemplazar(1, 'certCotizaciones', pdf, req()), { statusCode: 409 });
  assert.deepEqual(cleanup.mock.calls[0].arguments, [1, '/nuevo.pdf']);
});

test('revision concurrente no sobrescribe documento ya revisado', async () => {
  transaction();
  mock.method(repository, 'obtener', async () => ficha());
  mock.method(DocumentoAuditoriaModel, 'update', async () => [0]);
  const log = mock.method(audit, 'registrar', async () => ({}));
  await assert.rejects(service.actualizarEstado(1, 'certCotizaciones', { status: 'aprobado' }, req(['ADMIN'])), { statusCode: 409 });
  assert.equal(log.mock.callCount(), 0);
});

test('estadoUpload cambia pendiente con PDF a subidos y audita en misma transaccion', async () => {
  perfil();
  const tx = transaction();
  const row = ficha();
  mock.method(repository, 'obtener', async () => row);
  mock.method(row, 'reload', async () => row);
  const update = mock.method(DocumentoAuditoriaModel, 'update', async () => [1]);
  const log = mock.method(audit, 'registrar', async () => ({}));
  await service.actualizarEstadoUpload(1, 'certCotizaciones', { status: 'subidos' }, req());
  const [values, options] = update.mock.calls[0].arguments;
  assert.equal(values.estadoCert, 'subidos');
  assert.deepEqual(options.where, { id: 1, estadoCert: 'pendiente', certCotizacionesUrl: row.certCotizacionesUrl });
  assert.equal(options.transaction, tx);
  assert.equal(log.mock.calls[0].arguments[0].transaction, tx);
});

test('estadoUpload rechaza PDF ausente, rechazados, aprobados y conflictos concurrentes', async () => {
  perfil();
  transaction();
  const lookup = mock.method(repository, 'obtener', async () => ficha({ certCotizacionesUrl: '' }));
  const update = mock.method(DocumentoAuditoriaModel, 'update', async () => [0]);
  const log = mock.method(audit, 'registrar', async () => ({}));
  for (const overrides of [
    { certCotizacionesUrl: '' }, { estadoCert: 'rechazado' }, { estadoCert: 'aprobado' },
  ]) {
    lookup.mock.mockImplementation(async () => ficha(overrides));
    await assert.rejects(service.actualizarEstadoUpload(1, 'certCotizaciones', { status: 'subidos' }, req()), { statusCode: 409 });
  }
  assert.equal(update.mock.callCount(), 0);
  lookup.mock.mockImplementation(async () => ficha());
  await assert.rejects(service.actualizarEstadoUpload(1, 'certCotizaciones', { status: 'subidos' }, req()), { statusCode: 409 });
  assert.equal(log.mock.callCount(), 0);
});

test('estadoUpload valida cuerpo con estado exclusivo subidos', () => {
  const params = { id: '1', tipo: 'certCotizaciones' };
  assert.equal(schemas.estadoUploadDocumentoAuditoriaSchema.safeParse({ params, body: { status: 'subidos' } }).success, true);
  for (const body of [{}, { status: 'aprobado' }, { status: 'pendiente' }, { status: 'subidos', otro: true }]) {
    assert.equal(schemas.estadoUploadDocumentoAuditoriaSchema.safeParse({ params, body }).success, false);
  }
});

test('recarga rechazado limpia comentario, vuelve a pendiente y elimina anterior', async () => {
  perfil();
  transaction();
  const row = ficha({ estadoCert: 'rechazado' });
  mock.method(repository, 'obtener', async () => row);
  mock.method(row, 'reload', async () => row);
  mock.method(files, 'guardarPdfAuditoria', () => '/nuevo.pdf');
  const update = mock.method(DocumentoAuditoriaModel, 'update', async () => [1]);
  const cleanup = mock.method(files, 'eliminarPdfAuditoria', () => {});
  mock.method(audit, 'registrar', async () => ({}));
  await service.reemplazar(1, 'certCotizaciones', pdf, req());
  const [values, options] = update.mock.calls[0].arguments;
  assert.equal(values.estadoCert, 'pendiente');
  assert.equal(values.comentarioCert, null);
  assert.equal(values.certCotizacionesUrl, '/nuevo.pdf');
  assert.equal(values.estadoLiquidacion, undefined);
  assert.equal(options.where.certCotizacionesUrl, row.certCotizacionesUrl);
  assert.deepEqual(cleanup.mock.calls[0].arguments, [1, row.certCotizacionesUrl]);
});

test('no permite recargar aprobado ni archivos falsos o mayores de 10MB', async () => {
  perfil();
  transaction();
  mock.method(repository, 'obtener', async () => ficha({ estadoCert: 'aprobado' }));
  const store = mock.method(files, 'guardarPdfAuditoria', () => '/no-debe-guardar.pdf');
  await assert.rejects(service.reemplazar(1, 'certCotizaciones', pdf, req()), { statusCode: 409 });
  assert.equal(store.mock.callCount(), 0);
  assert.throws(() => files.validarPdfAuditoria({ ...pdf, buffer: Buffer.from('no es pdf') }), { statusCode: 400 });
  assert.throws(() => files.validarPdfAuditoria({ ...pdf, size: files.MAX_PDF_AUDITORIA + 1 }), { statusCode: 400 });
  assert.doesNotThrow(() => files.validarPdfAuditoria({ ...pdf, size: files.MAX_PDF_AUDITORIA }));
  assert.throws(() => files.rutaPdfAuditoria(1, '/api/documentos-auditoria/1/documentos/certCotizaciones/../../secret.pdf'), { statusCode: 400 });
});

test('HTTP aplica autenticacion, roles y validacion antes de invocar servicio', async () => {
  const express = require('express');
  const cookieParser = require('cookie-parser');
  const { signAccessToken } = require('../src/utils/jwt');
  const { env } = require('../src/config/env');
  const { errorHandler } = require('../src/middlewares/error.middleware');
  const router = require('../src/routes/documentoAuditoria.routes').default;
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api/documentos-auditoria', router);
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/documentos-auditoria`;
  const cookie = (role) => `${env.cookies.accessTokenName}=${signAccessToken({
    sub: '12345678', username: 'test', roles: [role],
  })}`;
  const headers = (role) => ({ cookie: cookie(role), 'Content-Type': 'application/json' });
  try {
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { headers: headers('OTRO') })).status, 403);
    const listado = mock.method(service, 'listar', async () => ({
      data: [ficha()], ejecutores: ['ONG Test'], pagination: { page: 2, limit: 50, total: 51, totalPages: 2 },
    }));
    const paginado = await fetch(`${base}?page=2&region=8&ong=ONG%20Test&rut=12.345.678-5`, { headers: headers('MINISTERIO') });
    assert.equal(paginado.status, 200);
    assert.deepEqual((await paginado.json()).pagination, { page: 2, limit: 50, total: 51, totalPages: 2 });
    assert.equal(listado.mock.calls[0].arguments[0], 8);
    assert.equal(listado.mock.calls[0].arguments[2], 2);
    assert.equal(listado.mock.calls[0].arguments[3], 'ONG Test');
    assert.equal(listado.mock.calls[0].arguments[4], '12345678-5');
    assert.equal((await fetch(`${base}?rut=abc`, { headers: headers('MINISTERIO') })).status, 400);
    assert.equal((await fetch(`${base}?page=0`, { headers: headers('MINISTERIO') })).status, 400);
    assert.equal((await fetch(base, { method: 'POST', headers: headers('ADMIN'), body: '{}' })).status, 403);
    const estado = `${base}/1/documentos/certCotizaciones/estado`;
    assert.equal((await fetch(estado, { method: 'PATCH', headers: headers('INTENDENCIA'), body: '{"status":"aprobado"}' })).status, 403);
    assert.equal((await fetch(estado, { method: 'PATCH', headers: headers('MINISTERIO'), body: '{"status":"rechazado"}' })).status, 400);
    const spy = mock.method(service, 'actualizarEstado', async () => ficha());
    const result = await fetch(estado, { method: 'PATCH', headers: headers('MINISTERIO'), body: '{"status":"rechazado","comentario":"Ilegible"}' });
    assert.equal(result.status, 200);
    assert.equal(spy.mock.calls[0].arguments[1], 'certCotizaciones');
    const archivos = mock.method(service, 'obtenerVisible', async () => ficha());
    const staleUrl = `${base}/1/documentos/certCotizaciones/certCotizaciones-old.pdf`;
    assert.equal((await fetch(staleUrl, { headers: headers('INTENDENCIA') })).status, 404);
    assert.equal(archivos.mock.callCount(), 1);
    const form = new FormData();
    for (const [key, value] of Object.entries(data)) form.append(key, String(value));
    assert.equal((await fetch(base, { method: 'POST', headers: { cookie: cookie('INTENDENCIA') }, body: form })).status, 400);
    form.append('certCotizaciones', new Blob([pdf.buffer], { type: 'application/pdf' }), 'cert.pdf');
    form.append('liquidacion', new Blob([pdf.buffer], { type: 'application/pdf' }), 'liq.pdf');
    const crear = mock.method(service, 'crear', async () => ficha());
    const created = await fetch(base, { method: 'POST', headers: { cookie: cookie('INTENDENCIA') }, body: form });
    assert.equal(created.status, 201);
    assert.equal(crear.mock.calls[0].arguments[0].comuna, 'Concepción');
    assert.equal(Object.hasOwn(crear.mock.calls[0].arguments[0], 'idComuna'), false);
    assert.equal(crear.mock.calls[0].arguments[1].certCotizaciones.originalname, 'cert.pdf');
    assert.equal(crear.mock.calls[0].arguments[1].liquidacion.originalname, 'liq.pdf');
    const documentosForm = new FormData();
    documentosForm.append('certCotizaciones', new Blob([pdf.buffer], { type: 'application/pdf' }), 'cert.pdf');
    documentosForm.append('liquidacion', new Blob([pdf.buffer], { type: 'application/pdf' }), 'liq.pdf');
    const guardar = mock.method(service, 'guardarDocumentos', async () => ficha());
    const saved = await fetch(`${base}/1/documentos`, {
      method: 'PATCH', headers: { cookie: cookie('INTENDENCIA') }, body: documentosForm,
    });
    assert.equal(saved.status, 200);
    assert.equal(guardar.mock.calls[0].arguments[0], 1);
    assert.equal(guardar.mock.calls[0].arguments[1].certCotizaciones.originalname, 'cert.pdf');
    assert.equal(guardar.mock.calls[0].arguments[1].liquidacion.originalname, 'liq.pdf');
    assert.equal((await fetch(`${base}/1/documentos`, {
      method: 'PATCH', headers: { cookie: cookie('MINISTERIO') }, body: documentosForm,
    })).status, 403);
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'auditoria-pdf-test-'));
    const filename = path.join(directory, 'cert.pdf');
    try {
      fs.writeFileSync(filename, pdf.buffer);
      mock.method(files, 'rutaPdfAuditoria', () => filename);
      const response = await fetch(`${base}/1/documentos/certCotizaciones/certCotizaciones-abcd.pdf`, { headers: headers('INTENDENCIA') });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /application\/pdf/);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf.buffer);
    } finally {
      fs.unlinkSync(filename);
      fs.rmdirSync(directory);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
