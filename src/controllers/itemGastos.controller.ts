import type { Request, Response } from "express";
import { itemGastosService as service } from "../services/itemGastos.service";
import { AppError } from "../utils/AppError";
import { guardarItemGastosSchema } from "../validations/itemGastos.validation";
import { obtenerMarcoSchema } from "../validations/marco.validation";

export const itemGastosController = {
  async listar(req: Request, res: Response) {
    const { params, query } = obtenerMarcoSchema.parse(req);
    res.json(await service.listar(params.id, query.origen));
  },

  async guardar(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError("Sesión inválida.", 401);
    const { params, query } = obtenerMarcoSchema.parse(req);
    const { body } = guardarItemGastosSchema.parse(req);
    res.json(
      await service.guardar(params.id, query.origen, body, req.user.sub),
    );
  },
};
