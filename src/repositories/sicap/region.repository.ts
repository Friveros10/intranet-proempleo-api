import { QueryTypes } from 'sequelize';
import { sequelize } from '../../database/sequelize';
// import { RegionModel } from '../../models/Region.model';

export interface RegionRow {
  cod_region: number;
  nom_region: string;
}

export interface ComunaRow {
  cod_com: number;
  nom_com: string;
}

export const regionRepository = {
  async findRegionesActivas(): Promise<RegionRow[]> {
    return sequelize.query<RegionRow>(
      `SELECT cod_region, Nom_region AS nom_region
         FROM dbo.REGIONES
         where cod_region IN (5, 8, 10, 14, 16, 9)
        ORDER BY cod_region`,
      { type: QueryTypes.SELECT }
    );
  },
  // Sin modelo Sequelize propio: dbo.REGIONES solo se usa como catálogo de solo lectura
  async findAll(): Promise<RegionRow[]> {
    return sequelize.query<RegionRow>(
      `SELECT cod_region, Nom_region AS nom_region
         FROM dbo.REGIONES
        ORDER BY cod_region`,
      { type: QueryTypes.SELECT }
    );
  },

  async findComunasByRegion(region: number): Promise<ComunaRow[]> {
    return sequelize.query<ComunaRow>(
      `SELECT co.cod_com, co.nom_com
         FROM dbo.COMUNAS co
         JOIN dbo.CIUDADES ci ON ci.cod_ciu = co.cod_ciu
        WHERE ci.cod_reg = :region
        ORDER BY co.nom_com`,
      { type: QueryTypes.SELECT, replacements: { region } }
    );
  },
};
