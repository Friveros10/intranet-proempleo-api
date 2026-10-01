import { Request, Response } from "express";
import { reemplazoBenProyectoService } from "../services/reemplazoBenProyecto.service";
import { AppError } from "../utils/AppError";
import { ListarReemplazoQuery } from "../validations/reemplazoBenProyecto.validation";

export const reemplazoBenProyectoController = {
  async listar(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("No autenticado", 401);
    }
    const { region, fechaDesde, fechaHasta, status } =
      req.query as unknown as ListarReemplazoQuery;
    const reemplazos = await reemplazoBenProyectoService.listar(
      { region, fechaDesde, fechaHasta, status },
      Number(req.user.sub),
      req.user.roles,
    );
    res.status(200).json(reemplazos);
  },

  async listarRegiones(_req: Request, res: Response): Promise<void> {
    const regiones = await reemplazoBenProyectoService.listarRegiones();
    res.status(200).json(regiones);
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
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const periodoHabilitado = diaActual >= 1 && diaActual <= 30;
    //si periodoHabilitado es true o el usuario es ADMIN, se permite crear reemplazo
    if (!periodoHabilitado && !req.user.roles.includes("ADMIN")) {
      throw new AppError(
        "No se puede crear Reemplazo de Cupo fuera del periodo habilitado",
        403,
      );
    }
    const archivos = (req.files as Express.Multer.File[]) ?? [];
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
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const periodoHabilitado = diaActual >= 1 && diaActual <= 30;
    //si periodoHabilitado es true o el usuario es ADMIN, se permite actualizar estado
    if (!periodoHabilitado && !req.user.roles.includes("ADMIN")) {
      throw new AppError(
        "No se puede actualizar el estado fuera del periodo habilitado",
        403,
      );
    }
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
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const periodoHabilitado = diaActual >= 1 && diaActual <= 30;
    //si periodoHabilitado es true o el usuario es ADMIN, se permite actualizar checklist
    if (!periodoHabilitado && !req.user.roles.includes("ADMIN")) {
      throw new AppError(
        "No se puede actualizar el checklist fuera del periodo habilitado",
        403,
      );
    }
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
