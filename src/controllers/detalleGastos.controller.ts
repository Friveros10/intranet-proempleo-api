import type { Request, Response } from "express";
import { detalleGastosService as service } from "../services/detalleGastos.service";
import { AppError } from "../utils/AppError";
import { registrarAuditoriaOpcional } from "../utils/auditoriaOpcional";
import { diferenciasAuditables, valorAuditable } from "../utils/auditoriaCambios";
import {
  buscarProyectoGastoSchema,
  crearDetalleGastoSchema,
  editarDetalleGastoSchema,
  gastoProempleoSchema,
  listarDetalleGastosSchema,
} from "../validations/detalleGastos.validation";

const auditoria = { modulo: "DETALLE_GASTOS", entidad: "DETRENDICION" };

function ubicacion(gasto: { folio: number; decreto: string; mes: number; anio: number; item: number | null; nombreItem: string | null }) {
  return `Proyecto ${gasto.folio}, decreto ${gasto.decreto}, período ${gasto.mes}/${gasto.anio}, ítem ${valorAuditable(gasto.nombreItem ?? gasto.item)}`;
}

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
    const { resultado, region, nombreItem } = await service.crear(body, req.user.sub);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId: req.user.sub, region,
      accion: "DETALLE_GASTO_CREADO", registroId: String(resultado.correlativo),
      detalle: `${ubicacion({ ...body, nombreItem })}. Monto ${body.monto} CLP, fecha de factura ${valorAuditable(body.fecfac_detren)}, glosa ${valorAuditable(body.glosa)}.`,
    });
    res.status(201).json(resultado);
  },
  async editar(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError("Sesión inválida.", 401);
    const { params, body } = editarDetalleGastoSchema.parse(req);
    const { resultado, anterior } = await service.cambiarGasto(params.id, body, req.user.sub);
    const cambios = diferenciasAuditables(anterior, {
      ...anterior, monto: body.monto, glosa: body.glosa || null,
      fecfac_detren: body.fecfac_detren === undefined ? anterior.fecfac_detren : body.fecfac_detren,
    }, [["monto", "Monto"], ["glosa", "Glosa detalle"], ["fecfac_detren", "Fecha de factura"]]);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId: req.user.sub, region: anterior.region,
      accion: "DETALLE_GASTO_ACTUALIZADO", registroId: String(params.id),
      detalle: `${ubicacion(anterior)}. ${cambios.length ? cambios.join(" · ") : "Guardado sin cambios"}.`,
    });
    res.json(resultado);
  },
  async eliminar(req: Request, res: Response) {
    if (!req.user?.sub) throw new AppError("Sesión inválida.", 401);
    const { params } = gastoProempleoSchema.parse(req);
    const { resultado, anterior } = await service.cambiarGasto(params.id, null, req.user.sub);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId: req.user.sub, region: anterior.region,
      accion: "DETALLE_GASTO_ELIMINADO", registroId: String(params.id),
      detalle: `${ubicacion(anterior)}. Estado de ${valorAuditable(anterior.estado)} a ELIMINADO. Monto eliminado ${anterior.monto} CLP.`,
    });
    res.json(resultado);
  },
};
