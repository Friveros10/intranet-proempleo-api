import { Request, Response } from 'express';
import { docReemplazoBenProyectoService } from '../services/docReemplazoBenProyecto.service';
import { DOCUMENTOS_REEMPLAZO } from '../constants/documentosReemplazo';
import { AppError } from '../utils/AppError';

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
    const archivo = {
      nombreArchivo: req.file.originalname,
      archivoUrl: `/uploads/reemplazos/${req.body.idReemplazoBenProyecto}/${req.file.filename}`,
    };
    const doc = await docReemplazoBenProyectoService.crear(req.body, archivo);
    res.status(201).json(doc);
  },

  async actualizarEstado(req: Request, res: Response): Promise<void> {
    const doc = await docReemplazoBenProyectoService.actualizarEstado(Number(req.params.id), req.body.status);
    res.status(200).json(doc);
  },
};
