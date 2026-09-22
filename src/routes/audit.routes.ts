import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', requireAuth, requireRoles('ADMIN'), asyncHandler(auditController.listar));
router.get('/notificaciones', requireAuth, asyncHandler(auditController.listarNotificaciones));
router.patch('/notificaciones/vistas', requireAuth, asyncHandler(auditController.marcarNotificacionesVistas));

export default router;
