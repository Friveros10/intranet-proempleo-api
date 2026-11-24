import { DataTypes, Model, type ModelAttributes } from "sequelize";
import { sequelize } from "../database/sequelize";

export interface Ordinario {
  ordinario: string;
  fecha_documento: string | null;
  fecha_pago: string | null;
  ultimo_usuario: string | null;
  ultima_actualizacion: Date | null;
}

export const atributosOrdinario: ModelAttributes<
  Model<Ordinario>,
  Ordinario
> = {
  ordinario: { type: "VARCHAR(50)", primaryKey: true, allowNull: false },
  fecha_documento: { type: DataTypes.DATEONLY, allowNull: true },
  fecha_pago: { type: DataTypes.DATEONLY, allowNull: true },
  ultimo_usuario: { type: "VARCHAR(50)", allowNull: true },
  ultima_actualizacion: { type: "DATETIME", allowNull: true },
};

// Tabla histórica consultada por el repositorio de ordinarios.
export class OrdinariosModel extends Model<Ordinario> {}

OrdinariosModel.init(atributosOrdinario, {
  sequelize,
  schema: "dbo",
  tableName: "ORDINARIOS",
  timestamps: false,
});
