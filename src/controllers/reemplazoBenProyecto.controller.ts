import { Request, Response } from "express";
import { reemplazoBenProyectoService } from "../services/reemplazoBenProyecto.service";
import { AppError } from "../utils/AppError";
import { ListarReemplazoQuery } from "../validations/reemplazoBenProyecto.validation";
import { flujoReemplazoService } from "../services/flujoReemplazo.service";
import { usuarioSicapRepository } from "../repositories/sicap/usuarioSicap.repository";

// La validación de período solo aplica a INTENDENCIA (quienes crean y suben
// solicitudes). MINISTERIO y ADMIN pueden revisar documentos de cualquier
// región sin importar si su período está cerrado.
async function validarPeriodo(req: Request): Promise<void> {
  if (!req.user) throw new AppError("No autenticado", 401);
  if (req.user.roles.includes("ADMIN") || req.user.roles.includes("MINISTERIO")) return;
  const usuario = await usuarioSicapRepository.findByRut(Number(req.user.sub));
  const habilitado = await flujoReemplazoService.periodoHabilitado(usuario?.reg_usu ?? null);
  if (!habilitado) {
    throw new AppError("Operación fuera del periodo habilitado", 403);
  }
}

export const reemplazoBenProyectoController = {
  async listar(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("No autenticado", 401);
    }
    const { region, comuna, fechaDesde, fechaHasta, status } =
      req.query as unknown as ListarReemplazoQuery;
    const reemplazos = await reemplazoBenProyectoService.listar(
      { region, comuna, fechaDesde, fechaHasta, status },
      Number(req.user.sub),
      req.user.roles,
    );
    res.status(200).json(reemplazos);
  },

  async listarRegiones(_req: Request, res: Response): Promise<void> {
    const regiones = await reemplazoBenProyectoService.listarRegiones();
    res.status(200).json(regiones);
  },
  async listarRegionesActivas(_req: Request, res: Response): Promise<void> {
    const regiones = await reemplazoBenProyectoService.listarRegionesActivas();
    res.status(200).json(regiones);
  },  

  async listarComunas(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("No autenticado", 401);
    }
    const region = req.query.region ? Number(req.query.region) : undefined;
    const comunas = await reemplazoBenProyectoService.listarComunas(
      region,
      Number(req.user.sub),
    );
    res.status(200).json(comunas);
  },

  async obtener(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("No autenticado", 401);
    }
    const reemplazo = await reemplazoBenProyectoService.obtenerPorId(
      Number(req.params.id),
      Number(req.user.sub),
      req.user.roles,
    );
    res.status(200).json(reemplazo);
  },

  async crear(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("No autenticado", 401);
    }
    await validarPeriodo(req);
    const archivos = (req.files as Express.Multer.File[]) ?? [];
    const flujo = await flujoReemplazoService.actual(Number(req.user.sub));
    if (flujo.status === 1) {
      throw new AppError("La configuración de tu región cambió. Cierra y vuelve a abrir la solicitud.", 409);
    }
    const reemplazo = await reemplazoBenProyectoService.crear(
      req.body,
      archivos,
      Number(req.user.sub),
      req,
    );
    res
      .status(201)
      .json({ message: "Solicitud de reemplazo creada correctamente", data: reemplazo });
  },

  async actualizarEstado(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("No autenticado", 401);
    }
    await validarPeriodo(req);
    const reemplazo = await reemplazoBenProyectoService.actualizarEstado(
      Number(req.params.id),
      req.body.status,
      Number(req.user.sub),
      req,
      req.body.comentarioRechazo ?? null,
    );
    const mensajesEstado: Record<string, string> = {
      aprobado: "Solicitud aprobada correctamente",
      rechazado: "Solicitud rechazada correctamente",
      revisado: "Solicitud marcada como revisada",
      enRevision: "Solicitud puesta en revisión",
    };
    res.status(200).json({
      message: mensajesEstado[req.body.status] ?? "Solicitud actualizada correctamente",
      data: reemplazo,
    });
  },

  async actualizarChecklist(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("No autenticado", 401);
    }
    await validarPeriodo(req);
    const reemplazos = await reemplazoBenProyectoService.actualizarChecklist(
      req.body,
      Number(req.user.sub),
      req,
    );
    res
      .status(200)
      .json({ message: "Checklist guardado correctamente", data: reemplazos });
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("No autenticado", 401);
    }
    await reemplazoBenProyectoService.eliminar(
      Number(req.params.id),
      Number(req.user.sub),
      req,
    );
    res.status(200).json({ message: "Solicitud eliminada correctamente" });
  },
};
