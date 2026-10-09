import { Request, Response } from "express";
import { documentoAuditoriaService as service } from "../services/documentoAuditoria.service";
import {
  DOCUMENTOS_AUDITORIA,
  TipoDocumentoAuditoria,
} from "../constants/documentosAuditoria";
import { AppError } from "../utils/AppError";
import { rutaPdfAuditoria } from "../utils/archivosAuditoria";

export const documentoAuditoriaController = {
  async catalogos(req: Request, res: Response) {
    res.json(await service.catalogos(req));
  },
  async listar(req: Request, res: Response) {
    res.json(
      await service.listar(
        req.query.region ? Number(req.query.region) : undefined,
        req,
        Number(req.query.page),
        typeof req.query.ong === "string" ? req.query.ong : undefined,
        typeof req.query.rut === "string" ? req.query.rut : undefined,
      ),
    );
  },
  async crear(req: Request, res: Response) {
    const archivos = req.files;
    if (
      !archivos ||
      Array.isArray(archivos) ||
      !archivos.certCotizaciones?.[0] ||
      !archivos.liquidacion?.[0]
    ) {
      throw new AppError(
        "Debe adjuntar el certificado de cotizaciones y la liquidación en PDF",
        400,
      );
    }
    const data = await service.crear(
      req.body,
      {
        certCotizaciones: archivos.certCotizaciones[0],
        liquidacion: archivos.liquidacion[0],
      },
      req,
    );
    res
      .status(201)
      .json({ message: "Ficha de auditoría creada correctamente", data });
  },
  async estado(req: Request, res: Response) {
    const data = await service.actualizarEstado(
      Number(req.params.id),
      req.params.tipo as TipoDocumentoAuditoria,
      req.body,
      req,
    );
    res.json({ message: `Documento ${req.body.status} correctamente`, data });
  },
  async estadoUpload(req: Request, res: Response) {
    const data = await service.actualizarEstadoUpload(
      Number(req.params.id),
      req.params.tipo as TipoDocumentoAuditoria,
      req.body,
      req,
    );
    res.json({ message: `Documento ${req.body.status} correctamente`, data });
  },
  async guardarDocumentos(req: Request, res: Response) {
    const archivos = req.files;
    if (!archivos || Array.isArray(archivos)) {
      throw new AppError("Debe adjuntar los documentos pendientes o rechazados", 400);
    }
    const data = await service.guardarDocumentos(
      Number(req.params.id),
      {
        certCotizaciones: archivos.certCotizaciones?.[0],
        liquidacion: archivos.liquidacion?.[0],
      },
      req,
    );
    res.json({ message: "Documentos guardados para revisión", data });
  },
  async reemplazar(req: Request, res: Response) {
    if (!req.file) throw new AppError("Debe adjuntar un archivo PDF", 400);
    const data = await service.reemplazar(
      Number(req.params.id),
      req.params.tipo as TipoDocumentoAuditoria,
      req.file,
      req,
    );
    res.json({ message: "Documento cargado para revisión", data });
  },
  async archivo(req: Request, res: Response) {
    const id = Number(req.params.id);
    const tipo = req.params.tipo as TipoDocumentoAuditoria;
    const doc = await service.obtenerVisible(id, req);
    const campos = DOCUMENTOS_AUDITORIA[tipo];
    const url = doc.getDataValue(campos.url);
    if (url.split("/").pop() !== req.params.filename) {
      throw new AppError("Documento no encontrado", 404);
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.type("application/pdf");
    res.sendFile(rutaPdfAuditoria(id, url));
  },
  async auditoriaBioBioByRut(req: Request, res: Response) {
    const rut = req.params.rut;
    const data = await service.auditoriaBioBioByRut(rut, req);
    res.status(200).json(data);
  },
};
