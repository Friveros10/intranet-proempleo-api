import { Request, Response } from 'express';
import { reemplazoBenProyectoService } from '../services/reemplazoBenProyecto.service';
import { AppError } from '../utils/AppError';
import { ListarReemplazoQuery } from '../validations/reemplazoBenProyecto.validation';

export const reemplazoBenProyectoController = {
  async listar(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }
    const { region, fechaDesde, fechaHasta, status } = req.query as unknown as ListarReemplazoQuery;
    const reemplazos = await reemplazoBenProyectoService.listar(
      { region, fechaDesde, fechaHasta, status },
      Number(req.user.sub)
    );
    res.status(200).json(reemplazos);
  },

  async listarRegiones(_req: Request, res: Response): Promise<void> {
    const regiones = await reemplazoBenProyectoService.listarRegiones();
    res.status(200).json(regiones);
  },

  async obtener(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }
    const reemplazo = await reemplazoBenProyectoService.obtenerPorId(Number(req.params.id), Number(req.user.sub));
    res.status(200).json(reemplazo);
  },

  async crear(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }
    const archivos = (req.files as Express.Multer.File[]) ?? [];
    const reemplazo = await reemplazoBenProyectoService.crear(req.body, archivos, Number(req.user.sub), req);
    res.status(201).json(reemplazo);
  },

  async actualizarEstado(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }
    const reemplazo = await reemplazoBenProyectoService.actualizarEstado(
      Number(req.params.id),
      req.body.status,
      Number(req.user.sub),
      req,
      req.body.comentarioRechazo ?? null,
    );
    res.status(200).json(reemplazo);
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }
    await reemplazoBenProyectoService.eliminar(Number(req.params.id), Number(req.user.sub), req);
    res.status(204).send();
  },
};
