import type { Request, Response } from "express";
import { itemGastosService as service } from "../services/itemGastos.service";
import { AppError } from "../utils/AppError";
import { registrarAuditoriaOpcional } from "../utils/auditoriaOpcional";
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
    const { items, creados, eliminados } = await service.guardar(params.id, query.origen, body, req.user.sub);
    const accion = body.nuevos.length
      ? body.eliminar.length ? "MARCO_ITEMS_ACTUALIZADOS" : "MARCO_ITEMS_CREADOS"
      : "MARCO_ITEMS_ELIMINADOS";
    const detalles = [
      ...creados.map((item) => `Ítem ${item.corr_itemGas} creado (${JSON.stringify(item.nom_itemGas)}, ${item.categoria ?? "sin categoría"})`),
      ...eliminados.map((item) => `Ítem ${item.corr_itemGas} eliminado (${JSON.stringify(item.nom_itemGas.trim())}, ${item.categoria ?? "sin categoría"})`),
    ];
    registrarAuditoriaOpcional({
      req, usuarioId: req.user.sub, accion, modulo: "LEY_DE_PRESUPUESTO",
      entidad: "ITEMGASTOS", registroId: String(params.id),
      detalle: `Marco ${params.id} (${query.origen}). ${detalles.join(" · ")}.`,
    });
    res.json(items);
  },
};
