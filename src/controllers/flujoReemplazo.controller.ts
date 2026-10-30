import { Request, Response } from "express";
import { flujoReemplazoService as service } from "../services/flujoReemplazo.service";
import { usuarioSicapRepository } from "../repositories/sicap/usuarioSicap.repository";
import { AppError } from "../utils/AppError";
import type { ListarReemplazoQuery } from "../validations/reemplazoBenProyecto.validation";
import { listarReemplazoSchema } from "../validations/reemplazoBenProyecto.validation";

function usuario(req: Request) {
  if (!req.user) throw new AppError("No autenticado", 401);
  return { rut: Number(req.user.sub), roles: req.user.roles };
}

function id(req: Request) {
  const valor = Number(req.params.id);
  if (!Number.isSafeInteger(valor) || valor <= 0) throw new AppError("Identificador inválido", 400);
  return valor;
}

// La validación de período solo aplica a INTENDENCIA (quienes crean y suben
// solicitudes). MINISTERIO y ADMIN pueden revisar documentos de cualquier
// región sin importar si su período está cerrado.
async function periodo(req: Request) {
  const { rut, roles } = usuario(req);
  if (roles.includes("ADMIN") || roles.includes("MINISTERIO")) return;
  const usuarioActual = await usuarioSicapRepository.findByRut(rut);
  const habilitado = await service.periodoHabilitado(usuarioActual?.reg_usu ?? null);
  if (!habilitado) {
    throw new AppError("Operación fuera del periodo habilitado", 403);
  }
}

export const flujoReemplazoController = {
  async configuraciones(_req: Request, res: Response) {
    res.json(await service.configuraciones());
  },
  async configurar(req: Request, res: Response) {
    res.json(await service.configurar(Number(req.params.idRegion), req.body.status, usuario(req).rut, req));
  },
  async configurarPeriodo(req: Request, res: Response) {
    res.json(await service.configurarPeriodo(
      Number(req.params.idRegion),
      Number(req.body.fechaDesde),
      Number(req.body.fechaHasta),
      usuario(req).rut,
      req,
    ));
  },
  async actual(req: Request, res: Response) {
    res.json(await service.actual(usuario(req).rut));
  },
  async listar(req: Request, res: Response) {
    const { rut, roles } = usuario(req);
    const filtros: ListarReemplazoQuery = listarReemplazoSchema.parse({ query: req.query }).query;
    res.json(await service.listar(filtros, rut, roles));
  },
  async obtener(req: Request, res: Response) {
    const { rut, roles } = usuario(req);
    res.json(await service.obtener(id(req), rut, roles));
  },
  async crear(req: Request, res: Response) {
    await periodo(req);
    const archivos = Array.isArray(req.files) ? req.files : [];
    res.status(201).json({
      message: "Solicitud de reemplazo creada correctamente",
      data: await service.crear(req.body, archivos, usuario(req).rut, req),
    });
  },
  async estado(req: Request, res: Response) {
    await periodo(req);
    res.json({
      message: "Solicitud actualizada correctamente",
      data: await service.estado(id(req), req.body.status, req.body.comentarioRechazo, usuario(req).rut, req),
    });
  },
  async checklist(req: Request, res: Response) {
    await periodo(req);
    res.json({
      message: "Checklist individual guardado correctamente",
      data: await service.checklist(req.body, usuario(req).rut, req),
    });
  },
  async documentos(req: Request, res: Response) {
    res.json(await service.documentos(id(req), usuario(req).rut));
  },
  async estadoDocumento(req: Request, res: Response) {
    await periodo(req);
    res.json({
      message: "Documento actualizado correctamente",
      data: await service.estadoDocumento(id(req), req.body.status, req.body.comentarioRechazo, usuario(req).rut, req),
    });
  },
  async reemplazarDocumento(req: Request, res: Response) {
    await periodo(req);
    if (!req.file) throw new AppError("Debes adjuntar un archivo PDF", 400);
    res.json(await service.reemplazarDocumento(id(req), req.file, usuario(req).rut, req));
  },
  async eliminar(req: Request, res: Response) {
    await service.eliminar(id(req), usuario(req).rut, req);
    res.json({ message: "Solicitud eliminada correctamente" });
  },
};
