import { Router } from 'express';
import { docReemplazoBenProyectoController } from '../controllers/docReemplazoBenProyecto.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadDocumentoReemplazo, uploadDocumentosReemplazoEnMemoria } from '../middlewares/upload.middleware';
import {
  crearDocReemplazoSchema,
  actualizarEstadoDocReemplazoSchema,
} from '../validations/docReemplazoBenProyecto.validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/catalogo', asyncHandler(docReemplazoBenProyectoController.listarCatalogo));
router.get('/', asyncHandler(docReemplazoBenProyectoController.listar));
router.get('/reemplazo/:idReemplazo', asyncHandler(docReemplazoBenProyectoController.listarPorReemplazo));
router.get('/:id', asyncHandler(docReemplazoBenProyectoController.obtener));
router.post(
  '/',
  uploadDocumentoReemplazo.single('archivo'),
  validate(crearDocReemplazoSchema),
  asyncHandler(docReemplazoBenProyectoController.crear)
);
router.patch(
  '/:id/estado',
  validate(actualizarEstadoDocReemplazoSchema),
  asyncHandler(docReemplazoBenProyectoController.actualizarEstado)
);
router.patch(
  '/:id/archivo',
  requireRoles('INTENDENCIA'),
  uploadDocumentosReemplazoEnMemoria.single('archivo'),
  asyncHandler(docReemplazoBenProyectoController.reemplazarArchivo)
);

export default router;
