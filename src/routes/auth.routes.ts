import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema } from '../validations/auth.validation';
import { requireAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/logout', requireAuth, authController.logout);
router.post('/refresh', asyncHandler(authController.refresh));
router.get('/session', requireAuth, asyncHandler(authController.sesion));

export default router;
