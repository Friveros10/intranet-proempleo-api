import { Request, Response } from "express";
import { usuarioService } from "../services/usuario.service";

export const usuarioController = {
  async listar(_req: Request, res: Response): Promise<void> {
    const data = await usuarioService.listar();
    res.status(200).json(data);
  },

  async listarRoles(_req: Request, res: Response): Promise<void> {
    const data = await usuarioService.listarRoles();
    res.status(200).json(data);
  },

  async crear(req: Request, res: Response): Promise<void> {
    const data = await usuarioService.crear(req.body, Number(req.user!.sub));
    res.status(201).json(data);
  },

  async obtenerPerfil(req: Request, res: Response): Promise<void> {
    const data = await usuarioService.obtenerPerfil(Number(req.user!.sub));
    res.status(200).json(data);
  },

  async actualizarPerfil(req: Request, res: Response): Promise<void> {
    const data = await usuarioService.actualizarPerfil(Number(req.user!.sub), req.body);
    res.status(200).json(data);
  },

  async cambiarClave(req: Request, res: Response): Promise<void> {
    await usuarioService.cambiarClave(Number(req.user!.sub), req.body);
    res.status(200).json({ message: "Contraseña actualizada correctamente" });
  },
};
