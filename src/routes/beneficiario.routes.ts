import { Router } from 'express';
import { beneficiarioController } from '../controllers/beneficiario.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/:rut/ficha', asyncHandler(beneficiarioController.ficha));
router.get('/:rut/activo', asyncHandler(beneficiarioController.activo));

export default router;
