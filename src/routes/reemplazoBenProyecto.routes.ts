import { Router } from 'express';
import { reemplazoBenProyectoController } from '../controllers/reemplazoBenProyecto.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadDocumentosReemplazoEnMemoria } from '../middlewares/upload.middleware';
import { crearReemplazoSchema, actualizarEstadoReemplazoSchema } from '../validations/reemplazoBenProyecto.validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(reemplazoBenProyectoController.listar));
router.get('/:id', asyncHandler(reemplazoBenProyectoController.obtener));
router.post(
  '/',
  uploadDocumentosReemplazoEnMemoria.array('documentos'),
  validate(crearReemplazoSchema),
  asyncHandler(reemplazoBenProyectoController.crear)
);
router.patch(
  '/:id/estado',
  validate(actualizarEstadoReemplazoSchema),
  asyncHandler(reemplazoBenProyectoController.actualizarEstado)
);
router.delete('/:id', asyncHandler(reemplazoBenProyectoController.eliminar));

export default router;
