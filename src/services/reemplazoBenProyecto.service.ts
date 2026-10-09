import { Request } from "express";
import { sequelize } from "../database/sequelize";
import {
  reemplazoBenProyectoRepository,
  ReemplazoFiltros,
} from "../repositories/reemplazoBenProyecto.repository";
import { docReemplazoBenProyectoRepository } from "../repositories/docReemplazoBenProyecto.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { beneficiarioRepository } from "../repositories/sicap/beneficiario.repository";
import { proyectoRepository } from "../repositories/sicap/proyecto.repository";
import { regionRepository } from "../repositories/sicap/region.repository";
import { usuarioSicapRepository } from "../repositories/sicap/usuarioSicap.repository";
import { planEgresoHistoricoService } from "./planEgresoHistorico.service";
import { AppError } from "../utils/AppError";
import { parseRut } from "../utils/rut";
import {
  DOCUMENTOS_REEMPLAZO,
  esDocumentoReemplazoValido,
} from "../constants/documentosReemplazo";
import { guardarDocumentoEnDisco } from "../middlewares/upload.middleware";
import {
  CrearReemplazoInput,
  ActualizarChecklistReemplazoInput,
} from "../validations/reemplazoBenProyecto.validation";
import {
  ReemplazoBenProyectoModel,
  ReemplazoStatus,
} from "../models/ReemplazoBenProyecto.model";
import {
  CAMPOS_CHECKLIST_REEMPLAZO,
  puedeGestionarChecklist,
} from "../constants/checklist.constants";

const PERMISO_VER_TODAS_REGIONES = "REM_VERALL";
const PERMISO_APROBAR = "REM_APROB";
const PERMISO_RECHAZAR = "REM_RECHAZ";

function puntajeRshAutomatico(puntaje: number | null): number | null {
  if (puntaje === null || !Number.isFinite(puntaje)) return null;
  if (puntaje <= 40) return 100;
  if (puntaje <= 60) return 50;
  return 0;
}

function puntajeEdadAutomatico(fechaNacimiento: Date | null): number | null {
  if (!fechaNacimiento || Number.isNaN(fechaNacimiento.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - fechaNacimiento.getUTCFullYear();
  const diferenciaMes = hoy.getUTCMonth() - fechaNacimiento.getUTCMonth();
  if (
    diferenciaMes < 0 ||
    (diferenciaMes === 0 && hoy.getUTCDate() < fechaNacimiento.getUTCDate())
  ) {
    edad -= 1;
  }

  if (edad < 18) return null;
  if (edad <= 35) return 0;
  if (edad <= 45) return 50;
  return 100;
}

// Lee la fecha de nacimiento del beneficiario nuevo desde los datos adjuntos al
// reemplazo. El repositorio los deja en dataValues (vienen del UNION entre
// BENEFICIARIOS y beneficiarios_proempleo), por lo que se leen vía toJSON().
function fechaNacimientoBeneficiarioNuevo(
  reemplazo: ReemplazoBenProyectoModel,
): Date | null {
  const beneficiario = (reemplazo.toJSON() as unknown as Record<string, unknown>)
    .beneficiarioNuevo as { fecnac_ben?: string | Date | null } | null | undefined;
  const valor = beneficiario?.fecnac_ben;
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Lee el proyecto asociado al reemplazo. Los includes quedan en dataValues y no
// se exponen como propiedad directa de la instancia, por lo que se leen vía
// toJSON().
export function obtenerProyectoReemplazo(
  reemplazo: ReemplazoBenProyectoModel | null | undefined,
): { reg_pro: number | null; fol_pro: number } | null {
  if (!reemplazo) return null;
  const proyecto = (reemplazo.toJSON() as unknown as Record<string, unknown>)
    .proyecto as { reg_pro: number | null; fol_pro: number } | null | undefined;
  return proyecto ?? null;
}

interface ContextoUsuario {
  regionUsuario: number | null;
  puedeVerTodasLasRegiones: boolean;
  permisos: string[];
}

async function obtenerContextoUsuario(
  rutUsuario: number,
): Promise<ContextoUsuario> {
  const [usuario, permisos] = await Promise.all([
    usuarioSicapRepository.findByRut(rutUsuario),
    usuarioSicapRepository.getPermisosDeUsuario(rutUsuario),
  ]);

  return {
    regionUsuario: usuario?.reg_usu ?? null,
    puedeVerTodasLasRegiones: permisos.includes(PERMISO_VER_TODAS_REGIONES),
    permisos,
  };
}

function aplicarVisibilidadChecklist(
  reemplazo: ReemplazoBenProyectoModel,
  rolesUsuario: string[],
) {
  const data = reemplazo.toJSON() as unknown as Record<string, unknown>;
  if (!puedeGestionarChecklist(rolesUsuario)) {
    for (const campo of CAMPOS_CHECKLIST_REEMPLAZO) delete data[campo];
  }
  return data;
}

export const reemplazoBenProyectoService = {
  // Un usuario sin permiso "ver todas las regiones" (ej. INTENDENCIA) solo ve los
  // reemplazos de proyectos de su propia región, sin importar lo que pida por query.
  async listar(
    filtros: ReemplazoFiltros,
    rutUsuario: number,
    rolesUsuario: string[] = [],
  ) {
    const contexto = await obtenerContextoUsuario(rutUsuario);
    const region = contexto.puedeVerTodasLasRegiones
      ? filtros.region
      : (contexto.regionUsuario ?? -1);
    const reemplazos = await reemplazoBenProyectoRepository.findAll({
      ...filtros,
      region: region ?? undefined,
    });
    return reemplazos.map((reemplazo) =>
      aplicarVisibilidadChecklist(reemplazo, rolesUsuario),
    );
  },

  async listarRegiones() {
    return regionRepository.findAll();
  },
  async listarRegionesActivas() {
    return regionRepository.findRegionesActivas();
  },

  async listarComunas(region: number | undefined, rutUsuario: number) {
    const contexto = await obtenerContextoUsuario(rutUsuario);
    const regionEfectiva = contexto.puedeVerTodasLasRegiones
      ? region
      : (contexto.regionUsuario ?? -1);
    if (!regionEfectiva) return [];
    return regionRepository.findComunasByRegion(regionEfectiva);
  },

  async obtenerPorId(
    id: number,
    rutUsuario: number,
    rolesUsuario: string[] = [],
  ) {
    const reemplazo = await reemplazoBenProyectoRepository.findById(id);
    if (!reemplazo) {
      throw new AppError("Reemplazo no encontrado", 404);
    }

    const contexto = await obtenerContextoUsuario(rutUsuario);
    if (
      !contexto.puedeVerTodasLasRegiones &&
      obtenerProyectoReemplazo(reemplazo)?.reg_pro !== contexto.regionUsuario
    ) {
      throw new AppError("No tiene acceso a este registro", 403);
    }

    return aplicarVisibilidadChecklist(reemplazo, rolesUsuario);
  },

  // Crea la solicitud, el beneficiario nuevo (si no existe) y los documentos, todo junto
  async crear(
    data: CrearReemplazoInput,
    archivos: Express.Multer.File[],
    rutUsuarioSolicitante: number,
    req: Request,
  ) {
    // console.log("[reemplazoBenProyectoService.crear] data recibida:", data);
    // console.log("[reemplazoBenProyectoService.crear] cantidad de archivos:", archivos.length);
    const [beneficiarioActual, proyecto, contexto] = await Promise.all([
      data.cupoCobertura
        ? Promise.resolve(null)
        : beneficiarioRepository.findByRut(data.idBeneficiarioProyecto!),
      proyectoRepository.findByFolioConCupo(data.idProyecto),
      obtenerContextoUsuario(rutUsuarioSolicitante),
    ]);

    if (!data.cupoCobertura && !beneficiarioActual) {
      throw new AppError("El beneficiario a reemplazar no existe", 404);
    }
    if (!proyecto) {
      throw new AppError("El proyecto no existe", 404);
    }
    if (
      data.cupoCobertura &&
      (proyecto.cuposDisponibles === null || proyecto.cuposDisponibles <= 0)
    ) {
      throw new AppError("El proyecto no tiene cupos de cobertura disponibles", 409);
    }

    // Roles regionales (ej. INTENDENCIA) solo pueden solicitar dentro de su región.
    if (
      !contexto.puedeVerTodasLasRegiones &&
      proyecto.reg_pro !== contexto.regionUsuario
    ) {
      throw new AppError("El proyecto no pertenece a tu zona", 403);
    }

    if (data.documentos.length !== archivos.length) {
      throw new AppError(
        "La cantidad de documentos no coincide con los archivos recibidos",
        400,
      );
    }
    const candidatos = data.nuevosBeneficiarios.map((beneficiario) => ({
      beneficiario,
      ...parseRut(beneficiario.rut),
    }));
    if (
      new Set(candidatos.map((candidato) => candidato.cuerpo)).size !==
      candidatos.length
    ) {
      throw new AppError(
        "Los RUT de los nuevos beneficiarios no pueden repetirse",
        400,
      );
    }
    await Promise.all(
      candidatos.map((candidato) =>
        planEgresoHistoricoService.validarPuedeIngresarPorRun(candidato.cuerpo),
      ),
    );

    const documentosPorRut = new Map<
      number,
      { idDocumento: number; archivo: Express.Multer.File }[]
    >();
    for (let index = 0; index < data.documentos.length; index += 1) {
      const documento = data.documentos[index];
      const { cuerpo } = parseRut(documento.rut);
      if (
        !candidatos.some((candidato) => candidato.cuerpo === cuerpo) ||
        !esDocumentoReemplazoValido(documento.idDocumento)
      ) {
        throw new AppError(
          "idDocumento no corresponde a un documento válido",
          400,
        );
      }
      const documentos = documentosPorRut.get(cuerpo) ?? [];
      documentos.push({
        idDocumento: documento.idDocumento,
        archivo: archivos[index],
      });
      documentosPorRut.set(cuerpo, documentos);
    }
    for (const candidato of candidatos) {
      const documentos = documentosPorRut.get(candidato.cuerpo) ?? [];
      const ids = documentos.map((documento) => documento.idDocumento);
      if (
        documentos.length !== DOCUMENTOS_REEMPLAZO.length ||
        new Set(ids).size !== DOCUMENTOS_REEMPLAZO.length ||
        !DOCUMENTOS_REEMPLAZO.every((tipo) => ids.includes(tipo.id))
      ) {
        throw new AppError(
          `Debes adjuntar todos los documentos requeridos para ${candidato.beneficiario.rut}`,
          400,
        );
      }
    }

    const reemplazos = [];
    const fechaSolicitudReemplazo = new Date().toISOString();
    for (const candidato of candidatos) {
      // console.log("[reemplazoBenProyectoService.crear] procesando candidato:", candidato.cuerpo);
      const beneficiarioNuevoExistente = await beneficiarioRepository.findByRut(
        candidato.cuerpo,
      );
      if (!beneficiarioNuevoExistente) {
        // console.log("[reemplazoBenProyectoService.crear] beneficiario no existe, creando:", candidato.beneficiario);
        await beneficiarioRepository.createProempleo({
          rut_ben: candidato.cuerpo,
          dig_ben: candidato.dv,
          nom_ben: candidato.beneficiario.nombres,
          pat_ben: candidato.beneficiario.apellidoPaterno,
          mat_ben: candidato.beneficiario.apellidoMaterno,
          dir_ben: candidato.beneficiario.direccion ?? null,
          fecnac_ben: candidato.beneficiario.fechaNacimiento,
          reg_ben: contexto.regionUsuario ?? null,
          sex_ben: candidato.beneficiario.genero ?? null,
          etn_ben: candidato.beneficiario.etnia ?? null,
          nivedu_ben: candidato.beneficiario.educacion ?? null,
          usu_cre: String(rutUsuarioSolicitante),
          fec_cre: new Date(),
          statusFicha: 1,
        });
        // console.log("[reemplazoBenProyectoService.crear] beneficiario creado para rut:", candidato.cuerpo);
      }

      const reemplazo = await reemplazoBenProyectoRepository.create({
        idBeneficiarioProyecto: data.cupoCobertura
          ? null
          : data.idBeneficiarioProyecto!,
        idBeneficiarioNuevo: candidato.cuerpo,
        idProyecto: data.idProyecto,
        rutUsuarioSolicitante,
        puntajeRsh: candidato.beneficiario.puntajeRsh ?? null,
        fechaSolicitudReemplazo,
      });
      // console.log("[reemplazoBenProyectoService.crear] reemplazo creado con id:", reemplazo.id);
      for (const documento of documentosPorRut.get(candidato.cuerpo) ?? []) {
        const archivoUrl = guardarDocumentoEnDisco(
          reemplazo.id,
          documento.archivo,
        );
        await docReemplazoBenProyectoRepository.create({
          idReemplazoBenProyecto: reemplazo.id,
          idDocumento: documento.idDocumento,
          idBeneficiario: candidato.cuerpo,
          nombreArchivo: documento.archivo.originalname,
          archivoUrl,
        });
      }
      await auditLogRepository.registrar({
        usuarioId: rutUsuarioSolicitante,
        accion: "REEMPLAZO_CREADO",
        modulo: "REEMPLAZOS",
        entidad: "Reemplazo_benpro",
        registroId: String(reemplazo.id),
        region: proyecto.reg_pro ?? null,
        detalle: data.cupoCobertura
          ? `Solicitud de Cupo de Cobertura creada para proyecto ${data.idProyecto}`
          : `Solicitud de Reemplazo de Cupo creada para proyecto ${data.idProyecto}`,
        req,
      });
      reemplazos.push(
        await reemplazoBenProyectoRepository.findById(reemplazo.id),
      );
    }
    return reemplazos;
  },

  async actualizarEstado(
    id: number,
    status: ReemplazoStatus,
    rutUsuario: number,
    req: Request,
    comentarioRechazo?: string | null,
  ) {
    const contexto = await obtenerContextoUsuario(rutUsuario);
    const permisoRequerido =
      status === "aprobado" ? PERMISO_APROBAR : PERMISO_RECHAZAR;
    if (!contexto.permisos.includes(permisoRequerido)) {
      throw new AppError("No tiene permisos para realizar esta acción", 403);
    }

    const reemplazoActual = await reemplazoBenProyectoRepository.findById(id);
    const comentario =
      status === "rechazado" ? (comentarioRechazo ?? "").trim() || null : null;
    const actualizado = await reemplazoBenProyectoRepository.actualizarEstado(
      id,
      status,
      comentario,
    );
    if (!actualizado) {
      throw new AppError("Reemplazo de Cupo no encontrado", 404);
    }

    await auditLogRepository.registrar({
      usuarioId: rutUsuario,
      accion:
        status === "aprobado" ? "REEMPLAZO_APROBADO" : "REEMPLAZO_RECHAZADO",
      modulo: "REEMPLAZOS",
      entidad: "Reemplazo_benpro",
      registroId: String(id),
      region: obtenerProyectoReemplazo(reemplazoActual)?.reg_pro ?? null,
      detalle:
        status === "rechazado" && comentario
          ? comentario
          : `Solicitud de Reemplazo de Cupo ${status}`,
      req,
    });
    return actualizado;
  },

  async actualizarChecklist(
    data: ActualizarChecklistReemplazoInput,
    rutUsuario: number,
    req: Request,
  ) {
    const ids = data.candidatos.map((candidato) => candidato.id);
    const reemplazos = await reemplazoBenProyectoRepository.findByIds(ids);
    if (reemplazos.length !== ids.length) {
      throw new AppError("Uno o más candidatos no existen", 404);
    }
    const cupos = new Set(
      reemplazos.map((r) =>
        r.idBeneficiarioProyecto === null
          ? `${r.idProyecto}::cobertura::${r.fechaSolicitudReemplazo}`
          : `${r.idProyecto}::${r.idBeneficiarioProyecto}`,
      ),
    );
    if (cupos.size !== 1) {
      throw new AppError(
        "Todos los candidatos deben pertenecer al mismo reemplazo",
        400,
      );
    }

    // Los criterios automáticos se calculan con los datos persistidos del candidato.
    const evaluaciones = data.candidatos.map(({ id, ...criterios }) => {
      const reemplazo = reemplazos.find((item) => item.id === id)!;
      const criterio_2 =
        puntajeRshAutomatico(reemplazo.puntajeRsh) ?? criterios.criterio_2;
      const criterio_3 =
        puntajeEdadAutomatico(fechaNacimientoBeneficiarioNuevo(reemplazo)) ??
        criterios.criterio_3;
      const ceros = [criterios.criterio_1, criterio_2, criterio_3].filter(
        (valor) => valor === 0,
      ).length;
      const criterio_4 = ceros === 0 ? 100 : ceros === 1 ? 50 : 0;

      return {
        id,
        criterios: {
          criterio_1: criterios.criterio_1,
          criterio_2,
          criterio_3,
          criterio_4,
          criterio_5: criterios.criterio_5 ?? null,
          ponderacion:
            criterios.criterio_1 +
            criterio_2 +
            criterio_3 +
            criterio_4 +
            (criterios.criterio_5 ?? 0),
        },
      };
    });

    const ganador = [...evaluaciones].sort((a, b) => {
      const diferenciaPonderacion =
        b.criterios.ponderacion - a.criterios.ponderacion;
      if (diferenciaPonderacion !== 0) return diferenciaPonderacion;
      const rutA = reemplazos.find((item) => item.id === a.id)!.idBeneficiarioNuevo;
      const rutB = reemplazos.find((item) => item.id === b.id)!.idBeneficiarioNuevo;
      return rutA - rutB;
    })[0];

    await sequelize.transaction(async (transaction) => {
      for (const evaluacion of evaluaciones) {
        await reemplazoBenProyectoRepository.actualizarChecklist(
          evaluacion.id,
          evaluacion.criterios,
          transaction,
        );
        const status = evaluacion.id === ganador.id ? "aprobado" : "rechazado";
        await reemplazoBenProyectoRepository.actualizarEstado(
          evaluacion.id,
          status,
          null,
          transaction,
        );
      }
    });

    const region = obtenerProyectoReemplazo(reemplazos[0])?.reg_pro ?? null;
    for (const evaluacion of evaluaciones) {
      await auditLogRepository.registrar({
        usuarioId: rutUsuario,
        accion: "REEMPLAZO_CHECKLIST_ACTUALIZADO",
        modulo: "REEMPLAZOS",
        entidad: "Reemplazo_benpro",
        registroId: String(evaluacion.id),
        region,
        detalle: `Checklist actualizado con ponderación ${evaluacion.criterios.ponderacion}`,
        req,
      });
      const esGanador = evaluacion.id === ganador.id;
      await auditLogRepository.registrar({
        usuarioId: rutUsuario,
        accion: esGanador ? "REEMPLAZO_APROBADO" : "REEMPLAZO_RECHAZADO",
        modulo: "REEMPLAZOS",
        entidad: "Reemplazo_benpro",
        registroId: String(evaluacion.id),
        region,
        detalle: esGanador
          ? `Aprobado automáticamente con ponderación ${evaluacion.criterios.ponderacion}`
          : `Rechazado automáticamente; ponderación ${evaluacion.criterios.ponderacion}, ganador ${ganador.criterios.ponderacion}`,
        req,
      });
    }

    return reemplazoBenProyectoRepository.findByIds(ids);
  },

  async eliminar(id: number, rutUsuario: number, req: Request) {
    const reemplazoActual = await reemplazoBenProyectoRepository.findById(id);
    const eliminado = await reemplazoBenProyectoRepository.eliminar(id);
    if (!eliminado) {
      throw new AppError("Reemplazo no encontrado", 404);
    }

    await auditLogRepository.registrar({
      usuarioId: rutUsuario,
      accion: "REEMPLAZO_ELIMINADO",
      modulo: "REEMPLAZOS",
      entidad: "Reemplazo_benpro",
      registroId: String(id),
      region: obtenerProyectoReemplazo(reemplazoActual)?.reg_pro ?? null,
      detalle: "Solicitud de Reemplazo de Cupo eliminada",
      req,
    });
  },
};
