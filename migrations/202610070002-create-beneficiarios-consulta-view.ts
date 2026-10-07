import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    CREATE VIEW dbo.beneficiarios_consulta AS
    SELECT
      b.rut_ben, b.dig_ben, b.nom_ben, b.pat_ben, b.mat_ben, b.dir_ben,
      b.reg_ben, b.ciu_ben, b.com_ben, b.civ_ben,
      CONVERT(VARCHAR(10), b.fecnac_ben, 23) AS fecnac_ben,
      b.sex_ben, b.est_ben, b.etn_ben, b.tel_ben, b.cel_ben,
      CAST(' ' AS VARCHAR(255)) AS email_ben,
      1 AS status, 2 AS statusFicha,
      CAST('historico' AS VARCHAR(10)) AS origen
    FROM dbo.BENEFICIARIOS b
    UNION ALL
    SELECT
      p.rutBeneficiario, p.digitoVerificador, p.nombres, p.apellidoPaterno,
      p.apellidoMaterno, p.direccion, p.idRegion, p.idCiudad, p.idComuna, NULL,
      CONVERT(VARCHAR(10), p.fechaNacimiento, 23),
      p.sexo, NULL, p.etnia, p.telefono, p.celular,
      p.email, p.status, p.statusFicha, CAST('proempleo' AS VARCHAR(10))
    FROM dbo.beneficiarios_proempleo p
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query('DROP VIEW dbo.beneficiarios_consulta');
}
