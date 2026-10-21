import { Router } from "express";
import { flujoReemplazoController as controller } from "../controllers/flujoReemplazo.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermisos, requireRoles } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { configurarFlujoSchema, crearReemplazoIndividualSchema } from "../validations/flujoReemplazo.validation";
import { actualizarChecklistReemplazoSchema, actualizarEstadoReemplazoSchema, listarReemplazoSchema } from "../validations/reemplazoBenProyecto.validation";
import { actualizarEstadoDocReemplazoSchema } from "../validations/docReemplazoBenProyecto.validation";
import { errorCargaDocumentoReemplazo, uploadDocumentosReemplazoEnMemoria } from "../middlewares/upload.middleware";
import { ROLES_CHECKLIST_REEMPLAZO } from "../constants/checklist.constants";

export const configuracionFlujoRoutes = Router();
configuracionFlujoRoutes.use(requireAuth);
configuracionFlujoRoutes.get("/actual", requirePermisos("REM_CREAR"), asyncHandler(controller.actual));
configuracionFlujoRoutes.get("/", requireRoles("ADMIN"), asyncHandler(controller.configuraciones));
configuracionFlujoRoutes.put("/:idRegion", requireRoles("ADMIN"), validate(configurarFlujoSchema), asyncHandler(controller.configurar));

const router = Router();
router.use(requireAuth);
router.get("/", requirePermisos("REM_VERALL", "REM_VERREG"), validate(listarReemplazoSchema), asyncHandler(controller.listar));
router.post("/", requirePermisos("REM_CREAR"), uploadDocumentosReemplazoEnMemoria.array("documentos"), validate(crearReemplazoIndividualSchema), asyncHandler(controller.crear));
router.patch("/checklist", requireRoles(...ROLES_CHECKLIST_REEMPLAZO), validate(actualizarChecklistReemplazoSchema), asyncHandler(controller.checklist));
router.get("/documentos/:id", requirePermisos("REM_VERALL", "REM_VERREG"), asyncHandler(controller.documentos));
router.patch("/documentos/:id/estado", requireRoles("ADMIN", "MINISTERIO"), validate(actualizarEstadoDocReemplazoSchema), asyncHandler(controller.estadoDocumento));
router.patch("/documentos/:id/archivo", requireRoles("ADMIN", "INTENDENCIA"), uploadDocumentosReemplazoEnMemoria.single("archivo"), asyncHandler(controller.reemplazarDocumento));
router.get("/:id", requirePermisos("REM_VERALL", "REM_VERREG"), asyncHandler(controller.obtener));
router.patch("/:id/estado", requirePermisos("REM_APROB", "REM_RECHAZ"), validate(actualizarEstadoReemplazoSchema), asyncHandler(controller.estado));
router.delete("/:id", requireRoles("ADMIN"), asyncHandler(controller.eliminar));
router.use(errorCargaDocumentoReemplazo);

export default router;
