const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.DOTENV_CONFIG_PATH = '__flujo_reemplazo_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'flow-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'flow-test';

const { sequelize } = require('../src/database/sequelize');
const { flujoReemplazoService: service } = require('../src/services/flujoReemplazo.service');
const { flujoReemplazoRepository: repo } = require('../src/repositories/flujoReemplazo.repository');
const { usuarioSicapRepository: usuarios } = require('../src/repositories/sicap/usuarioSicap.repository');
const { regionRepository: regiones } = require('../src/repositories/sicap/region.repository');
const { proyectoRepository: proyectos } = require('../src/repositories/sicap/proyecto.repository');
const { beneficiarioRepository: beneficiarios } = require('../src/repositories/sicap/beneficiario.repository');
const { auditLogRepository: audit } = require('../src/repositories/auditLog.repository');
const { planEgresoHistoricoService: egreso } = require('../src/services/planEgresoHistorico.service');
const disco = require('../src/utils/documentosReemplazoIndividual');
const { DOCUMENTOS_REEMPLAZO } = require('../src/constants/documentosReemplazo');
const { crearReemplazoIndividualSchema, configurarFlujoSchema } = require('../src/validations/flujoReemplazo.validation');
const { crearReemplazoSchema } = require('../src/validations/reemplazoBenProyecto.validation');
const { ReemplazoIndividualModel, DocumentoIndividualModel, FlujoReemplazoModel } = require('../src/models/FlujoReemplazo.model');
const { ReemplazoBenProyectoModel } = require('../src/models/ReemplazoBenProyecto.model');
const { DocReemplazoBenProyectoModel } = require('../src/models/DocReemplazoBenProyecto.model');
const migration = require('../migrations/202610210001-create-flujo-reemplazo-proempleo');

afterEach(() => mock.restoreAll());

const candidato = {
  rut: '12345678-5', nombres: 'Nombre', apellidoPaterno: 'Paterno',
  apellidoMaterno: 'Materno', fechaNacimiento: '01-01-1990', puntajeRsh: 40,
};
const req = { ip: '127.0.0.1', socket: {}, get: () => 'test' };
const row = () => ({
  id: 7, flujo: 'B', idBeneficiarioProyecto: 11111111, idBeneficiarioNuevo: 12345678,
  idProyecto: 30202, status: 'pendiente', proyecto: { fol_pro: 30202, reg_pro: 10 },
  puntajeRsh: 40, ponderacion: null, criterio_1: null, criterio_2: null,
  criterio_3: null, criterio_4: null, criterio_5: null,
  beneficiarioNuevo: { fecnac_ben: '1990-01-01' },
});

function contexto(region = 10, permisos = ['REM_CREAR', 'REM_VERREG', 'REM_APROB', 'REM_RECHAZ']) {
  mock.method(usuarios, 'findByRut', async () => ({ reg_usu: region }));
  mock.method(usuarios, 'getPermisosDeUsuario', async () => permisos);
  mock.method(audit, 'registrar', async () => ({}));
  mock.method(sequelize, 'transaction', async (callback) => callback({ test: true }));
}

function creacion(cobertura = false) {
  const data = {
    cupoCobertura: cobertura, idBeneficiarioProyecto: cobertura ? undefined : 11111111,
    idProyecto: 30202, nuevosBeneficiarios: [candidato],
    documentos: DOCUMENTOS_REEMPLAZO.map((tipo) => ({ rut: candidato.rut, idDocumento: tipo.id })),
  };
  const archivos = DOCUMENTOS_REEMPLAZO.map(() => ({
    originalname: 'documento.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF'),
  }));
  return { data, archivos };
}

function prepararCreacion() {
  contexto();
  mock.method(repo, 'configuracion', async () => ({ status: 1 }));
  mock.method(proyectos, 'findByFolioConCupo', async () => ({
    fol_pro: 30202, reg_pro: 10, cuposDisponibles: 1, periodosSinCupo: [],
  }));
  mock.method(beneficiarios, 'findByRutFromBenPro', async () => ({ folio_vigente: 30202 }));
  mock.method(beneficiarios, 'findByRut', async () => null);
  mock.method(beneficiarios, 'createProempleo', async () => ({}));
  mock.method(egreso, 'validarPuedeIngresarPorRun', async () => {});
  mock.method(repo, 'crear', async () => ({ id: 7 }));
  mock.method(repo, 'crearDocumento', async () => ({}));
  mock.method(repo, 'obtener', async () => row());
  mock.method(disco, 'guardarDocumentoIndividual', () => '/uploads/reemplazos-individuales/7/test.pdf');
  mock.method(disco, 'eliminarDocumentoIndividual', () => {});
}

test('A mantiene tres candidatos; B exige uno para reemplazo y cobertura', () => {
  for (const cobertura of [false, true]) {
    const { data } = creacion(cobertura);
    for (const cantidad of [0, 1, 2, 3]) {
      const body = {
        ...data, cupoCobertura: String(cobertura),
        nuevosBeneficiarios: JSON.stringify(Array.from({ length: cantidad }, () => candidato)),
        documentos: '[]',
      };
      assert.equal(crearReemplazoIndividualSchema.safeParse({ body }).success, cantidad === 1);
      assert.equal(crearReemplazoSchema.safeParse({ body }).success, cantidad === 3);
    }
  }
  const { data } = creacion();
  assert.equal(crearReemplazoIndividualSchema.safeParse({
    body: { ...data, idBeneficiarioProyecto: undefined, nuevosBeneficiarios: JSON.stringify([candidato]), documentos: '[]' },
  }).success, false);
});

test('selector usa solo la region persistida del usuario; ausencia y cero seleccionan A', async () => {
  contexto(10);
  const config = mock.method(repo, 'configuracion', async () => null);
  assert.deepEqual(await service.actual(1), { idRegion: 10, status: 0 });
  config.mock.mockImplementation(async () => ({ idRegion: 10, status: 0 }));
  assert.equal((await service.actual(1)).status, 0);
  config.mock.mockImplementation(async () => ({ idRegion: 10, status: 1 }));
  assert.equal((await service.actual(1)).status, 1);
  assert.ok(config.mock.calls.every((call) => call.arguments[0] === 10));
});

test('usuario sin region no consulta configuracion ni habilita B', async () => {
  contexto(null);
  const config = mock.method(repo, 'configuracion', async () => { throw new Error('No debe consultar'); });
  assert.deepEqual(await service.actual(1), { idRegion: null, status: 0 });
  assert.equal(config.mock.calls.length, 0);
});

test('configuracion lista solamente regiones activas y rechaza otras regiones y estados', async () => {
  contexto();
  mock.method(regiones, 'findRegionesActivas', async () => [
    { cod_region: 10, nom_region: 'Los Lagos' }, { cod_region: 8, nom_region: 'Biobio' },
  ]);
  mock.method(repo, 'configuraciones', async () => [
    { idRegion: 10, status: 1 }, { idRegion: 13, status: 1 },
  ]);
  const guardar = mock.method(repo, 'configurar', async (idRegion, status) => ({ idRegion, status }));
  const listado = await service.configuraciones();
  assert.deepEqual(listado.map(({ idRegion, status }) => ({ idRegion, status })), [
    { idRegion: 10, status: 1 }, { idRegion: 8, status: 0 },
  ]);
  await assert.rejects(service.configurar(13, 1, 1, req), /no está activa/);
  assert.equal(guardar.mock.calls.length, 0);
  assert.deepEqual(await service.configurar(10, 0, 1, req), { idRegion: 10, status: 0 });
  assert.equal(audit.registrar.mock.calls[0].arguments[0].entidad, 'flujo_reemplazo_proempleo');
  for (const status of [-1, 2, true, '1']) {
    assert.equal(configurarFlujoSchema.safeParse({ params: { idRegion: '10' }, body: { status } }).success, false);
  }
});

for (const cobertura of [false, true]) {
  test(`creacion ${cobertura ? 'cobertura' : 'reemplazo'} escribe una solicitud B y sus PDF sin tocar A`, async () => {
    prepararCreacion();
    const tocarA = () => { throw new Error('No se debe escribir en A'); };
    mock.method(ReemplazoBenProyectoModel, 'create', tocarA);
    mock.method(DocReemplazoBenProyectoModel, 'create', tocarA);
    const { data, archivos } = creacion(cobertura);
    const resultado = await service.crear(data, archivos, 1, req);
    assert.equal(resultado.length, 1);
    assert.equal(repo.crear.mock.calls.length, 1);
    assert.equal(repo.crear.mock.calls[0].arguments[0].idBeneficiarioProyecto, cobertura ? null : 11111111);
    assert.equal(repo.crearDocumento.mock.calls.length, DOCUMENTOS_REEMPLAZO.length);
    assert.equal(beneficiarios.createProempleo.mock.calls[0].arguments[1].test, true);
    assert.ok(repo.crearDocumento.mock.calls.every((call) => call.arguments[1].test === true));
    assert.equal(ReemplazoBenProyectoModel.create.mock.calls.length, 0);
    assert.equal(DocReemplazoBenProyectoModel.create.mock.calls.length, 0);
  });
}

test('creacion bloquea configuracion cambiada, regiones ajenas, saliente ajeno y cobertura sin cupo', async () => {
  prepararCreacion();
  const { data, archivos } = creacion();
  repo.configuracion.mock.mockImplementation(async () => null);
  await assert.rejects(service.crear(data, archivos, 1, req), /configuración.*cambió/);
  repo.configuracion.mock.mockImplementation(async () => ({ status: 1 }));
  proyectos.findByFolioConCupo.mock.mockImplementation(async () => ({ reg_pro: 8 }));
  await assert.rejects(service.crear(data, archivos, 1, req), /no pertenece a tu zona/);
  proyectos.findByFolioConCupo.mock.mockImplementation(async () => ({ reg_pro: 10, cuposDisponibles: 0, periodosSinCupo: [] }));
  await assert.rejects(service.crear({ ...data, cupoCobertura: true }, archivos, 1, req), /no tiene cupos/);
  beneficiarios.findByRutFromBenPro.mock.mockImplementation(async () => ({ folio_vigente: 999 }));
  await assert.rejects(service.crear(data, archivos, 1, req), /saliente no pertenece/);
  assert.equal(repo.crear.mock.calls.length, 0);
});

test('creacion exige PDF completos asociados al entrante y limpia archivos ante rollback', async () => {
  prepararCreacion();
  const { data, archivos } = creacion();
  await assert.rejects(service.crear(data, archivos.slice(1), 1, req), /todos los documentos/);
  await assert.rejects(service.crear({
    ...data, documentos: data.documentos.map((doc) => ({ ...doc, rut: '11111111-1' })),
  }, archivos, 1, req), /todos los documentos/);
  repo.crearDocumento.mock.mockImplementation(async () => { throw new Error('fallo de persistencia'); });
  await assert.rejects(service.crear(data, archivos, 1, req), /fallo de persistencia/);
  assert.equal(disco.eliminarDocumentoIndividual.mock.calls.length, 1);
});

test('auditoria comparte transaccion con B y su fallo revierte el alta y limpia todos sus PDF', async () => {
  prepararCreacion();
  const { data, archivos } = creacion();
  await service.crear(data, archivos, 1, req);
  assert.equal(audit.registrar.mock.calls[0].arguments[0].transaction.test, true);
  audit.registrar.mock.mockImplementation(async () => { throw new Error('auditoria no disponible'); });
  await assert.rejects(service.crear(data, archivos, 1, req), /auditoria no disponible/);
  assert.equal(disco.eliminarDocumentoIndividual.mock.calls.length, DOCUMENTOS_REEMPLAZO.length);
});

test('almacenamiento individual escribe y elimina unicamente su propio PDF', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const id = Date.now();
  const carpeta = path.resolve('uploads', 'reemplazos-individuales', String(id));
  assert.equal(fs.existsSync(carpeta), false);
  let url;
  try {
    url = disco.guardarDocumentoIndividual(id, {
      originalname: '..\\nombre-original.pdf', buffer: Buffer.from('%PDF-1.4 prueba'),
    });
    assert.match(url, /^\/uploads\/reemplazos-individuales\/\d+\/[\da-f-]+\.pdf$/);
    const archivo = path.join(carpeta, url.split('/').at(-1));
    assert.equal(fs.readFileSync(archivo, 'utf8'), '%PDF-1.4 prueba');
    assert.throws(() => disco.eliminarDocumentoIndividual('/uploads/reemplazos/7/a.pdf'), /inválida/);
    disco.eliminarDocumentoIndividual(url);
    url = undefined;
    assert.equal(fs.existsSync(archivo), false);
  } finally {
    if (url) disco.eliminarDocumentoIndividual(url);
    fs.rmdirSync(carpeta);
  }
});

test('listado aplica region real, oculta checklist regional y conserva acceso al historial sin consultar selector', async () => {
  contexto(10);
  const listado = mock.method(repo, 'listar', async () => [row()]);
  const obtener = mock.method(repo, 'obtener', async () => row());
  const selector = mock.method(repo, 'configuracion', async () => { throw new Error('No consultar selector en historicos'); });
  const resultado = await service.listar({ region: 8 }, 1, ['INTENDENCIA']);
  assert.equal(listado.mock.calls[0].arguments[0].region, 10);
  assert.equal('criterio_1' in resultado[0], false);
  assert.equal('ponderacion' in resultado[0], false);
  assert.equal((await service.obtener(7, 1, ['ADMIN'])).id, 7);
  obtener.mock.mockImplementation(async () => ({ ...row(), proyecto: { reg_pro: 8 } }));
  await assert.rejects(service.obtener(7, 1, ['INTENDENCIA']), /No tiene acceso/);
  assert.equal(selector.mock.calls.length, 0);
});

test('checklist individual exige documentos aprobados y aprueba la solicitud al guardar', async () => {
  contexto();
  const obtener = mock.method(repo, 'obtener', async () => row());
  const documentos = mock.method(repo, 'documentos', async () => [
    { get: () => ({ status: 'pendiente' }) },
  ]);
  const actualizar = mock.method(repo, 'actualizar', async () => [1]);
  const statusBeneficiario = mock.method(beneficiarios, 'actualizarStatusPorResultadoReemplazo', async () => 0);
  const candidato = { id: 7, criterio_1: 100, criterio_2: 0, criterio_3: 0, criterio_4: 0, criterio_5: null };
  await assert.rejects(service.checklist({ candidatos: [candidato] }, 1, req), /documentos deben estar aprobados/);
  assert.equal(actualizar.mock.calls.length, 0);
  documentos.mock.mockImplementation(async () =>
    DOCUMENTOS_REEMPLAZO.map(() => ({ get: () => ({ status: 'aprobado' }) })));
  await service.checklist({ candidatos: [candidato] }, 1, req);
  const guardado = actualizar.mock.calls[0].arguments[1];
  assert.equal(guardado.criterio_2, 100);
  assert.equal(guardado.status, 'aprobado');
  assert.equal(guardado.comentarioRechazo, null);
  assert.ok(guardado.fechaAprobacionReemplazo);
  obtener.mock.mockImplementation(async () => ({ ...row(), status: 'aprobado' }));
  await assert.rejects(service.checklist({ candidatos: [candidato] }, 1, req), /ya está resuelta/);
  assert.equal(statusBeneficiario.mock.calls.length, 0);
  await assert.rejects(service.checklist({ candidatos: [candidato, { ...candidato, id: 8 }] }, 1, req), /una sola solicitud/);
});

test('rechazo de emergencia admite solicitud individual aprobada y exige comentario; flujo A no cambia', async () => {
  contexto();
  const obtener = mock.method(repo, 'obtener', async () => ({ ...row(), status: 'aprobado' }));
  const actualizar = mock.method(repo, 'actualizar', async () => [1]);
  await assert.rejects(service.estado(7, 'rechazado', undefined, 1, req), /motivo del rechazo/);
  await service.estado(7, 'rechazado', 'Revisión de emergencia', 1, req);
  assert.equal(actualizar.mock.calls[0].arguments[1].status, 'rechazado');
  assert.equal(actualizar.mock.calls[0].arguments[1].comentarioRechazo, 'Revisión de emergencia');
  assert.ok(actualizar.mock.calls[0].arguments[1].fechaAprobacionReemplazo);

  obtener.mock.mockImplementation(async () => ({
    ...row(), flujo: 'A', status: 'aprobado',
  }));
  await assert.rejects(service.estado(7, 'rechazado', 'Motivo', 1, req), /ya está resuelta/);
  assert.equal(actualizar.mock.calls.length, 1);
});

test('aprobacion individual exige documentos aprobados y checklist; no muta beneficiarios compartidos', async () => {
  contexto();
  const obtener = mock.method(repo, 'obtener', async () => row());
  const docs = mock.method(repo, 'documentos', async () => []);
  const actualizar = mock.method(repo, 'actualizar', async () => [1]);
  const statusBeneficiario = mock.method(beneficiarios, 'actualizarStatusPorResultadoReemplazo', async () => 0);
  await assert.rejects(service.estado(7, 'aprobado', undefined, 1, req), /documentos/);
  docs.mock.mockImplementation(async () => DOCUMENTOS_REEMPLAZO.map(() => ({ get: () => ({ status: 'aprobado' }) })));
  await assert.rejects(service.estado(7, 'aprobado', undefined, 1, req), /checklist/);
  obtener.mock.mockImplementation(async () => ({ ...row(), ponderacion: 250, status: 'revisado' }));
  await service.estado(7, 'aprobado', undefined, 1, req);
  assert.equal(actualizar.mock.calls[0].arguments[1].status, 'aprobado');
  assert.equal(statusBeneficiario.mock.calls.length, 0);
  obtener.mock.mockImplementation(async () => ({ ...row(), status: 'aprobado' }));
  await assert.rejects(service.estado(7, 'enRevision', undefined, 1, req), /ya está resuelta/);
});

test('documentos y eliminacion resuelven ids unicamente en B y respetan region', async () => {
  contexto();
  const obtener = mock.method(repo, 'obtener', async () => row());
  mock.method(repo, 'documento', async () => ({ get: () => ({ idReemplazoBenProyecto: 7, status: 'pendiente' }) }));
  const actualizar = mock.method(repo, 'actualizarDocumento', async () => [1]);
  await service.estadoDocumento(1, 'aprobado', undefined, 1, req);
  assert.equal(actualizar.mock.calls.length, 1);
  obtener.mock.mockImplementation(async () => ({ ...row(), proyecto: { reg_pro: 8 } }));
  await assert.rejects(service.estadoDocumento(1, 'aprobado', undefined, 1, req), /No tiene acceso/);
  await assert.rejects(service.eliminar(7, 1, req), /No tiene acceso/);
});

test('migracion y modelos crean solo tablas nuevas con region unica y PDF asociados a B', async () => {
  const creadas = [];
  const eliminadas = [];
  const queryInterface = {
    sequelize: { transaction: async (callback) => callback({}) },
    createTable: async (table, columns) => creadas.push({ table: table.tableName, columns }),
    addIndex: async () => {},
    addConstraint: async () => {},
    dropTable: async (table) => eliminadas.push(table.tableName),
  };
  await migration.up(queryInterface);
  assert.deepEqual(creadas.map(({ table }) => table), [
    'flujo_reemplazo_proempleo', 'reemplazo_individual_proempleo', 'documento_reemplazo_individual_proempleo',
  ]);
  assert.equal(creadas[0].columns.idRegion.primaryKey, true);
  assert.equal(creadas[1].columns.idBeneficiarioProyecto.allowNull, true);
  assert.equal(creadas[2].columns.idReemplazoBenProyecto.references.model.tableName, 'reemplazo_individual_proempleo');
  assert.equal(FlujoReemplazoModel.getTableName().tableName, creadas[0].table);
  assert.notEqual(ReemplazoIndividualModel.getTableName().tableName, ReemplazoBenProyectoModel.getTableName().tableName);
  assert.notEqual(DocumentoIndividualModel.getTableName().tableName, DocReemplazoBenProyectoModel.getTableName().tableName);
  await migration.down(queryInterface);
  assert.deepEqual(eliminadas, [...creadas].reverse().map(({ table }) => table));
});

test('repositorio B hidrata proyecto, comuna, solicitante y beneficiarios sin consultar solicitudes A', async () => {
  const { registrarAsociaciones } = require('../src/database/sicapAssociations');
  const { ProyectoModel } = require('../src/models/Proyecto.model');
  const { UsuarioSicapModel } = require('../src/models/UsuarioSicap.model');
  registrarAsociaciones();
  const registro = ReemplazoIndividualModel.build({
    ...row(), proyecto: { fol_pro: 30202, nom_pro: 'Proyecto', reg_pro: 10 },
    usuarioSolicitante: { rut_usu: 1, nom_usu: 'Solicitante' },
  }, { include: [
    { model: ProyectoModel, as: 'proyecto' },
    { model: UsuarioSicapModel, as: 'usuarioSolicitante' },
  ] });
  mock.method(ReemplazoIndividualModel, 'findAll', async () => [registro]);
  mock.method(beneficiarios, 'findResumenesPorRuts', async () => new Map([
    [11111111, { rut_ben: 11111111, nom_ben: 'Saliente' }],
    [12345678, { rut_ben: 12345678, nom_ben: 'Entrante' }],
  ]));
  const listadoA = mock.method(ReemplazoBenProyectoModel, 'findAll', async () => { throw new Error('No consultar A'); });
  const [resultado] = await repo.listar({ region: 10, comuna: 10202 });
  assert.equal(resultado.proyecto.reg_pro, 10);
  assert.equal(resultado.usuarioSolicitante.nom_usu, 'Solicitante');
  assert.equal(resultado.beneficiarioNuevo.nom_ben, 'Entrante');
  assert.equal(resultado.beneficiarioActual.nom_ben, 'Saliente');
  assert.equal(resultado.flujo, 'B');
  const consulta = ReemplazoIndividualModel.findAll.mock.calls[0].arguments[0];
  assert.deepEqual(consulta.include[0].where, { reg_pro: 10, com_pro: 10202 });
  assert.equal(consulta.include[0].include[0].as, 'comuna');
  assert.equal(listadoA.mock.calls.length, 0);
});

test('API restringe configuracion a ADMIN y consulta actual a usuarios con permiso; errores no se ocultan', async () => {
  const express = require('express');
  const auth = require('../src/middlewares/auth.middleware');
  mock.method(auth, 'requireAuth', (req, _res, next) => {
    const rol = req.headers['x-test-role'];
    if (!rol) return next(Object.assign(new Error('No autenticado'), { statusCode: 401 }));
    req.user = { sub: '1', roles: [rol] };
    next();
  });
  mock.method(usuarios, 'getPermisosDeUsuario', async () => ['REM_CREAR']);
  mock.method(service, 'configuraciones', async () => [{ idRegion: 10, status: 0 }]);
  mock.method(service, 'configurar', async (idRegion, status) => ({ idRegion, status }));
  mock.method(service, 'actual', async () => ({ idRegion: 10, status: 1 }));
  const { configuracionFlujoRoutes } = require('../src/routes/flujoReemplazo.routes');
  const app = express();
  app.use(express.json());
  app.use('/flujo', configuracionFlujoRoutes);
  app.use((err, _req, res, _next) => res.status(err.statusCode ?? 400).json({ message: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}/flujo`;
  try {
    assert.equal((await fetch(origin)).status, 401);
    for (const role of ['INTENDENCIA', 'MINISTERIO']) {
      const headers = { 'x-test-role': role, 'Content-Type': 'application/json' };
      assert.equal((await fetch(origin, { headers })).status, 403);
      assert.equal((await fetch(`${origin}/10`, { method: 'PUT', headers, body: '{"status":1}' })).status, 403);
      assert.equal((await fetch(`${origin}/actual`, { headers })).status, 200);
    }
    const headers = { 'x-test-role': 'ADMIN', 'Content-Type': 'application/json' };
    assert.equal((await fetch(origin, { headers })).status, 200);
    assert.equal((await fetch(`${origin}/10`, { method: 'PUT', headers, body: '{"status":1}' })).status, 200);
    assert.equal((await fetch(`${origin}/10`, { method: 'PUT', headers, body: '{"status":2}' })).status, 400);
    service.actual.mock.mockImplementation(async () => { throw Object.assign(new Error('Configuracion no disponible'), { statusCode: 503 }); });
    assert.equal((await fetch(`${origin}/actual`, { headers })).status, 503);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
