const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

process.env.DOTENV_CONFIG_PATH = '__cupo_cobertura_test_no_env__';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'coverage-test';
process.env.DB_PASSWORD = 'unused-test-value';
process.env.DB_NAME = 'coverage-test';

const { ProyectoModel } = require('../src/models/Proyecto.model');
const { BenProModel } = require('../src/models/BenPro.model');
const { ReemplazoBenProyectoModel } = require('../src/models/ReemplazoBenProyecto.model');
const { proyectoRepository } = require('../src/repositories/sicap/proyecto.repository');
const { reemplazoBenProyectoRepository } = require('../src/repositories/reemplazoBenProyecto.repository');
const { crearReemplazoSchema } = require('../src/validations/reemplazoBenProyecto.validation');
const migration = require('../migrations/202609150001-create-reemplazo-benpro');

afterEach(() => mock.restoreAll());

function candidatos() {
  return Array.from({ length: 3 }, (_, indice) => ({
    rut: `1111111${indice}-1`,
    nombres: `Nombre ${indice}`,
    apellidoPaterno: 'Paterno',
    apellidoMaterno: 'Materno',
    fechaNacimiento: '01-01-1990',
  }));
}

test('proyecto calcula ocupacion solamente sobre el ultimo periodo BenPro', async () => {
  const proyecto = ProyectoModel.build({
    fol_pro: 30202,
    nom_pro: 'Proyecto',
    emp_pro: 48,
    reg_pro: 10,
    com_pro: 10202,
  });
  proyecto.comuna = { nom_com: 'Ancud' };
  mock.method(ProyectoModel, 'findByPk', async () => proyecto);
  mock.method(BenProModel, 'findOne', async () => ({
    ano_BenPro: 2026,
    mes_benpro: 9,
  }));
  const count = mock.method(BenProModel, 'count', async () => 47);

  const resultado = await proyectoRepository.findByFolioConCupo(30202);

  assert.equal(resultado.cuposUtilizados, 47);
  assert.equal(resultado.cuposDisponibles, 1);
  assert.equal(resultado.nombreComuna, 'Ancud');
  assert.deepEqual(count.mock.calls[0].arguments[0].where, {
    fol_pro: 30202,
    ano_BenPro: 2026,
    mes_benpro: 9,
  });
});

test('validacion permite cobertura sin beneficiario saliente y lo exige en reemplazo', () => {
  const base = {
    idProyecto: '30202',
    nuevosBeneficiarios: JSON.stringify(candidatos()),
    documentos: '[]',
  };

  const cobertura = crearReemplazoSchema.safeParse({
    body: { ...base, cupoCobertura: 'true' },
  });
  assert.equal(cobertura.success, true);
  assert.equal(cobertura.data.body.idBeneficiarioProyecto, undefined);

  const reemplazo = crearReemplazoSchema.safeParse({
    body: { ...base, cupoCobertura: 'false' },
  });
  assert.equal(reemplazo.success, false);
  assert.equal(
    reemplazo.error.issues.some(
      (issue) => issue.path.at(-1) === 'idBeneficiarioProyecto',
    ),
    true,
  );
});

test('modelo, migracion y repositorio persisten cobertura con saliente nulo', async () => {
  let columns;
  await migration.up({
    createTable: async (_table, definitions) => {
      columns = definitions;
    },
  });
  assert.equal(columns.idBeneficiarioProyecto.allowNull, true);
  assert.equal(
    ReemplazoBenProyectoModel.getAttributes().idBeneficiarioProyecto.allowNull,
    true,
  );

  const create = mock.method(ReemplazoBenProyectoModel, 'create', async (data) => data);
  const fechaSolicitudReemplazo = '2026-10-08T20:00:00.000Z';
  await reemplazoBenProyectoRepository.create({
    idBeneficiarioProyecto: null,
    idBeneficiarioNuevo: 12345678,
    idProyecto: 30202,
    rutUsuarioSolicitante: 1,
    puntajeRsh: 40,
    fechaSolicitudReemplazo,
  });
  const guardado = create.mock.calls[0].arguments[0];
  assert.equal(guardado.idBeneficiarioProyecto, null);
  assert.equal(guardado.fechaSolicitudReemplazo, fechaSolicitudReemplazo);
});
