import { Router } from 'express';
import { wsController } from '../controllers/ws.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/rsh/:rut', requireAuth, asyncHandler(wsController.consultarRsh));

export default router;