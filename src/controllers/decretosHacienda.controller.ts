import { Request, Response } from "express";
import { decretosHaciendaService as service } from "../services/decretosHacienda.service";
import {
  guardarDecretoHaciendaSchema,
  listarDecretosHaciendaSchema,
  obtenerDecretoHaciendaSchema,
  programasDecretoHaciendaSchema,
} from "../validations/decretosHacienda.validation";
import { AppError } from "../utils/AppError";
import { registrarAuditoriaOpcional } from "../utils/auditoriaOpcional";
import { describirCambiosHacienda } from "../utils/auditoriaHacienda";

const auditoria = { modulo: "DECRETOS_HACIENDA", entidad: "DECHACIENDA" };

function usuario(req: Request) {
  if (!req.user || !/^\d{1,50}$/.test(req.user.sub))
    throw new AppError("Sesión inválida", 401);
  return req.user.sub;
}

export const decretosHaciendaController = {
  async listar(req: Request, res: Response) {
    const { query } = listarDecretosHaciendaSchema.parse({ query: req.query });
    res.json(await service.listar(query));
  },
  async anios(_req: Request, res: Response) {
    res.json(await service.anios());
  },
  async programas(req: Request, res: Response) {
    const { query } = programasDecretoHaciendaSchema.parse({
      query: req.query,
    });
    res.json(await service.programas(query.anio));
  },
  async obtener(req: Request, res: Response) {
    const { params, query } = obtenerDecretoHaciendaSchema.parse({
      params: req.params,
      query: req.query,
    });
    res.json(await service.obtener(params.folio, query.origen));
  },
  async crear(req: Request, res: Response) {
    const { body } = guardarDecretoHaciendaSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const decreto = await service.crear(body, usuarioId);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId, accion: "DECRETO_HACIENDA_CREADO", registroId: decreto.fol_dechac,
      detalle: `Decreto de Hacienda ${decreto.fol_dechac} creado con ${decreto.detalles.length} detalles.`,
    });
    res.status(201).json(decreto);
  },
  async actualizar(req: Request, res: Response) {
    const { body } = guardarDecretoHaciendaSchema.parse({ body: req.body });
    const usuarioId = usuario(req);
    const { decreto, anterior, detallesAnteriores } = await service.actualizar(req.params.folio, body, usuarioId);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId, accion: "DECRETO_HACIENDA_ACTUALIZADO", registroId: decreto.fol_dechac,
      detalle: describirCambiosHacienda(anterior, detallesAnteriores, decreto),
    });
    res.json(decreto);
  },
};
