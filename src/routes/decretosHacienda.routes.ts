import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { decretosHaciendaController as controller } from '../controllers/decretosHacienda.controller';
import { listarDecretosHaciendaSchema, obtenerDecretoHaciendaSchema } from '../validations/decretosHacienda.validation';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'MINISTERIO'));
router.get('/', validate(listarDecretosHaciendaSchema), asyncHandler(controller.listar));
router.get('/anios', asyncHandler(controller.anios));
router.get('/programas', asyncHandler(controller.programas));
router.get('/:folio', validate(obtenerDecretoHaciendaSchema), asyncHandler(controller.obtener));

export default router;
