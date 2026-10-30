import { Op, QueryTypes, Transaction, WhereOptions } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { ReemplazoBenProyectoModel, ReemplazoStatus } from '../models/ReemplazoBenProyecto.model';
import { DocReemplazoBenProyectoModel } from '../models/DocReemplazoBenProyecto.model';
import { ProyectoModel } from '../models/Proyecto.model';
import { UsuarioSicapModel } from '../models/UsuarioSicap.model';
import { ComunaModel } from '../models/Comuna.model';
import { beneficiarioRepository } from './sicap/beneficiario.repository';
import dayjs from 'dayjs';

export interface ReemplazoFiltros {
  region?: number;
  comuna?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  status?: ReemplazoStatus;
}

// Adjunta los datos del beneficiario actual y del nuevo a cada reemplazo. Ya no
// se puede usar un include a BeneficiarioModel porque los beneficiarios nuevos
// viven en beneficiarios_proempleo; se resuelven en ambas tablas con una sola
// query. Quedan en dataValues, por lo que se serializan en el JSON de salida
// igual que antes (claves beneficiarioActual / beneficiarioNuevo).
async function adjuntarBeneficiarios(
  reemplazos: ReemplazoBenProyectoModel[],
): Promise<void> {
  const ruts = new Set<number>();
  for (const reemplazo of reemplazos) {
    if (reemplazo.idBeneficiarioProyecto !== null) {
      ruts.add(reemplazo.idBeneficiarioProyecto);
    }
    ruts.add(reemplazo.idBeneficiarioNuevo);
  }
  const resumenes = await beneficiarioRepository.findResumenesPorRuts([...ruts]);
  for (const reemplazo of reemplazos) {
    const dataValues = reemplazo.dataValues as unknown as Record<string, unknown>;
    dataValues.beneficiarioActual =
      reemplazo.idBeneficiarioProyecto === null
        ? null
        : (resumenes.get(reemplazo.idBeneficiarioProyecto) ?? null);
    dataValues.beneficiarioNuevo =
      resumenes.get(reemplazo.idBeneficiarioNuevo) ?? null;
  }
}

// Adjunta la entidad ejecutora de cada proyecto (PROYECTOS.ruteje_pro) a cada
// reemplazo, resolviendo el nombre en el UNION de EJECUTORES (legacy) y
// ejecutores_proempleo. Queda en dataValues.ejecutor para el informe de
// resultado del proceso de selección.
async function adjuntarEjecutores(
  reemplazos: ReemplazoBenProyectoModel[],
): Promise<void> {
  const ruts = new Set<number>();
  for (const reemplazo of reemplazos) {
    const rut = parseRutEjecutor(rutejeProDe(reemplazo));
    if (rut !== null) ruts.add(rut);
  }
  if (ruts.size === 0) return;

  const ejecutores = await sequelize.query<{ rut_eje: number; nom_eje: string | null }>(
    `SELECT rut_eje, nom_eje FROM (
       SELECT rut_eje, nom_eje, 0 AS prioridad FROM dbo.ejecutores_proempleo
       UNION ALL
       SELECT rut_eje, nom_eje, 1 AS prioridad FROM dbo.EJECUTORES
     ) e WHERE rut_eje IN (:ruts)
     ORDER BY rut_eje, prioridad`,
    { type: QueryTypes.SELECT, replacements: { ruts: [...ruts] } },
  );
  const porRut = new Map<number, string | null>();
  for (const ejecutor of ejecutores) {
    if (!porRut.has(ejecutor.rut_eje)) porRut.set(ejecutor.rut_eje, ejecutor.nom_eje);
  }

  for (const reemplazo of reemplazos) {
    const dataValues = reemplazo.dataValues as unknown as Record<string, unknown>;
    const rut = parseRutEjecutor(rutejeProDe(reemplazo));
    dataValues.ejecutor =
      rut !== null && porRut.has(rut) ? { rut_eje: rut, nom_eje: porRut.get(rut) } : null;
  }
}

// El proyecto incluido queda en dataValues y no en la interfaz del modelo,
// por lo que se lee con el mismo patrón que adjuntarBeneficiarios.
function rutejeProDe(reemplazo: ReemplazoBenProyectoModel): string | number | null {
  const proyecto = (reemplazo.dataValues as unknown as Record<string, unknown>)
    .proyecto as { ruteje_pro?: string | number | null } | undefined;
  return proyecto?.ruteje_pro ?? null;
}

// PROYECTOS.ruteje_pro puede venir como número (65064423) o texto ("12345678-9");
// solo interesa la parte numérica del RUT para buscar en las tablas de ejecutores.
function parseRutEjecutor(rutejePro: string | number | null | undefined): number | null {
  if (rutejePro === null || rutejePro === undefined) return null;
  const texto = String(rutejePro);
  const rut = Number(texto.split('-')[0].replace(/\D/g, ''));
  return Number.isInteger(rut) && rut > 0 ? rut : null;
}

export const reemplazoBenProyectoRepository = {
  async findAll(filtros: ReemplazoFiltros = {}): Promise<ReemplazoBenProyectoModel[]> {
    const where: WhereOptions = {};

    if (filtros.status) {
      where.status = filtros.status;
    }

    
    if (filtros.fechaDesde || filtros.fechaHasta) {
      const fechaDesde = filtros.fechaDesde
        ? dayjs(filtros.fechaDesde).startOf('day').toDate()
        : null;
  
      const fechaHasta = filtros.fechaHasta
        ? dayjs(filtros.fechaHasta).endOf('day').toDate()
        : null;
      where.fechaSolicitudReemplazo = {
        ...(fechaDesde ? { [Op.gte]: fechaDesde } : {}),
        ...(fechaHasta ? { [Op.lte]: fechaHasta } : {}),
      };
    }

    const whereProyecto: WhereOptions = {};
    if (filtros.region) whereProyecto.reg_pro = filtros.region;
    if (filtros.comuna) whereProyecto.com_pro = filtros.comuna;
    const filtraProyecto = Boolean(filtros.region || filtros.comuna);

    const reemplazos = await ReemplazoBenProyectoModel.findAll({
      where,
      include: [
        {
          model: ProyectoModel,
          as: 'proyecto',
          where: filtraProyecto ? whereProyecto : undefined,
          required: filtraProyecto,
          include: [
            { model: ComunaModel, as: 'comuna', attributes: ['cod_com', 'nom_com'], required: false },
          ],
        },
        { model: UsuarioSicapModel, as: 'usuarioSolicitante' },
      ],
      order: [['id', 'DESC']]
    });
    await adjuntarBeneficiarios(reemplazos);
    await adjuntarEjecutores(reemplazos);
    return reemplazos;
  },

  async findById(id: number): Promise<ReemplazoBenProyectoModel | null> {
    const reemplazo = await ReemplazoBenProyectoModel.findByPk(id, {
      include: [
        { model: ProyectoModel, as: 'proyecto' },
        { model: UsuarioSicapModel, as: 'usuarioSolicitante' },
        { model: DocReemplazoBenProyectoModel, as: 'documentos' },
      ],
    });
    if (reemplazo) {
      await adjuntarBeneficiarios([reemplazo]);
      await adjuntarEjecutores([reemplazo]);
    }
    return reemplazo;
  },

  async create(data: {
    idBeneficiarioProyecto: number | null;
    idBeneficiarioNuevo: number;
    idProyecto: number;
    rutUsuarioSolicitante: number;
    puntajeRsh: number | null;
    fechaSolicitudReemplazo: string;
  }): Promise<ReemplazoBenProyectoModel> {
    return ReemplazoBenProyectoModel.create({
      ...data,
      status: 'pendiente',
      fechaAprobacionReemplazo: null,
    });
  },

  async actualizarEstado(
    id: number,
    status: ReemplazoStatus,
    comentarioRechazo: string | null = null,
    transaction?: Transaction,
  ): Promise<ReemplazoBenProyectoModel | null> {
    const reemplazo = await ReemplazoBenProyectoModel.findByPk(id, { transaction });
    if (!reemplazo) return null;
    reemplazo.status = status;
    reemplazo.comentarioRechazo = comentarioRechazo;
    reemplazo.fechaAprobacionReemplazo = new Date().toISOString();
    await reemplazo.save({ transaction });
    return reemplazo;
  },

  async findByIds(ids: number[]): Promise<ReemplazoBenProyectoModel[]> {
    const reemplazos = await ReemplazoBenProyectoModel.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        { model: ProyectoModel, as: 'proyecto' },
        { model: UsuarioSicapModel, as: 'usuarioSolicitante' },
      ],
      order: [['id', 'ASC']],
    });
    await adjuntarBeneficiarios(reemplazos);
    await adjuntarEjecutores(reemplazos);
    return reemplazos;
  },

  async actualizarChecklist(
    id: number,
    data: {
      criterio_1: number;
      criterio_2: number;
      criterio_3: number;
      criterio_4: number;
      criterio_5: number | null;
      ponderacion: number;
    },
    transaction?: Transaction,
  ): Promise<boolean> {
    const [filasActualizadas] = await ReemplazoBenProyectoModel.update(data, { where: { id }, transaction });
    return filasActualizadas > 0;
  },

  async eliminar(id: number): Promise<boolean> {
    const filasEliminadas = await ReemplazoBenProyectoModel.destroy({ where: { id } });
    return filasEliminadas > 0;
  },
};
