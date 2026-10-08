import { QueryInterface, QueryTypes } from 'sequelize';

// Vista de consulta unificada de beneficiarios.
//
// Es de solo lectura y nunca escribe en la tabla legacy dbo.BENEFICIARIOS. Si esa
// tabla no existe (base nueva sin el esquema legacy), la vista se crea solo sobre
// dbo.beneficiarios_proempleo, de modo que la migración no falle.
const VIEW_NAME = 'dbo.beneficiarios_consulta';

const SELECT_PROEMPLEO = `
    SELECT
      p.rutBeneficiario AS rut_ben,
      CAST(p.digitoVerificador AS NVARCHAR(1)) AS dig_ben,
      CAST(p.nombres AS NVARCHAR(255)) AS nom_ben,
      CAST(p.apellidoPaterno AS NVARCHAR(255)) AS pat_ben,
      CAST(p.apellidoMaterno AS NVARCHAR(255)) AS mat_ben,
      CAST(p.direccion AS NVARCHAR(255)) AS dir_ben,
      p.idRegion AS reg_ben,
      p.idCiudad AS ciu_ben,
      p.idComuna AS com_ben,
      CAST(NULL AS NVARCHAR(50)) AS civ_ben,
      CONVERT(VARCHAR(10), p.fechaNacimiento, 23) AS fecnac_ben,
      CAST(p.sexo AS NVARCHAR(255)) AS sex_ben,
      CAST(NULL AS NVARCHAR(255)) AS est_ben,
      CAST(p.etnia AS NVARCHAR(255)) AS etn_ben,
      CAST(p.telefono AS NVARCHAR(255)) AS tel_ben,
      CAST(p.celular AS NVARCHAR(255)) AS cel_ben,
      CAST(p.email AS NVARCHAR(255)) AS email_ben,
      p.status, p.statusFicha,
      CAST('proempleo' AS NVARCHAR(10)) AS origen
    FROM dbo.beneficiarios_proempleo p`;

const SELECT_LEGACY = `
    SELECT
      b.rut_ben,
      CAST(b.dig_ben AS NVARCHAR(1)) AS dig_ben,
      CAST(b.nom_ben AS NVARCHAR(255)) AS nom_ben,
      CAST(b.pat_ben AS NVARCHAR(255)) AS pat_ben,
      CAST(b.mat_ben AS NVARCHAR(255)) AS mat_ben,
      CAST(b.dir_ben AS NVARCHAR(255)) AS dir_ben,
      b.reg_ben, b.ciu_ben, b.com_ben, b.civ_ben,
      CONVERT(VARCHAR(10), b.fecnac_ben, 23) AS fecnac_ben,
      CAST(b.sex_ben AS NVARCHAR(255)) AS sex_ben,
      CAST(b.est_ben AS NVARCHAR(255)) AS est_ben,
      CAST(b.etn_ben AS NVARCHAR(255)) AS etn_ben,
      CAST(b.tel_ben AS NVARCHAR(255)) AS tel_ben,
      CAST(b.cel_ben AS NVARCHAR(255)) AS cel_ben,
      CAST(' ' AS NVARCHAR(255)) AS email_ben,
      1 AS status, 2 AS statusFicha,
      CAST('historico' AS NVARCHAR(10)) AS origen
    FROM dbo.BENEFICIARIOS b`;

async function existeTablaLegacy(queryInterface: QueryInterface): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ existe: number }>(
    `SELECT CASE WHEN OBJECT_ID('dbo.BENEFICIARIOS', 'U') IS NULL THEN 0 ELSE 1 END AS existe`,
    { type: QueryTypes.SELECT },
  );
  return row.existe === 1;
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  const conLegacy = await existeTablaLegacy(queryInterface);
  const cuerpo = conLegacy
    ? `${SELECT_LEGACY}\n    UNION ALL\n${SELECT_PROEMPLEO}`
    : SELECT_PROEMPLEO;

  // CREATE VIEW debe ser la primera instrucción del lote, por eso se elimina
  // la vista previa en una sentencia aparte.
  await queryInterface.sequelize.query(
    `IF OBJECT_ID('${VIEW_NAME}', 'V') IS NOT NULL DROP VIEW ${VIEW_NAME}`,
  );
  await queryInterface.sequelize.query(`CREATE VIEW ${VIEW_NAME} AS\n${cuerpo}`);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `IF OBJECT_ID('${VIEW_NAME}', 'V') IS NOT NULL DROP VIEW ${VIEW_NAME}`,
  );
}
