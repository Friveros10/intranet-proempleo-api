import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { bancoProyectosRepository as repository, type DatosBancoProyecto } from "../repositories/bancoProyectos.repository";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { diferenciasAuditables, valorAuditable, type CamposAuditables } from "../utils/auditoriaCambios";
import { registrarAuditoriaOpcional } from "../utils/auditoriaOpcional";

const router = Router();
const parametros = z.object({ id: z.coerce.number().int().positive().max(2147483647) });
const formulario = z.object({
  nombre_proyecto: z.string().trim().min(1).max(300),
  categoria: z.string().trim().min(1).max(150),
  alcance: z.string().trim().min(1).max(2000),
});
const auditoria = { modulo: "BANCO_PROYECTOS", entidad: "BANCO_PROYECTOS_PROEMPLEO" };
const camposAuditables: CamposAuditables<DatosBancoProyecto> = [
  ["nombre_proyecto", "Nombre del proyecto"],
  ["categoria", "Categoría"],
  ["alcance", "Alcance"],
];

router.use(requireAuth, requireRoles("ADMIN", "MINISTERIO"));

router.get("/", asyncHandler(async (_req, res) => {
  res.json(await repository.listar());
}));

router.post("/", asyncHandler(async (req, res) => {
  const registro = await repository.crear(formulario.parse(req.body));
  const detalle = camposAuditables.map(([campo, nombre]) => `${nombre} ${valorAuditable(registro[campo])}`).join(" · ");
  registrarAuditoriaOpcional({
    ...auditoria, req, usuarioId: req.user!.sub,
    accion: "BANCO_PROYECTO_CREADO", registroId: String(registro.id), detalle,
  });
  res.status(201).json(registro);
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = parametros.parse(req.params);
  const registro = await repository.actualizar(id, formulario.parse(req.body));
  if (!registro) throw new AppError("Entrada del banco de proyectos no encontrada", 404);
  const { anterior, actual } = registro;
  const cambios = diferenciasAuditables<DatosBancoProyecto>(anterior, actual, camposAuditables);
  registrarAuditoriaOpcional({
    ...auditoria, req, usuarioId: req.user!.sub,
    accion: "BANCO_PROYECTO_ACTUALIZADO", registroId: String(actual.id),
    detalle: cambios.join(" · ") || "Guardado sin cambios.",
  });
  res.json(actual);
}));

router.delete("/:id", requireRoles("ADMIN"), asyncHandler(async (req, res) => {
  const { id } = parametros.parse(req.params);
  const registro = await repository.eliminar(id);
  if (!registro) throw new AppError("Entrada del banco de proyectos no encontrada", 404);
  registrarAuditoriaOpcional({
    ...auditoria, req, usuarioId: req.user!.sub,
    accion: "BANCO_PROYECTO_ELIMINADO", registroId: String(registro.id),
    detalle: `Proyecto ${valorAuditable(registro.nombre_proyecto)}. Estado de activo a eliminado.`,
  });
  res.json({ id: registro.id });
}));

export default router;
