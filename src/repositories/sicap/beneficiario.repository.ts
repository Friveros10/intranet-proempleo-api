import { QueryTypes } from 'sequelize';
import { BeneficiarioModel } from '../../models/Beneficiario.model';
import { sequelize } from '../../database/sequelize';

export interface FichaBeneficiarioRow {
  rut_ben: number;
  nom_ben: string | null;
  pat_ben: string | null;
  mat_ben: string | null;
  dir_ben: string | null;
  reg_ben: number | null;
  nombre_region: string | null;
  ciu_ben: number | null;
  nombre_ciudad: string | null;
  com_ben: number | null;
  nombre_comuna: string | null;
  civ_ben: number | null;
  ultimo_mes_benpro: number | null;
  ultimo_ano_benpro: number | null;
  folio_vigente: number;
}

export const beneficiarioRepository = {
  async findAll(): Promise<BeneficiarioModel[]> {
    return BeneficiarioModel.findAll();
  },

  async findByRut(rut_ben: number): Promise<BeneficiarioModel | null> {
    return BeneficiarioModel.findByPk(rut_ben);
  },

  async create(data: {
    rut_ben: number;
    dig_ben: string;
    nom_ben: string;
    pat_ben: string;
    mat_ben: string;
    dir_ben: string | null;
    fecnac_ben: string;
  }): Promise<BeneficiarioModel> {
    // Insert crudo: Sequelize serializa DataTypes.DATE con offset de zona horaria,
    // lo que SQL Server rechaza para la columna datetime fecnac_ben.
    await sequelize.query(
      `INSERT INTO dbo.BENEFICIARIOS (rut_ben, dig_ben, nom_ben, pat_ben, mat_ben, dir_ben, fecnac_ben)
       VALUES (:rut_ben, :dig_ben, :nom_ben, :pat_ben, :mat_ben, :dir_ben, :fecnac_ben)`,
      { replacements: data, type: QueryTypes.INSERT }
    );
    return BeneficiarioModel.findByPk(data.rut_ben) as Promise<BeneficiarioModel>;
  },

  // Usa una query directa porque REGIONES, CIUDADES y COMUNAS aún no tienen modelo Sequelize
  async findByRutFromBenPro(rut_ben: number): Promise<FichaBeneficiarioRow | null> {
    const rows = await sequelize.query<FichaBeneficiarioRow>(
      `SELECT
          b.rut_ben,
          b.nom_ben,
          b.pat_ben,
          b.mat_ben,
          b.dir_ben,
          b.reg_ben,
          r.Nom_region AS nombre_region,
          b.ciu_ben,
          c.nom_ciu AS nombre_ciudad,
          b.com_ben,
          co.nom_com AS nombre_comuna,
          b.civ_ben,
          bp.mes_benpro as ultimo_mes_benpro,
          bp.ANO_benpro as ultimo_ano_benpro,
          bp.folio_vigente as folio_vigente
      FROM dbo.BENEFICIARIOS b
      LEFT JOIN dbo.REGIONES r
          ON b.reg_ben = r.cod_region
      LEFT JOIN dbo.CIUDADES c
          ON b.ciu_ben = c.cod_ciu
      LEFT JOIN dbo.COMUNAS co
          ON b.com_ben = co.cod_com
      OUTER APPLY (
          SELECT TOP 1
              mes_benpro,
              ANO_benpro,
              fol_pro as folio_vigente
          FROM dbo.BENPRO
          WHERE rut_ben = b.rut_ben
          ORDER BY ano_BenPro desc, mes_benpro DESC
      ) bp
      WHERE b.rut_ben = :rut_ben`,
      { replacements: { rut_ben }, type: QueryTypes.SELECT }
    );
    return rows[0] ?? null;
  },
};
