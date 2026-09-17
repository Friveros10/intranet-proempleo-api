import { Router } from 'express';
import { sicapController } from '../controllers/sicap.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/health', asyncHandler(sicapController.health));

export default router;
