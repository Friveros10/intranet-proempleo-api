import { Request, Response } from 'express';
import { docReemplazoBenProyectoService } from '../services/docReemplazoBenProyecto.service';
import { DOCUMENTOS_REEMPLAZO } from '../constants/documentosReemplazo';
import { AppError } from '../utils/AppError';
import { eliminarDocumentoEnDisco } from '../middlewares/upload.middleware';

export const docReemplazoBenProyectoController = {
  async listarCatalogo(_req: Request, res: Response): Promise<void> {
    res.status(200).json(DOCUMENTOS_REEMPLAZO);
  },

  async listar(_req: Request, res: Response): Promise<void> {
    const docs = await docReemplazoBenProyectoService.listar();
    res.status(200).json(docs);
  },

  async listarPorReemplazo(req: Request, res: Response): Promise<void> {
    const docs = await docReemplazoBenProyectoService.listarPorReemplazo(Number(req.params.idReemplazo));
    res.status(200).json(docs);
  },

  async obtener(req: Request, res: Response): Promise<void> {
    const doc = await docReemplazoBenProyectoService.obtenerPorId(Number(req.params.id));
    res.status(200).json(doc);
  },

  async crear(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new AppError('El archivo PDF es requerido', 400);
    }
    const doc = await docReemplazoBenProyectoService.crear(req.body, req.file, Number(req.user!.sub), req);
    res.status(201).json(doc);
  },

  async actualizarEstado(req: Request, res: Response): Promise<void> {
    const doc = await docReemplazoBenProyectoService.actualizarEstado(
      Number(req.params.id),
      req.body.status,
      req.body.comentarioRechazo ?? null,
      Number(req.user!.sub),
      req,
    );
    const mensaje =
      req.body.status === 'aprobado'
        ? 'Documento aprobado correctamente'
        : 'Documento rechazado correctamente';
    res.status(200).json({ message: mensaje, data: doc });
  },

  async reemplazarArchivo(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new AppError('El archivo PDF es requerido', 400);
    const actualizado = await docReemplazoBenProyectoService.reemplazarArchivo(
      Number(req.params.id),
      req.file,
      Number(req.user!.sub),
      req,
    );
    if (!actualizado) throw new AppError('Documento no encontrado', 404);
    eliminarDocumentoEnDisco(actualizado.archivoUrlAnterior);
    res.status(200).json(actualizado.doc);
  },
};
