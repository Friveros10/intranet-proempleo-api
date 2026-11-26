import { Request } from "express";
import { docReemplazoBenProyectoRepository } from "../repositories/docReemplazoBenProyecto.repository";
import { reemplazoBenProyectoRepository } from "../repositories/reemplazoBenProyecto.repository";
import { obtenerProyectoReemplazo } from "./reemplazoBenProyecto.service";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { beneficiarioRepository } from "../repositories/sicap/beneficiario.repository";
import { AppError } from "../utils/AppError";
import { nombreDocumentoReemplazo } from "../constants/documentosReemplazo";
import { eliminarDocumentoEnDisco, guardarDocumentoEnDisco } from "../middlewares/upload.middleware";
import { CrearDocReemplazoInput } from "../validations/docReemplazoBenProyecto.validation";
import { DocumentoStatus } from "../models/DocReemplazoBenProyecto.model";

export const docReemplazoBenProyectoService = {
  async listar() {
    return docReemplazoBenProyectoRepository.findAll();
  },

  async obtenerPorId(id: number) {
    const doc = await docReemplazoBenProyectoRepository.findById(id);
    if (!doc) {
      throw new AppError("Documento no encontrado", 404);
    }
    return doc;
  },

  async listarPorReemplazo(idReemplazoBenProyecto: number) {
    return docReemplazoBenProyectoRepository.findByReemplazo(
      idReemplazoBenProyecto,
    );
  },

  async crear(
    data: CrearDocReemplazoInput,
    archivo: Express.Multer.File,
    rutUsuario: number,
    req: Request,
  ) {
    const nombreArchivo = nombreDocumentoReemplazo(data.idDocumento);

    const [reemplazo, beneficiario] = await Promise.all([
      reemplazoBenProyectoRepository.findById(data.idReemplazoBenProyecto),
      beneficiarioRepository.findByRut(data.idBeneficiario),
    ]);

    if (!reemplazo) {
      throw new AppError("El reemplazo asociado no existe", 404);
    }
    if (!beneficiario) {
      throw new AppError("El beneficiario no existe", 404);
    }

    const archivoUrl = guardarDocumentoEnDisco(data.idReemplazoBenProyecto, archivo, nombreArchivo);
    const documento = await docReemplazoBenProyectoRepository.create({
      ...data, nombreArchivo, archivoUrl,
    }).catch((err) => {
      eliminarDocumentoEnDisco(archivoUrl);
      throw err;
    });
    await auditLogRepository.registrar({
      usuarioId: rutUsuario,
      accion: "DOCUMENTO_CARGADO",
      modulo: "DOCUMENTOS_REEMPLAZO",
      entidad: "Doc_reemplazo_benpro",
      registroId: String(documento.id),
      region: obtenerProyectoReemplazo(reemplazo)?.reg_pro ?? null,
      detalle: `Documento cargado para reemplazo ${data.idReemplazoBenProyecto}`,
      req,
    });
    return documento;
  },

  async actualizarEstado(
    id: number,
    status: DocumentoStatus,
    comentarioRechazo: string | null,
    rutUsuario: number,
    req: Request,
  ) {
    const documentoActual =
      await docReemplazoBenProyectoRepository.findById(id);
    if (!documentoActual) {
      throw new AppError("Documento no encontrado", 404);
    }
    const reemplazo = await reemplazoBenProyectoRepository.findById(
      documentoActual.idReemplazoBenProyecto,
    );
    const actualizado =
      await docReemplazoBenProyectoRepository.actualizarEstado(
        id,
        status,
        comentarioRechazo,
      );
    if (!actualizado) {
      throw new AppError("Documento no encontrado", 404);
    }

    await auditLogRepository.registrar({
      usuarioId: rutUsuario,
      accion:
        status === "aprobado" ? "DOCUMENTO_APROBADO" : "DOCUMENTO_RECHAZADO",
      modulo: "DOCUMENTOS_REEMPLAZO",
      entidad: "Doc_reemplazo_benpro",
      registroId: String(id),
      region: obtenerProyectoReemplazo(reemplazo)?.reg_pro ?? null,
      detalle:
        status === "rechazado" && comentarioRechazo
          ? `Documento ${status} en reemplazo para proyecto ${obtenerProyectoReemplazo(reemplazo)?.fol_pro}: ` + comentarioRechazo
          : `Documento ${status} en reemplazo para proyecto ${obtenerProyectoReemplazo(reemplazo)?.fol_pro}`,
      req,
    });
    return actualizado;
  },

  async reemplazarArchivo(
    id: number,
    archivo: Express.Multer.File,
    rutUsuario: number,
    req: Request,
  ) {
    const documento = await docReemplazoBenProyectoRepository.findById(id);
    if (!documento) throw new AppError("Documento no encontrado", 404);
    if (documento.status !== "rechazado") {
      throw new AppError(
        "Solo se puede volver a subir un documento rechazado",
        400,
      );
    }
    const reemplazo = await reemplazoBenProyectoRepository.findById(
      documento.idReemplazoBenProyecto,
    );
    const nombreArchivo = nombreDocumentoReemplazo(documento.idDocumento);
    const archivoUrl = guardarDocumentoEnDisco(documento.idReemplazoBenProyecto, archivo, nombreArchivo);
    const reemplazado =
      await docReemplazoBenProyectoRepository.reemplazarArchivo(
        id,
        nombreArchivo,
        archivoUrl,
      ).catch((err) => {
        eliminarDocumentoEnDisco(archivoUrl);
        throw err;
      });
    if (!reemplazado) eliminarDocumentoEnDisco(archivoUrl);
    if (reemplazado) {
      await auditLogRepository.registrar({
        usuarioId: rutUsuario,
        accion: "DOCUMENTO_REEMPLAZADO",
        modulo: "DOCUMENTOS_REEMPLAZO",
        entidad: "Doc_reemplazo_benpro",
        registroId: String(id),
        region: obtenerProyectoReemplazo(reemplazo)?.reg_pro ?? null,
        detalle: `Documento reemplazado: ${nombreArchivo}`,
        req,
      });
    }
    return reemplazado;
  },
};
