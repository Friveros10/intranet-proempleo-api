import { CreationAttributes, Op, Transaction, WhereOptions } from "sequelize";
import dayjs from "dayjs";
import { FlujoReemplazoModel, ReemplazoIndividualModel, DocumentoIndividualModel } from "../models/FlujoReemplazo.model";
import type { ReemplazoBenProyecto } from "../models/ReemplazoBenProyecto.model";
import type { DocReemplazoBenProyecto } from "../models/DocReemplazoBenProyecto.model";
import type { ReemplazoFiltros } from "./reemplazoBenProyecto.repository";
import { ProyectoModel } from "../models/Proyecto.model";
import { UsuarioSicapModel } from "../models/UsuarioSicap.model";
import { ComunaModel } from "../models/Comuna.model";
import { beneficiarioRepository } from "./sicap/beneficiario.repository";

async function adjuntar(registros: ReemplazoIndividualModel[]) {
  const ruts = registros.flatMap((registro) => {
    const row = registro.get();
    return row.idBeneficiarioProyecto === null
      ? [row.idBeneficiarioNuevo]
      : [row.idBeneficiarioProyecto, row.idBeneficiarioNuevo];
  });
  const resumenes = await beneficiarioRepository.findResumenesPorRuts([...new Set(ruts)]);
  return registros.map((registro) => {
    const row = registro.toJSON();
    return {
      ...row,
      flujo: "B" as const,
      beneficiarioActual: row.idBeneficiarioProyecto === null ? null : resumenes.get(row.idBeneficiarioProyecto) ?? null,
      beneficiarioNuevo: resumenes.get(row.idBeneficiarioNuevo) ?? null,
      proyecto: registro.proyecto?.toJSON() ?? null,
    };
  });
}

const include = [
  { model: ProyectoModel, as: "proyecto", include: [
    { model: ComunaModel, as: "comuna", attributes: ["cod_com", "nom_com"], required: false },
  ] },
  { model: UsuarioSicapModel, as: "usuarioSolicitante" },
];

export const flujoReemplazoRepository = {
  configuraciones() {
    return FlujoReemplazoModel.findAll();
  },
  // Si la región no tiene registro, se crea con los valores por defecto
  // (status 0, período 20-28) para que siempre exista configuración.
  async configuracion(idRegion: number, transaction?: Transaction) {
    const [config] = await FlujoReemplazoModel.findOrCreate({
      where: { idRegion },
      defaults: { idRegion, status: 0, fechaDesde: 20, fechaHasta: 28 },
      transaction,
    });
    return config;
  },
  async configurar(idRegion: number, status: number, transaction?: Transaction) {
    const config = await this.configuracion(idRegion, transaction);
    config.status = status;
    await config.save({ transaction });
    return { idRegion, status };
  },
  async configurarPeriodo(idRegion: number, fechaDesde: number, fechaHasta: number, transaction?: Transaction) {
    const config = await this.configuracion(idRegion, transaction);
    config.fechaDesde = fechaDesde;
    config.fechaHasta = fechaHasta;
    await config.save({ transaction });
    return { idRegion, fechaDesde, fechaHasta };
  },
  async listar(filtros: ReemplazoFiltros) {
    const where: WhereOptions<ReemplazoBenProyecto> = {};
    if (filtros.status) where.status = filtros.status;
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fechaSolicitudReemplazo = {
        ...(filtros.fechaDesde ? { [Op.gte]: dayjs(filtros.fechaDesde).startOf("day").toDate() } : {}),
        ...(filtros.fechaHasta ? { [Op.lte]: dayjs(filtros.fechaHasta).endOf("day").toDate() } : {}),
      };
    }
    const proyectoWhere: WhereOptions = {
      ...(filtros.region !== undefined ? { reg_pro: filtros.region } : {}),
      ...(filtros.comuna !== undefined ? { com_pro: filtros.comuna } : {}),
    };
    const registros = await ReemplazoIndividualModel.findAll({
      where,
      include: [
        { ...include[0], where: proyectoWhere, required: true },
        include[1],
      ],
      order: [["id", "DESC"]],
    });
    return adjuntar(registros);
  },
  async obtener(id: number) {
    const registro = await ReemplazoIndividualModel.findByPk(id, { include });
    return registro ? (await adjuntar([registro]))[0] : null;
  },
  crear(data: CreationAttributes<ReemplazoIndividualModel>, transaction: Transaction) {
    return ReemplazoIndividualModel.create(data, { transaction });
  },
  actualizar(id: number, data: Partial<ReemplazoBenProyecto>, transaction?: Transaction) {
    return ReemplazoIndividualModel.update(data, { where: { id }, transaction });
  },
  eliminar(id: number, transaction: Transaction) {
    return ReemplazoIndividualModel.destroy({ where: { id }, transaction });
  },
  documentos(idReemplazoBenProyecto: number) {
    return DocumentoIndividualModel.findAll({ where: { idReemplazoBenProyecto }, order: [["idDocumento", "ASC"]] });
  },
  documento(id: number) {
    return DocumentoIndividualModel.findByPk(id);
  },
  crearDocumento(data: Omit<DocReemplazoBenProyecto, "id">, transaction: Transaction) {
    return DocumentoIndividualModel.create(data, { transaction });
  },
  actualizarDocumento(id: number, data: Partial<DocReemplazoBenProyecto>, transaction?: Transaction) {
    return DocumentoIndividualModel.update(data, { where: { id }, transaction });
  },
  eliminarDocumentos(idReemplazoBenProyecto: number, transaction: Transaction) {
    return DocumentoIndividualModel.destroy({ where: { idReemplazoBenProyecto }, transaction });
  },
};
