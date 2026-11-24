import { Router } from 'express';
import { ordinariosController as controller } from '../controllers/ordinarios.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import transferenciasRoutes from './transferencias.routes';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'MINISTERIO'));
router.get('/', asyncHandler(controller.listar));
router.post('/', asyncHandler(controller.crear));
router.get('/:ordinario', asyncHandler(controller.obtener));
router.use(transferenciasRoutes);

export default router;
