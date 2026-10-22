import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { decretosController as controller } from '../controllers/decretos.controller';
import { listarDecretosSchema, obtenerDecretoSchema } from '../validations/decretos.validation';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'MINISTERIO'));
router.get('/', validate(listarDecretosSchema), asyncHandler(controller.listar));
router.get('/anios', asyncHandler(controller.anios));
router.get('/programas', asyncHandler(controller.programas));
router.get('/intermediarios', asyncHandler(controller.intermediarios));
router.get('/:folio', validate(obtenerDecretoSchema), asyncHandler(controller.obtener));

export default router;
