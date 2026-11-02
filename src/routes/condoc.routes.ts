import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { condocController as controller } from '../controllers/condoc.controller';
import {
  cambiarEstadoCondocSchema,
  guardarCondocSchema,
  listarCondocSchema,
  obtenerCondocSchema,
  programasCondocSchema,
} from '../validations/condoc.validation';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'MINISTERIO'));
router.get('/', validate(listarCondocSchema), asyncHandler(controller.listar));
router.get('/anios', asyncHandler(controller.anios));
router.get('/areas', asyncHandler(controller.areas));
router.get('/programas/anios', asyncHandler(controller.programasAnios));
router.get('/programas', validate(programasCondocSchema), asyncHandler(controller.programas));
router.post('/', validate(guardarCondocSchema), asyncHandler(controller.crear));
router.patch('/proempleo/:id/estado', validate(cambiarEstadoCondocSchema), asyncHandler(controller.avanzarEstado));
router.get('/:id', validate(obtenerCondocSchema), asyncHandler(controller.obtener));

export default router;
