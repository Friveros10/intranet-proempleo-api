import { Model, type Optional } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { atributosDetReintegro, type DetReintegro } from './DetReintegro.model';

export class DetReintegroProempleoModel extends Model<DetReintegro, Optional<DetReintegro, 'corr_detrei'>> {}
DetReintegroProempleoModel.init(atributosDetReintegro, {
  sequelize, schema: 'dbo', tableName: 'detreintegro_proempleo', timestamps: false,
});
