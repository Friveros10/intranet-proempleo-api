const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

// Estas pruebas nunca se conectan a la base configurada en el entorno.
process.env.DOTENV_CONFIG_PATH = '__auditoria_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'auditoria-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'auditoria-test';

const { sequelize } = require('../src/database/sequelize');
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
  apellidoMaterno: 'Soto', ong: 'ONG Test', idComuna: 101,
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
    apellidoMaterno: 'Soto', ong: 'ONG Test', idComuna: 101, idRegion: 8,
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
  const parsed = schemas.crearDocumentoAuditoriaSchema.parse({ body: { ...data, nombres: ' Ana ', idComuna: '101' } });
  assert.equal(parsed.body.nombres, 'Ana');
  assert.equal(parsed.body.idComuna, 101);
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
  await service.listar(5, req());
  assert.equal(spy.mock.calls[0].arguments[0], 8);
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
  const spy = mock.method(sequelize, 'query', async () => []);
  await repository.listar(8);
  const [sql, options] = spy.mock.calls[0].arguments;
  assert.match(sql, /deleted_at IS NULL/);
  assert.match(sql, /a.idRegion = :region/);
  assert.match(sql, /nombreComuna/);
  assert.deepEqual(options.replacements, { region: 8 });
});

test('creacion separa RUT/dv, usa region del perfil y audita en misma transaccion', async () => {
  perfil();
  mock.method(regiones, 'findComunasByRegion', async () => [{ cod_com: 101 }]);
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
  assert.equal(insert.created_usr, 12345678);
  assert.equal(options.transaction, tx);
  assert.match(update.mock.calls[0].arguments[0].liquidacionUrl, /liquidacion-abcd.pdf$/);
  assert.equal(log.mock.calls[0].arguments[0].transaction, tx);
});

test('creacion rechaza comuna de otra region antes de guardar', async () => {
  perfil();
  mock.method(regiones, 'findComunasByRegion', async () => [{ cod_com: 202 }]);
  const spy = mock.method(DocumentoAuditoriaModel, 'create', async () => ficha());
  await assert.rejects(service.crear(data, { certCotizaciones: pdf, liquidacion: pdf }, req()), { statusCode: 400 });
  assert.equal(spy.mock.callCount(), 0);
});

test('si falla segundo archivo se limpia primero y se propaga error', async () => {
  perfil();
  mock.method(regiones, 'findComunasByRegion', async () => [{ cod_com: 101 }]);
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
  assert.deepEqual(options.where, { id: 1, estadoLiquidacion: 'pendiente' });
});

test('revision concurrente no sobrescribe documento ya revisado', async () => {
  transaction();
  mock.method(repository, 'obtener', async () => ficha());
  mock.method(DocumentoAuditoriaModel, 'update', async () => [0]);
  const log = mock.method(audit, 'registrar', async () => ({}));
  await assert.rejects(service.actualizarEstado(1, 'certCotizaciones', { status: 'aprobado' }, req(['ADMIN'])), { statusCode: 409 });
  assert.equal(log.mock.callCount(), 0);
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
    assert.equal(crear.mock.calls[0].arguments[0].idComuna, 101);
    assert.equal(crear.mock.calls[0].arguments[1].certCotizaciones.originalname, 'cert.pdf');
    assert.equal(crear.mock.calls[0].arguments[1].liquidacion.originalname, 'liq.pdf');
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
