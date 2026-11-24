import { DataTypes, Model, type ModelAttributes } from "sequelize";
import { sequelize } from "../database/sequelize";

export interface Transferencia {
  ordinario: string;
  folio: number;
  correlativo: number;
  monto: string;
  estado: string | null;
  ingreso: Date | null;
  observaciones: string | null;
  ultimo_usuario: string | null;
  ultima_actualizacion: Date | null;
  lisben_trans: string | null;
  lisbenfec_trans: Date | null;
  lisbenord_trans: string | null;
  ren_trans: string | null;
  renfec_trans: Date | null;
  renord_trans: string | null;
  ficpro_trans: string | null;
  ficprofec_trans: Date | null;
  ficproord_trans: string | null;
  coming_trans: string | null;
  comingfec_trans: Date | null;
  comingord_trans: string | null;
  fec_trans: Date | null;
  fol_dec: string | null;
}

export const atributosTransferencia: ModelAttributes<
  Model<Transferencia>,
  Transferencia
> = {
  ordinario: { type: "VARCHAR(50)", primaryKey: true, allowNull: false },
  folio: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  correlativo: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  monto: "NUMERIC(18,0)",
  estado: "VARCHAR(50)",
  ingreso: "DATETIME",
  observaciones: "VARCHAR(250)",
  ultimo_usuario: "VARCHAR(50)",
  ultima_actualizacion: "DATETIME",
  lisben_trans: "VARCHAR(50)",
  lisbenfec_trans: "DATETIME",
  lisbenord_trans: "VARCHAR(50)",
  ren_trans: "VARCHAR(50)",
  renfec_trans: "DATETIME",
  renord_trans: "VARCHAR(50)",
  ficpro_trans: "VARCHAR(50)",
  ficprofec_trans: "DATETIME",
  ficproord_trans: "VARCHAR(50)",
  coming_trans: "VARCHAR(50)",
  comingfec_trans: "DATETIME",
  comingord_trans: "VARCHAR(50)",
  fec_trans: "DATETIME",
  fol_dec: "CHAR(8)",
};

// Tabla histórica consultada por el repositorio de transferencias.
export class TransferenciasModel extends Model<Transferencia> {}

TransferenciasModel.init(atributosTransferencia, {
  sequelize,
  schema: "dbo",
  tableName: "TRANSFERENCIAS",
  timestamps: false,
});
