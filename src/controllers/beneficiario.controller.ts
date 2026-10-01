import { Request, Response } from "express";
import { beneficiarioService } from "../services/beneficiario.service";
import { ListarBeneficiariosQuery } from '../validations/beneficiario.validation';

export const beneficiarioController = {
  async listar(req: Request, res: Response): Promise<void> {
    const data = await beneficiarioService.listar(req.query as unknown as ListarBeneficiariosQuery, Number(req.user!.sub));
    res.status(200).json(data);
  },

  async obtener(req: Request, res: Response): Promise<void> {
    const data = await beneficiarioService.obtenerPorRut(req.params.rut, Number(req.user!.sub));
    res.status(200).json(data);
  },

  async obtenerBenpro(req: Request, res: Response): Promise<void> {
    const data = await beneficiarioService.obtenerBenpro(req.params.rut, Number(req.user!.sub));
    res.status(200).json(data);
  },

  async crear(req: Request, res: Response): Promise<void> {
    const data = await beneficiarioService.crear(req.body, Number(req.user!.sub), req);
    res.status(201).json(data);
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    await beneficiarioService.eliminar(req.params.rut, Number(req.user!.sub), req);
    res.status(204).send();
  },

  async completarFicha(req: Request, res: Response): Promise<void> {
    const data = await beneficiarioService.completarFicha(req.params.rut, req.body, Number(req.user!.sub), req);
    res.status(200).json(data);
  },

  async listarRegiones(_req: Request, res: Response): Promise<void> {
    const data = await beneficiarioService.listarRegiones();
    res.status(200).json(data);
  },

  async listarCiudades(req: Request, res: Response): Promise<void> {
    const region = typeof req.query.region === 'string' ? Number(req.query.region) : undefined;
    const data = await beneficiarioService.listarCiudades(region);
    res.status(200).json(data);
  },

  async listarComunas(req: Request, res: Response): Promise<void> {
    const ciudad = typeof req.query.ciudad === 'string' ? Number(req.query.ciudad) : undefined;
    const data = await beneficiarioService.listarComunas(ciudad);
    res.status(200).json(data);
  },

  async ficha(req: Request, res: Response): Promise<void> {
    const ficha = await beneficiarioService.buscarFichaPorRut(req.params.rut);
    res.status(200).json(ficha);
  },

  async activo(req: Request, res: Response): Promise<void> {
    const data = await beneficiarioService.buscarActivoPorRut(
      req.params.rut,
      Number(req.user!.sub),
    );
    if (!data) {
      res.status(404).json({ message: "Beneficiario activo no encontrado." });
      return;
    }
    res.status(200).json(data);
  },
};
