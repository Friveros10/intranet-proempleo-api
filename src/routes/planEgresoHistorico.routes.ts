import { Router } from 'express';
import { planEgresoHistoricoController } from '../controllers/planEgresoHistorico.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/:rut', asyncHandler(planEgresoHistoricoController.buscarPorRut));

export default router;
