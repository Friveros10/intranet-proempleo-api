const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

process.env.DOTENV_CONFIG_PATH = '__checklist_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'unused';
process.env.DB_NAME = 'test';

const { sequelize } = require('../src/database/sequelize');
const { reemplazoBenProyectoService: service } = require('../src/services/reemplazoBenProyecto.service');
const { reemplazoBenProyectoRepository: repo } = require('../src/repositories/reemplazoBenProyecto.repository');
const { ReemplazoBenProyectoModel: Model } = require('../src/models/ReemplazoBenProyecto.model');
const { usuarioSicapRepository: usuarios } = require('../src/repositories/sicap/usuarioSicap.repository');
const { beneficiarioRepository: beneficiarios } = require('../src/repositories/sicap/beneficiario.repository');
const { auditLogRepository: audit } = require('../src/repositories/auditLog.repository');
const { actualizarChecklistReemplazoSchema, listarReemplazoSchema, actualizarEstadoReemplazoSchema } = require('../src/validations/reemplazoBenProyecto.validation');
const migration = require('../migrations/202611110001-add-desempate-reemplazo-benpro');

afterEach(() => mock.restoreAll());
const req = { ip: '127.0.0.1', socket: {}, get: () => 'test' };
const transaction = { test: true };
const candidatos = (puntajes) => puntajes.map((puntaje, index) => ({
  id: index + 1, criterio_1: puntaje, criterio_2: 50, criterio_3: 50,
  criterio_4: 50, criterio_5: null,
}));

function preparar(status = 'revisado') {
  const rows = [1, 2, 3].map((id) => ({
    id, idProyecto: 10, idBeneficiarioProyecto: 20,
    idBeneficiarioNuevo: 100 - id, status, ponderacion: null,
    fechaSolicitudReemplazo: '2026-11-11T12:00:00Z',
    toJSON: () => ({ proyecto: { reg_pro: 5, fol_pro: 10 } }),
  }));
  mock.method(repo, 'findByIds', async (ids) => rows.filter((row) => ids.includes(row.id)));
  mock.method(repo, 'findById', async (id) => rows.find((row) => row.id === id));
  mock.method(Model, 'findAll', async () => rows);
  mock.method(sequelize, 'transaction', async (callback) => callback(transaction));
  const guardar = mock.method(repo, 'actualizarChecklist', async (id, criterios) => {
    Object.assign(rows.find((row) => row.id === id), criterios);
    return true;
  });
  const estado = mock.method(repo, 'actualizarEstado', async (id, status) => {
    const row = rows.find((row) => row.id === id);
    row.status = status;
    return row;
  });
  const activar = mock.method(beneficiarios, 'actualizarStatusPorResultadoReemplazo', async () => {});
  const auditoria = mock.method(audit, 'registrar', async () => ({}));
  mock.method(usuarios, 'findByRut', async () => ({ reg_usu: 5 }));
  mock.method(usuarios, 'getPermisosDeUsuario', async () => ['REM_APROB', 'REM_RECHAZ']);
  return { rows, guardar, estado, activar, auditoria };
}

test('sin empate pre-aprueba solo el mayor y no activa al entrante hasta completar', async () => {
  const { rows, guardar, activar, auditoria } = preparar();
  await service.actualizarChecklist({ candidatos: candidatos([100, 50, 0]) }, 1, req);
  assert.deepEqual(rows.map((row) => row.status), ['preAprobado', 'rechazado', 'rechazado']);
  assert.deepEqual(rows.map((row) => row.desempate), [null, null, null]);
  assert.equal(guardar.mock.calls[0].arguments[1].ponderacion, 250);
  assert.ok(guardar.mock.calls.every((call) => call.arguments[2] === transaction));
  assert.equal(activar.mock.callCount(), 2);
  assert.ok(activar.mock.calls.every((call) => call.arguments[1] === 0 && call.arguments[3] === transaction));
  assert.ok(auditoria.mock.calls.some((call) => call.arguments[0].accion === 'REEMPLAZO_PREAPROBADO'));
  await service.actualizarEstado(1, 'aprobado', 1, req);
  assert.equal(rows[0].status, 'aprobado');
  assert.deepEqual(activar.mock.calls[2].arguments, [99, 1, '1', transaction]);
});

for (const desempate of ['Edad', 'proyecto', 'Tiempo Cesante']) {
  test(`empate selecciona ganador explicitamente y guarda solo su criterio: ${desempate}`, async () => {
    const { rows } = preparar();
    await service.actualizarChecklist({
      candidatos: candidatos([100, 100, 100]), ganadorId: 1, desempate,
    }, 1, req);
    assert.deepEqual(rows.map((row) => row.status), ['preAprobado', 'rechazado', 'rechazado']);
    assert.deepEqual(rows.map((row) => row.desempate), [desempate, null, null]);
    // El ganador tiene el RUT mayor: no hay desempate implicito por RUT.
    assert.equal(rows[0].idBeneficiarioNuevo, 99);
  });
}

test('rechaza empate sin seleccion completa o ganador fuera del mayor puntaje sin escribir', async () => {
  const { guardar, estado, activar } = preparar();
  for (const seleccion of [
    {}, { ganadorId: 1 }, { desempate: 'Edad' },
    { ganadorId: 3, desempate: 'Edad' }, { ganadorId: 99, desempate: 'Edad' },
  ]) {
    await assert.rejects(service.actualizarChecklist({
      candidatos: candidatos([100, 100, 0]), ...seleccion,
    }, 1, req), (err) => err.statusCode === 400);
  }
  assert.equal(guardar.mock.callCount(), 0);
  assert.equal(estado.mock.callCount(), 0);
  assert.equal(activar.mock.callCount(), 0);
});

test('no exige desempate por empate de puntajes inferiores y rechaza seleccion obsoleta', async () => {
  const { rows } = preparar();
  await assert.rejects(service.actualizarChecklist({
    candidatos: candidatos([100, 0, 0]), ganadorId: 2, desempate: 'Edad',
  }, 1, req), /Solo se puede seleccionar/);
  await service.actualizarChecklist({ candidatos: candidatos([100, 0, 0]) }, 1, req);
  assert.equal(rows[0].status, 'preAprobado');
});

test('exige evaluar el grupo completo y no mezcla cupos', async () => {
  const { rows, guardar } = preparar();
  await assert.rejects(service.actualizarChecklist({ candidatos: candidatos([100, 50]) }, 1, req), /todos los candidatos/);
  rows[2].idProyecto = 11;
  await assert.rejects(service.actualizarChecklist({ candidatos: candidatos([100, 50, 0]) }, 1, req), /mismo reemplazo/);
  assert.equal(guardar.mock.callCount(), 0);
});

for (const status of ['pendiente', 'enRevision', 'preAprobado', 'aprobado', 'rechazado']) {
  test(`no vuelve a evaluar ni aprueba directamente desde ${status}`, async () => {
    const { guardar } = preparar(status);
    await assert.rejects(service.actualizarChecklist({ candidatos: candidatos([100, 50, 0]) }, 1, req), /todos los candidatos/);
    assert.equal(guardar.mock.callCount(), 0);
    if (status !== 'preAprobado') {
      await assert.rejects(service.actualizarEstado(1, 'aprobado', 1, req), /pre-aprobada/);
    }
  });
}

test('pre-aprobado puede rechazarse pero no volver a revision; rechazados no pueden reactivarse', async () => {
  const { rows } = preparar();
  await service.actualizarChecklist({ candidatos: candidatos([100, 0, 0]) }, 1, req);
  await assert.rejects(service.actualizarEstado(1, 'revisado', 1, req), /ya fue resuelto/);
  await assert.rejects(service.actualizarEstado(2, 'revisado', 1, req), /ya fue resuelto/);
  await service.actualizarEstado(1, 'rechazado', 1, req, 'No corresponde');
  assert.equal(rows[0].status, 'rechazado');
});

test('validacion acepta opciones exactas, filtro preAprobado y prohibe asignarlo manualmente', () => {
  const body = { candidatos: candidatos([100, 100, 0]), ganadorId: 2, desempate: 'Edad' };
  assert.equal(actualizarChecklistReemplazoSchema.safeParse({ body }).success, true);
  for (const desempate of ['RUT', '', null]) {
    assert.equal(actualizarChecklistReemplazoSchema.safeParse({ body: { ...body, desempate } }).success, false);
  }
  assert.equal(listarReemplazoSchema.safeParse({ query: { status: 'preAprobado' } }).success, true);
  assert.equal(actualizarEstadoReemplazoSchema.safeParse({ body: { status: 'preAprobado' } }).success, false);
});

test('repositorio no asigna fecha de aprobacion al pre-aprobar y si al aprobar', async () => {
  const row = Model.build({ status: 'revisado' });
  mock.method(Model, 'findByPk', async () => row);
  mock.method(row, 'save', async () => row);
  await repo.actualizarEstado(1, 'preAprobado', null, transaction);
  assert.equal(row.fechaAprobacionReemplazo, null);
  await repo.actualizarEstado(1, 'aprobado', null, transaction);
  assert.ok(row.fechaAprobacionReemplazo);
});

test('migracion reversible agrega desempate VARCHAR nullable sin alterar estados existentes', async () => {
  const acciones = [];
  const qi = {
    addColumn: async (...args) => acciones.push(['add', ...args]),
    removeColumn: async (...args) => acciones.push(['remove', ...args]),
  };
  await migration.up(qi);
  await migration.down(qi);
  assert.deepEqual(acciones[0][1], { tableName: 'Reemplazo_benpro', schema: 'dbo' });
  assert.equal(acciones[0][2], 'desempate');
  assert.equal(acciones[0][3].type.toSql(), 'VARCHAR(50)');
  assert.equal(acciones[0][3].allowNull, true);
  assert.equal(acciones[1][2], 'desempate');
});
