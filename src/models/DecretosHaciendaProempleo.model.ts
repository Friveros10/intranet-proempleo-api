import { Model } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { DecretoHacienda } from './DecretosHacienda.model';

export class DecretosHaciendaProempleoModel extends Model<DecretoHacienda> {}

DecretosHaciendaProempleoModel.init({
  fol_dechac: { type: 'VARCHAR(50)', primaryKey: true, allowNull: false },
  fec_dechac: { type: 'DATETIME', allowNull: false },
  mon_dechac: { type: 'NUMERIC(18,0)', allowNull: false },
  obs_dechac: 'VARCHAR(200)',
  est_dechac: 'VARCHAR(50)',
  usu_cre: 'VARCHAR(50)',
  fec_cre: 'DATETIME',
  usu_mod: 'VARCHAR(50)',
  fec_mod: 'DATETIME',
  usu_eli: 'VARCHAR(50)',
  fec_eli: 'DATETIME',
}, { sequelize, schema: 'dbo', tableName: 'dechacienda_proempleo', timestamps: false });
