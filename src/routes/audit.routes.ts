import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

router.get('/', requireAuth, requireRoles('ADMINISTRADOR'), auditController.listar);

export default router;
