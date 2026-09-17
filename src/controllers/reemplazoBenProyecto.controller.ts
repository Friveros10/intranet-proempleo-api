import { Request, Response } from 'express';
import { reemplazoBenProyectoService } from '../services/reemplazoBenProyecto.service';
import { AppError } from '../utils/AppError';

export const reemplazoBenProyectoController = {
  async listar(_req: Request, res: Response): Promise<void> {
    const reemplazos = await reemplazoBenProyectoService.listar();
    res.status(200).json(reemplazos);
  },

  async obtener(req: Request, res: Response): Promise<void> {
    const reemplazo = await reemplazoBenProyectoService.obtenerPorId(Number(req.params.id));
    res.status(200).json(reemplazo);
  },

  async crear(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }
    const archivos = (req.files as Express.Multer.File[]) ?? [];
    const reemplazo = await reemplazoBenProyectoService.crear(req.body, archivos, Number(req.user.sub));
    res.status(201).json(reemplazo);
  },

  async actualizarEstado(req: Request, res: Response): Promise<void> {
    const reemplazo = await reemplazoBenProyectoService.actualizarEstado(Number(req.params.id), req.body.status);
    res.status(200).json(reemplazo);
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    await reemplazoBenProyectoService.eliminar(Number(req.params.id));
    res.status(204).send();
  },
};
