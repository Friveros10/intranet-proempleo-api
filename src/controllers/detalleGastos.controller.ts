import type { Request, Response } from "express";
import { detalleGastosService as service } from "../services/detalleGastos.service";
import { AppError } from "../utils/AppError";
import {
  buscarProyectoGastoSchema,
  crearDetalleGastoSchema,
  editarDetalleGastoSchema,
  gastoProempleoSchema,
  listarDetalleGastosSchema,
} from "../validations/detalleGastos.validation";

export const detalleGastosController = {
  async listar(req: Request, res: Response) {
    const { query } = listarDetalleGastosSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },

  async buscarProyecto(req: Request, res: Response) {
    const { query } = buscarProyectoGastoSchema.parse({ query: req.query });
    res.json(await service.buscarProyecto(query.decreto, query.folio));
  },

  async crear(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError("Sesión inválida.", 401);
    const { body } = crearDetalleGastoSchema.parse({ body: req.body });
    res.status(201).json(await service.crear(body, req.user.sub));
  },
  async editar(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError("Sesión inválida.", 401);
    const { params, body } = editarDetalleGastoSchema.parse(req);
    res.json(await service.cambiarGasto(params.id, body, req.user.sub));
  },
  async eliminar(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError("Sesión inválida.", 401);
    const { params } = gastoProempleoSchema.parse(req);
    res.json(await service.cambiarGasto(params.id, null, req.user.sub));
  },
};
