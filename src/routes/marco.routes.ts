import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { marcoController } from '../controllers/marco.controller';
import { guardarMarcoSchema, listarMarcosSchema, obtenerMarcoSchema } from '../validations/marco.validation';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'MINISTERIO'));
router.get('/', validate(listarMarcosSchema), asyncHandler(marcoController.listar));
router.get('/anios', asyncHandler(marcoController.anios));
router.post('/', validate(guardarMarcoSchema), asyncHandler(marcoController.crear));
router.put('/proempleo/:id', validate(obtenerMarcoSchema), validate(guardarMarcoSchema), asyncHandler(marcoController.actualizar));
router.get('/:id', validate(obtenerMarcoSchema), asyncHandler(marcoController.obtener));

export default router;
