import { Request, Response } from "express";
import { usuarioService } from "../services/usuario.service";
import { diferenciasAuditables } from "../utils/auditoriaCambios";
import { registrarAuditoriaOpcional } from "../utils/auditoriaOpcional";
import { parseRut } from "../utils/rut";

const auditoria = { modulo: "USUARIOS", entidad: "USUARIOS" };

export const usuarioController = {
  async listar(req: Request, res: Response): Promise<void> {
    const data = await usuarioService.listar(Number(req.query.page));
    res.status(200).json(data);
  },

  async listarRoles(_req: Request, res: Response): Promise<void> {
    const data = await usuarioService.listarRoles();
    res.status(200).json(data);
  },

  async crear(req: Request, res: Response): Promise<void> {
    const data = await usuarioService.crear(req.body, Number(req.user!.sub));
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId: req.user!.sub,
      accion: "USUARIO_CREADO", registroId: String(data?.rut_usu ?? parseRut(req.body.rut).cuerpo),
      region: data?.reg_usu ?? req.body.reg_usu,
      detalle: `Usuario creado con perfil ${data?.corr_rol ?? req.body.corr_rol}.`,
    });
    res.status(201).json(data);
  },

  async desactivar(req: Request, res: Response): Promise<void> {
    const rut = Number(req.params.rut);
    if (await usuarioService.desactivar(rut)) {
      registrarAuditoriaOpcional({
        ...auditoria, req, usuarioId: req.user!.sub,
        accion: "USUARIO_DESACTIVADO", registroId: String(rut),
        detalle: "Estado de ACTIVO a INACTIVO.",
      });
    }
    res.status(204).end();
  },

  async resetearClave(req: Request, res: Response): Promise<void> {
    const rut = Number(req.params.rut);
    await usuarioService.resetearClave(rut);
    registrarAuditoriaOpcional({
      ...auditoria, req, usuarioId: req.user!.sub,
      accion: "USUARIO_CLAVE_RESTABLECIDA", registroId: String(rut),
      detalle: "Se restableció la contraseña.",
    });
    res.status(204).end();
  },

  async obtenerPerfil(req: Request, res: Response): Promise<void> {
    const data = await usuarioService.obtenerPerfil(Number(req.user!.sub));
    res.status(200).json(data);
  },

  async actualizarPerfil(req: Request, res: Response): Promise<void> {
    const rut = req.user!.sub;
    const { anterior, actualizado } = await usuarioService.actualizarPerfil(Number(rut), req.body);
    if (actualizado) {
      const cambios = diferenciasAuditables(anterior, actualizado, [
        ["dir_usu", "Dirección"], ["ciu_usu", "Provincia"], ["com_usu", "Comuna"],
        ["ema_usu", "Correo electrónico"],
      ]);
      registrarAuditoriaOpcional({
        ...auditoria, modulo: "CONFIGURACION", req, usuarioId: rut,
        accion: "USUARIO_PERFIL_ACTUALIZADO", registroId: rut, region: actualizado.reg_usu,
        detalle: cambios.join(" · ") || "Perfil guardado sin cambios.",
      });
    }
    res.status(200).json(actualizado);
  },

  async cambiarClave(req: Request, res: Response): Promise<void> {
    const rut = req.user!.sub;
    await usuarioService.cambiarClave(Number(rut), req.body);
    registrarAuditoriaOpcional({
      ...auditoria, modulo: "CONFIGURACION", req, usuarioId: rut,
      accion: "USUARIO_CLAVE_CAMBIADA", registroId: rut,
      detalle: "Se cambió la contraseña.",
    });
    res.status(200).json({ message: "Contraseña actualizada correctamente" });
  },
};
