import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../database/sequelize";
import type { ReemplazoBenProyecto } from "./ReemplazoBenProyecto.model";
import type { DocReemplazoBenProyecto } from "./DocReemplazoBenProyecto.model";
import { ProyectoModel } from "./Proyecto.model";
import { UsuarioSicapModel } from "./UsuarioSicap.model";

export interface FlujoRegional {
  idRegion: number;
  status: number;
  fechaDesde: number;
  fechaHasta: number;
}

export class FlujoReemplazoModel extends Model<FlujoRegional> {
  declare idRegion: number;
  declare status: number;
  declare fechaDesde: number;
  declare fechaHasta: number;
}

FlujoReemplazoModel.init({
  idRegion: { type: DataTypes.INTEGER, primaryKey: true },
  status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { isIn: [[0, 1]] } },
  fechaDesde: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 20, validate: { min: 1, max: 31 } },
  fechaHasta: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 28, validate: { min: 1, max: 31 } },
}, { sequelize, tableName: "flujo_reemplazo_proempleo", schema: "dbo", timestamps: false });

type CreacionIndividual = Optional<ReemplazoBenProyecto,
  "id" | "comentarioRechazo" | "fechaAprobacionReemplazo" | "criterio_1" | "criterio_2" |
  "criterio_3" | "criterio_4" | "criterio_5" | "ponderacion" | "puntajeRsh">;

export class ReemplazoIndividualModel extends Model<ReemplazoBenProyecto, CreacionIndividual> {
  declare id: number;
  declare proyecto?: ProyectoModel;
}

function criterio() {
  return { type: DataTypes.INTEGER, allowNull: true, validate: { isInt: true, min: 0, max: 100 } };
}

ReemplazoIndividualModel.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idBeneficiarioProyecto: { type: DataTypes.INTEGER, allowNull: true },
  idBeneficiarioNuevo: { type: DataTypes.INTEGER, allowNull: false },
  idProyecto: { type: DataTypes.INTEGER, allowNull: false },
  rutUsuarioSolicitante: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pendiente",
    validate: { isIn: [["pendiente", "aprobado", "rechazado", "enRevision", "revisado"]] } },
  comentarioRechazo: { type: DataTypes.STRING(1000), allowNull: true },
  fechaSolicitudReemplazo: { type: DataTypes.DATE, allowNull: false },
  fechaAprobacionReemplazo: { type: DataTypes.DATE, allowNull: true },
  criterio_1: criterio(), criterio_2: criterio(), criterio_3: criterio(),
  criterio_4: criterio(), criterio_5: criterio(),
  ponderacion: { type: DataTypes.INTEGER, allowNull: true },
  puntajeRsh: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: "reemplazo_individual_proempleo", schema: "dbo", timestamps: false });

export class DocumentoIndividualModel extends Model<DocReemplazoBenProyecto, Optional<DocReemplazoBenProyecto, "id">> {
  declare id: number;
}

DocumentoIndividualModel.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idReemplazoBenProyecto: { type: DataTypes.INTEGER, allowNull: false },
  idDocumento: { type: DataTypes.INTEGER, allowNull: false },
  idBeneficiario: { type: DataTypes.INTEGER, allowNull: false },
  nombreArchivo: { type: DataTypes.STRING, allowNull: false },
  archivoUrl: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [["pendiente", "aprobado", "rechazado"]] } },
  comentarioRechazo: { type: DataTypes.STRING(1000), allowNull: true },
  fechaCarga: { type: DataTypes.DATE, allowNull: false },
}, { sequelize, tableName: "documento_reemplazo_individual_proempleo", schema: "dbo", timestamps: false });

ReemplazoIndividualModel.belongsTo(ProyectoModel, { foreignKey: "idProyecto", as: "proyecto", constraints: false });
ReemplazoIndividualModel.belongsTo(UsuarioSicapModel, { foreignKey: "rutUsuarioSolicitante", as: "usuarioSolicitante", constraints: false });
