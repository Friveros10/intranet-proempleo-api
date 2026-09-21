import { QueryTypes } from 'sequelize';
import { sequelize } from '../../database/sequelize';

export interface RegionRow {
  cod_region: number;
  nom_region: string;
}

export const regionRepository = {
  // Sin modelo Sequelize propio: dbo.REGIONES solo se usa como catálogo de solo lectura
  async findAll(): Promise<RegionRow[]> {
    return sequelize.query<RegionRow>(
      `SELECT cod_region, Nom_region AS nom_region
         FROM dbo.REGIONES
        ORDER BY cod_region`,
      { type: QueryTypes.SELECT }
    );
  },
};
