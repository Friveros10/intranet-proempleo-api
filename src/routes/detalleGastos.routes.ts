import { Router } from 'express';
import { detalleGastosController as controller } from '../controllers/detalleGastos.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'MINISTERIO'));
router.get('/', asyncHandler(controller.listar));
router.get('/proyecto', asyncHandler(controller.buscarProyecto));
router.post('/', asyncHandler(controller.crear));
router.patch('/proempleo/:id', asyncHandler(controller.editar));
router.delete('/proempleo/:id', asyncHandler(controller.eliminar));

export default router;
