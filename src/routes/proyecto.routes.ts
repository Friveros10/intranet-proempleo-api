import { Router } from 'express';
import { proyectoController } from '../controllers/proyecto.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermisos } from '../middlewares/rbac.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get(
  '/folio/:folio',
  requirePermisos('REM_CREAR'),
  asyncHandler(proyectoController.buscarPorFolio),
);

export default router;
