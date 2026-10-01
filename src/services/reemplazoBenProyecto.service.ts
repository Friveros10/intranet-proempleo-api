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
      reemplazo.proyecto?.reg_pro !== contexto.regionUsuario
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
      beneficiarioRepository.findByRut(data.idBeneficiarioProyecto),
      proyectoRepository.findByFolio(data.idProyecto),
      obtenerContextoUsuario(rutUsuarioSolicitante),
    ]);

    // await planEgresoHistoricoService.validarPuedeIngresarPorRun(data.idBeneficiarioProyecto);
    if (!beneficiarioActual) {
      throw new AppError("El beneficiario a reemplazar no existe", 404);
    }
    if (!proyecto) {
      throw new AppError("El proyecto no existe", 404);
    }

    // Roles regionales (ej. INTENDENCIA) solo pueden solicitar reemplazos de beneficiarios de su propia región
    if (
      !contexto.puedeVerTodasLasRegiones &&
      beneficiarioActual.reg_ben !== contexto.regionUsuario
    ) {
      throw new AppError("El beneficiario no pertenece a tu zona", 403);
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
    for (const candidato of candidatos) {
      // console.log("[reemplazoBenProyectoService.crear] procesando candidato:", candidato.cuerpo);
      const beneficiarioNuevoExistente = await beneficiarioRepository.findByRut(
        candidato.cuerpo,
      );
      if (!beneficiarioNuevoExistente) {
        // console.log("[reemplazoBenProyectoService.crear] beneficiario no existe, creando:", candidato.beneficiario);
        await beneficiarioRepository.create({
          rut_ben: candidato.cuerpo,
          dig_ben: candidato.dv,
          nom_ben: candidato.beneficiario.nombres,
          pat_ben: candidato.beneficiario.apellidoPaterno,
          mat_ben: candidato.beneficiario.apellidoMaterno,
          dir_ben: candidato.beneficiario.direccion ?? null,
          fecnac_ben: candidato.beneficiario.fechaNacimiento,
          reg_ben: contexto.regionUsuario ?? null,
          usu_cre: String(rutUsuarioSolicitante),
          fec_cre: new Date(),
          statusFicha: 1,
        });
        // console.log("[reemplazoBenProyectoService.crear] beneficiario creado para rut:", candidato.cuerpo);
      }

      const reemplazo = await reemplazoBenProyectoRepository.create({
        idBeneficiarioProyecto: data.idBeneficiarioProyecto,
        idBeneficiarioNuevo: candidato.cuerpo,
        idProyecto: data.idProyecto,
        rutUsuarioSolicitante,
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
        region: proyecto.reg_pro ?? beneficiarioActual.reg_ben ?? null,
        detalle: `Solicitud de Reemplazo de Cupo creada para proyecto ${data.idProyecto}`,
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
      region: reemplazoActual?.proyecto?.reg_pro ?? null,
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
      reemplazos.map((r) => `${r.idProyecto}::${r.idBeneficiarioProyecto}`),
    );
    if (cupos.size !== 1) {
      throw new AppError(
        "Todos los candidatos deben pertenecer al mismo reemplazo",
        400,
      );
    }

    // La ponderación se recalcula en el servidor; no se confía en el valor del cliente.
    const evaluaciones = data.candidatos.map(({ id, ...criterios }) => ({
      id,
      criterios: {
        ...criterios,
        ponderacion:
          criterios.criterio_1 +
          criterios.criterio_2 +
          criterios.criterio_3 +
          criterios.criterio_4 +
          criterios.criterio_5,
      },
    }));

    await sequelize.transaction(async (transaction) => {
      for (const evaluacion of evaluaciones) {
        await reemplazoBenProyectoRepository.actualizarChecklist(
          evaluacion.id,
          evaluacion.criterios,
          transaction,
        );
      }
    });

    const region = reemplazos[0].proyecto?.reg_pro ?? null;
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
      region: reemplazoActual?.proyecto?.reg_pro ?? null,
      detalle: "Solicitud de Reemplazo de Cupo eliminada",
      req,
    });
  },
};
