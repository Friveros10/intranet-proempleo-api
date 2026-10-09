import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize";

export interface AuditoriaBioBio {
  RUT: string;
  comuna: string;
  ejecutor: string;
  nombres: string;
  pat: string;
  mat: string;
  proyecto: string;
}

export class AuditoriaBioBioModel
  extends Model<AuditoriaBioBio, AuditoriaBioBio>
  implements AuditoriaBioBio
{
  declare RUT: string;
  declare comuna: string;
  declare ejecutor: string;
  declare nombres: string;
  declare pat: string;
  declare mat: string;
  declare proyecto: string;
}

AuditoriaBioBioModel.init(
  {
    RUT: { type: DataTypes.STRING, primaryKey: true },
    comuna: { type: DataTypes.STRING },
    ejecutor: { type: DataTypes.STRING },
    nombres: { type: DataTypes.STRING },
    pat: { type: DataTypes.STRING },
    mat: { type: DataTypes.STRING },
    proyecto: { type: DataTypes.STRING },
  },
  {
    sequelize,
    tableName: "Listado_AuditoriaBiobio",
    schema: "dbo",
    timestamps: false,
  },
);
