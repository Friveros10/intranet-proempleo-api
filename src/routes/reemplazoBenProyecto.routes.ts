import { Router } from "express";
import { reemplazoBenProyectoController } from "../controllers/reemplazoBenProyecto.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermisos, requireRoles } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import { uploadDocumentosReemplazoEnMemoria } from "../middlewares/upload.middleware";
import {
  crearReemplazoSchema,
  actualizarEstadoReemplazoSchema,
  listarReemplazoSchema,
} from "../validations/reemplazoBenProyecto.validation";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth);

router.get(
  "/regiones",
  requirePermisos("REM_VERALL", "REM_VERREG", "REM_CREAR"),
  asyncHandler(reemplazoBenProyectoController.listarRegiones),
);
router.get(
  "/",
  requirePermisos("REM_VERALL", "REM_VERREG"),
  validate(listarReemplazoSchema),
  asyncHandler(reemplazoBenProyectoController.listar),
);
router.get(
  "/:id",
  requirePermisos("REM_VERALL", "REM_VERREG"),
  asyncHandler(reemplazoBenProyectoController.obtener),
);
router.post(
  "/",
  requirePermisos("REM_CREAR"),
  uploadDocumentosReemplazoEnMemoria.array("documentos"),
  validate(crearReemplazoSchema),
  asyncHandler(reemplazoBenProyectoController.crear),
);
router.patch(
  "/:id/estado",
  requirePermisos("REM_APROB", "REM_RECHAZ"),
  validate(actualizarEstadoReemplazoSchema),
  asyncHandler(reemplazoBenProyectoController.actualizarEstado),
);
router.delete(
  "/:id",
  requireRoles("ADMIN"),
  asyncHandler(reemplazoBenProyectoController.eliminar),
);

export default router;
