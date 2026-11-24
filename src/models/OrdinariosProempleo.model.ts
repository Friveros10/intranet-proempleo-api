import { DataTypes, Model, literal } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { atributosOrdinario, type Ordinario } from './Ordinarios.model';

export class OrdinariosProempleoModel extends Model<Ordinario> {}

OrdinariosProempleoModel.init({
  ...atributosOrdinario,
  ordinario: { type: 'CHAR(8)', primaryKey: true, allowNull: false },
  fecha_documento: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_pago: { type: DataTypes.DATEONLY, allowNull: false },
  ultimo_usuario: { type: 'VARCHAR(50)', allowNull: false },
  ultima_actualizacion: { type: 'DATETIME', allowNull: false, defaultValue: literal('GETDATE()') },
}, { sequelize, schema: 'dbo', tableName: 'ordinarios_proempleo', timestamps: false });
