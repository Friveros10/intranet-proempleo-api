import { Router } from 'express';
import authRoutes from './auth.routes';
import auditRoutes from './audit.routes';
import sicapRoutes from './sicap.routes';
import reemplazoBenProyectoRoutes from './reemplazoBenProyecto.routes';
import docReemplazoBenProyectoRoutes from './docReemplazoBenProyecto.routes';
import beneficiarioRoutes from './beneficiario.routes';
import planEgresoHistoricoRoutes from './planEgresoHistorico.routes';
import wsRoutes from './ws.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/audit', auditRoutes);
router.use('/sicap', sicapRoutes);
router.use('/reemplazos', reemplazoBenProyectoRoutes);
router.use('/documentos-reemplazo', docReemplazoBenProyectoRoutes);
router.use('/beneficiarios', beneficiarioRoutes);
router.use('/plan-egreso-historico', planEgresoHistoricoRoutes);
router.use('/ws', wsRoutes);

export default router;
