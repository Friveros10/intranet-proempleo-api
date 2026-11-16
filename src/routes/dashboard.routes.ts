import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { dashboardSchema } from '../validations/dashboard.validation';
import { dashboardService } from '../services/dashboard.service';

const router = Router();
router.get('/', requireAuth, requireRoles('ADMIN', 'MINISTERIO', 'INTENDENCIA', 'DELEGACION'), asyncHandler(async (req, res) => {
  const { query } = dashboardSchema.parse({ query: req.query });
  res.json(await dashboardService.obtener(query, Number(req.user!.sub), req.user!.roles));
}));
export default router;
