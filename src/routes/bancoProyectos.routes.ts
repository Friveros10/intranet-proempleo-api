import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { bancoProyectosRepository as repository } from "../repositories/bancoProyectos.repository";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const parametros = z.object({ id: z.coerce.number().int().positive().max(2147483647) });
const formulario = z.object({
  nombre_proyecto: z.string().trim().min(1).max(300),
  categoria: z.string().trim().min(1).max(150),
  alcance: z.string().trim().min(1).max(2000),
});

router.use(requireAuth, requireRoles("ADMIN", "MINISTERIO"));

router.get("/", asyncHandler(async (_req, res) => {
  res.json(await repository.listar());
}));

router.post("/", asyncHandler(async (req, res) => {
  res.status(201).json(await repository.crear(formulario.parse(req.body)));
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = parametros.parse(req.params);
  const registro = await repository.actualizar(id, formulario.parse(req.body));
  if (!registro) throw new AppError("Entrada del banco de proyectos no encontrada", 404);
  res.json(registro);
}));

router.delete("/:id", requireRoles("ADMIN"), asyncHandler(async (req, res) => {
  const { id } = parametros.parse(req.params);
  const registro = await repository.eliminar(id);
  if (!registro) throw new AppError("Entrada del banco de proyectos no encontrada", 404);
  res.json(registro);
}));

export default router;
