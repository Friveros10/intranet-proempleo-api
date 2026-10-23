import { Request } from "express";
import type { Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import { flujoReemplazoRepository as repository } from "../repositories/flujoReemplazo.repository";
import { regionRepository } from "../repositories/sicap/region.repository";
import { usuarioSicapRepository } from "../repositories/sicap/usuarioSicap.repository";
import { proyectoRepository } from "../repositories/sicap/proyecto.repository";
import { beneficiarioRepository } from "../repositories/sicap/beneficiario.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import type { ReemplazoFiltros } from "../repositories/reemplazoBenProyecto.repository";
import type { ReemplazoStatus } from "../models/ReemplazoBenProyecto.model";
import type { DocumentoStatus } from "../models/DocReemplazoBenProyecto.model";
import type { CrearReemplazoIndividualInput } from "../validations/flujoReemplazo.validation";
import type { ActualizarChecklistReemplazoInput } from "../validations/reemplazoBenProyecto.validation";
import { planEgresoHistoricoService } from "./planEgresoHistorico.service";
import { puntajeEdadAutomatico, puntajeRshAutomatico } from "./reemplazoBenProyecto.service";
import { CAMPOS_CHECKLIST_REEMPLAZO, puedeGestionarChecklist } from "../constants/checklist.constants";
import { DOCUMENTOS_REEMPLAZO } from "../constants/documentosReemplazo";
import { guardarDocumentoIndividual, eliminarDocumentoIndividual } from "../utils/documentosReemplazoIndividual";
import { AppError } from "../utils/AppError";
import { parseRut } from "../utils/rut";
import { logger } from "../utils/logger";
import type { AuditAccion } from "../models/AuditLog.model";

async function contexto(rut: number) {
  const [usuario, permisos] = await Promise.all([
    usuarioSicapRepository.findByRut(rut),
    usuarioSicapRepository.getPermisosDeUsuario(rut),
  ]);
  if (!usuario) throw new AppError("Usuario no encontrado", 401);
  return { region: usuario.reg_usu, todas: permisos.includes("REM_VERALL"), permisos };
}

type Solicitud = NonNullable<Awaited<ReturnType<typeof repository.obtener>>>;

function visible(row: Solicitud, roles: string[]) {
  const data: Partial<Solicitud> = { ...row };
  if (!puedeGestionarChecklist(roles)) {
    for (const campo of CAMPOS_CHECKLIST_REEMPLAZO) delete data[campo];
  }
  return data;
}

async function obtener(id: number, rut: number): Promise<Solicitud> {
  const [row, usuario] = await Promise.all([repository.obtener(id), contexto(rut)]);
  if (!row) throw new AppError("Solicitud no encontrada", 404);
  if (!usuario.todas && (!usuario.region || row.proyecto?.reg_pro !== usuario.region)) {
    throw new AppError("No tiene acceso a esta solicitud", 403);
  }
  return row;
}

async function auditar(req: Request, rut: number, accion: AuditAccion, id: number, region: number | null, detalle: string, transaction?: Transaction) {
  await auditLogRepository.registrar({
    usuarioId: rut, accion, modulo: "REEMPLAZOS_INDIVIDUALES",
    entidad: accion === "FLUJO_REEMPLAZO_CONFIGURADO" ? "flujo_reemplazo_proempleo" : "reemplazo_individual_proempleo",
    registroId: String(id), region, detalle, req, transaction,
  });
}

export const flujoReemplazoService = {
  async configuraciones() {
    const [regiones, configuraciones] = await Promise.all([
      regionRepository.findRegionesActivas(), repository.configuraciones(),
    ]);
    return regiones.map((region) => ({
      ...region,
      idRegion: region.cod_region,
      status: configuraciones.find((item) => item.idRegion === region.cod_region)?.status ?? 0,
    }));
  },
  async configurar(idRegion: number, status: number, rut: number, req: Request) {
    const regiones = await regionRepository.findRegionesActivas();
    if (!regiones.some((region) => region.cod_region === idRegion)) {
      throw new AppError("La región no está activa", 400);
    }
    return sequelize.transaction(async (transaction) => {
      const resultado = await repository.configurar(idRegion, status, transaction);
      await auditar(req, rut, "FLUJO_REEMPLAZO_CONFIGURADO", idRegion, idRegion, `Configuración regional: ${status}`, transaction);
      return resultado;
    });
  },
  async actual(rut: number) {
    const usuario = await contexto(rut);
    const config = usuario.region ? await repository.configuracion(usuario.region) : null;
    return { idRegion: usuario.region, status: config?.status === 1 ? 1 : 0 };
  },
  async listar(filtros: ReemplazoFiltros, rut: number, roles: string[]) {
    const usuario = await contexto(rut);
    const rows = await repository.listar({
      ...filtros, region: usuario.todas ? filtros.region : usuario.region ?? -1,
    });
    return rows.map((row) => visible(row, roles));
  },
  async obtener(id: number, rut: number, roles: string[]) {
    return visible(await obtener(id, rut), roles);
  },
  async crear(data: CrearReemplazoIndividualInput, archivos: Express.Multer.File[], rut: number, req: Request) {
    if (data.nuevosBeneficiarios.length !== 1) {
      throw new AppError("Debe ingresar exactamente un beneficiario nuevo", 400);
    }
    const [seleccion, usuario, proyecto] = await Promise.all([
      this.actual(rut), contexto(rut), proyectoRepository.findByFolioConCupo(data.idProyecto),
    ]);
    if (seleccion.status !== 1) {
      throw new AppError("La configuración de tu región cambió. Cierra y vuelve a abrir la solicitud.", 409);
    }
    if (!proyecto) throw new AppError("El proyecto no existe", 404);
    if (!usuario.todas && proyecto.reg_pro !== usuario.region) {
      throw new AppError("El proyecto no pertenece a tu zona", 403);
    }
    if (data.cupoCobertura) {
      if (proyecto.cuposDisponibles === null || proyecto.cuposDisponibles <= 0 || proyecto.periodosSinCupo.length > 0) {
        throw new AppError("El proyecto no tiene cupos de cobertura disponibles", 409);
      }
    } else {
      if (!data.idBeneficiarioProyecto) throw new AppError("Debes indicar el beneficiario saliente", 400);
      const saliente = await beneficiarioRepository.findByRutFromBenPro(data.idBeneficiarioProyecto);
      if (!saliente || saliente.folio_vigente !== data.idProyecto) {
        throw new AppError("El beneficiario saliente no pertenece al proyecto", 400);
      }
    }
    const candidato = data.nuevosBeneficiarios[0];
    const { cuerpo, dv } = parseRut(candidato.rut);
    if (!data.cupoCobertura && cuerpo === data.idBeneficiarioProyecto) {
      throw new AppError("El beneficiario entrante debe ser distinto al saliente", 400);
    }
    await planEgresoHistoricoService.validarPuedeIngresarPorRun(cuerpo);
    const ids = data.documentos.map((doc) => doc.idDocumento);
    if (data.documentos.length !== archivos.length ||
        ids.length !== DOCUMENTOS_REEMPLAZO.length ||
        new Set(ids).size !== DOCUMENTOS_REEMPLAZO.length ||
        !DOCUMENTOS_REEMPLAZO.every((tipo) => ids.includes(tipo.id)) ||
        data.documentos.some((doc) => parseRut(doc.rut).cuerpo !== cuerpo)) {
      throw new AppError("Debes adjuntar todos los documentos requeridos del beneficiario entrante", 400);
    }
    const existente = await beneficiarioRepository.findByRut(cuerpo);
    const urls: string[] = [];
    let id: number;
    try {
      id = await sequelize.transaction(async (transaction) => {
        if (!existente) {
          await beneficiarioRepository.createProempleo({
            rut_ben: cuerpo, dig_ben: dv, nom_ben: candidato.nombres,
            pat_ben: candidato.apellidoPaterno, mat_ben: candidato.apellidoMaterno,
            dir_ben: candidato.direccion ?? null, reg_ben: proyecto.reg_pro,
            fecnac_ben: candidato.fechaNacimiento, sex_ben: candidato.genero ?? null,
            etn_ben: candidato.etnia ?? null, nivedu_ben: candidato.educacion ?? null,
            usu_cre: String(rut), fec_cre: new Date(), statusFicha: 1,
          }, transaction);
        }
        const solicitud = await repository.crear({
          idBeneficiarioProyecto: data.cupoCobertura ? null : data.idBeneficiarioProyecto!,
          idBeneficiarioNuevo: cuerpo, idProyecto: data.idProyecto, rutUsuarioSolicitante: rut,
          status: "pendiente", fechaSolicitudReemplazo: new Date().toISOString(),
          puntajeRsh: candidato.puntajeRsh ?? null,
        }, transaction);
        for (let i = 0; i < archivos.length; i++) {
          const archivoUrl = guardarDocumentoIndividual(solicitud.id, archivos[i]);
          urls.push(archivoUrl);
          await repository.crearDocumento({
            idReemplazoBenProyecto: solicitud.id, idDocumento: data.documentos[i].idDocumento,
            idBeneficiario: cuerpo, nombreArchivo: archivos[i].originalname, archivoUrl,
            status: "pendiente", comentarioRechazo: null, fechaCarga: new Date().toISOString(),
          }, transaction);
        }
        await auditar(req, rut, "REEMPLAZO_INDIVIDUAL_CREADO", solicitud.id, proyecto.reg_pro,
          data.cupoCobertura ? "Solicitud de cobertura creada" : "Solicitud uno a uno creada", transaction);
        return solicitud.id;
      });
    } catch (err) {
      for (const url of urls) {
        try { eliminarDocumentoIndividual(url); }
        catch (cleanupError) { logger.error({ err: cleanupError, url }, "Fallo al limpiar una solicitud no guardada"); }
      }
      throw err;
    }
    return [await obtener(id, rut)];
  },
  async estado(id: number, status: ReemplazoStatus, comentario: string | undefined, rut: number, req: Request) {
    const row = await obtener(id, rut);
    const usuario = await contexto(rut);
    if (!usuario.permisos.includes(status === "aprobado" ? "REM_APROB" : "REM_RECHAZ")) {
      throw new AppError("No tiene permisos para realizar esta acción", 403);
    }
    const rechazoEmergenciaIndividual =
      row.flujo === "B" && row.status === "aprobado" && status === "rechazado";
    if (
      row.status === "rechazado" ||
      (row.status === "aprobado" && !rechazoEmergenciaIndividual)
    ) {
      throw new AppError("La solicitud ya está resuelta", 409);
    }
    if (status === "rechazado" && !comentario?.trim()) {
      throw new AppError("Debes indicar el motivo del rechazo", 400);
    }
    if (status === "aprobado" || status === "revisado") {
      const documentos = await repository.documentos(id);
      if (documentos.length !== DOCUMENTOS_REEMPLAZO.length ||
          documentos.some((doc) => doc.get().status !== "aprobado")) {
        throw new AppError("Todos los documentos deben estar aprobados", 409);
      }
      if (status === "aprobado" && row.ponderacion === null) {
        throw new AppError("Debes guardar el checklist antes de aprobar", 409);
      }
    }
    await sequelize.transaction(async (transaction) => {
      await repository.actualizar(id, {
        status, comentarioRechazo: status === "rechazado" ? comentario?.trim() ?? null : null,
        fechaAprobacionReemplazo: status === "aprobado" || status === "rechazado" ? new Date().toISOString() : null,
      }, transaction);
      await auditar(req, rut, "REEMPLAZO_INDIVIDUAL_ESTADO", id, row.proyecto?.reg_pro ?? null, comentario || `Solicitud ${status}`, transaction);
    });
    return obtener(id, rut);
  },
  async checklist(data: ActualizarChecklistReemplazoInput, rut: number, req: Request) {
    if (data.candidatos.length !== 1) throw new AppError("El checklist debe evaluar una sola solicitud", 400);
    const candidato = data.candidatos[0];
    const row = await obtener(candidato.id, rut);
    if (row.status === "aprobado" || row.status === "rechazado") {
      throw new AppError("La solicitud ya está resuelta", 409);
    }
    const documentos = await repository.documentos(row.id);
    if (documentos.length !== DOCUMENTOS_REEMPLAZO.length ||
        documentos.some((doc) => doc.get().status !== "aprobado")) {
      throw new AppError("Todos los documentos deben estar aprobados antes de guardar el checklist", 409);
    }
    const criterio_2 = puntajeRshAutomatico(row.puntajeRsh) ?? candidato.criterio_2;
    const fecha = row.beneficiarioNuevo?.fecnac_ben;
    const criterio_3 = puntajeEdadAutomatico(fecha ? new Date(fecha) : null) ?? candidato.criterio_3;
    const ceros = [candidato.criterio_1, criterio_2, criterio_3].filter((valor) => valor === 0).length;
    const criterio_4 = ceros === 0 ? 100 : ceros === 1 ? 50 : 0;
    await sequelize.transaction(async (transaction) => {
      await repository.actualizar(row.id, {
        criterio_1: candidato.criterio_1, criterio_2, criterio_3, criterio_4,
        criterio_5: candidato.criterio_5 ?? null,
        ponderacion: candidato.criterio_1 + criterio_2 + criterio_3 + criterio_4,
        status: "aprobado",
        comentarioRechazo: null,
        fechaAprobacionReemplazo: new Date().toISOString(),
      }, transaction);
      await auditar(req, rut, "REEMPLAZO_INDIVIDUAL_CHECKLIST", row.id, row.proyecto?.reg_pro ?? null, "Checklist individual guardado; solicitud aprobada", transaction);
    });
    return [await obtener(row.id, rut)];
  },
  async documentos(id: number, rut: number) {
    await obtener(id, rut);
    return repository.documentos(id);
  },
  async estadoDocumento(id: number, status: DocumentoStatus, comentario: string | undefined, rut: number, req: Request) {
    const documento = await repository.documento(id);
    if (!documento) throw new AppError("Documento no encontrado", 404);
    const row = await obtener(documento.get().idReemplazoBenProyecto, rut);
    if (row.status === "aprobado" || row.status === "rechazado") {
      throw new AppError("La solicitud ya está resuelta", 409);
    }
    await sequelize.transaction(async (transaction) => {
      await repository.actualizarDocumento(id, { status, comentarioRechazo: status === "rechazado" ? comentario ?? null : null }, transaction);
      await auditar(req, rut, "DOCUMENTO_INDIVIDUAL_ESTADO", row.id, row.proyecto?.reg_pro ?? null, `Documento ${id}: ${status}`, transaction);
    });
    return repository.documento(id);
  },
  async reemplazarDocumento(id: number, archivo: Express.Multer.File, rut: number, req: Request) {
    const documento = await repository.documento(id);
    if (!documento) throw new AppError("Documento no encontrado", 404);
    const doc = documento.get();
    const row = await obtener(doc.idReemplazoBenProyecto, rut);
    if (row.status === "aprobado" || row.status === "rechazado") {
      throw new AppError("La solicitud ya está resuelta", 409);
    }
    if (doc.status !== "rechazado") throw new AppError("Solo se puede volver a subir un documento rechazado", 400);
    const archivoUrl = guardarDocumentoIndividual(row.id, archivo);
    try {
      await sequelize.transaction(async (transaction) => {
        await repository.actualizarDocumento(id, {
          archivoUrl, nombreArchivo: archivo.originalname, status: "pendiente",
          comentarioRechazo: null, fechaCarga: new Date().toISOString(),
        }, transaction);
        await auditar(req, rut, "DOCUMENTO_INDIVIDUAL_REEMPLAZADO", row.id, row.proyecto?.reg_pro ?? null, `Documento ${id} reemplazado`, transaction);
      });
    } catch (err) {
      eliminarDocumentoIndividual(archivoUrl);
      throw err;
    }
    eliminarDocumentoIndividual(doc.archivoUrl);
    return repository.documento(id);
  },
  async eliminar(id: number, rut: number, req: Request) {
    const row = await obtener(id, rut);
    const docs = await repository.documentos(id);
    await sequelize.transaction(async (transaction) => {
      await repository.eliminarDocumentos(id, transaction);
      await repository.eliminar(id, transaction);
      await auditar(req, rut, "REEMPLAZO_INDIVIDUAL_ELIMINADO", id, row.proyecto?.reg_pro ?? null, "Solicitud eliminada", transaction);
    });
    for (const doc of docs) eliminarDocumentoIndividual(doc.get().archivoUrl);
  },
};
