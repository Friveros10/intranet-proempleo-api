import { Router } from 'express';
import { transferenciasController as controller } from '../controllers/transferencias.controller';
import { asyncHandler } from '../utils/asyncHandler';

// Subrutas de ordinarios. El router padre aplica autenticación y roles.
const router = Router();
router.get('/decretos/:decreto', asyncHandler(controller.buscarDecreto));
router.get('/decretos/:decreto/proyectos', asyncHandler(controller.proyectos));
router.get('/:ordinario/transferencias', asyncHandler(controller.listar));
router.post('/:ordinario/transferencias', asyncHandler(controller.registrar));
router.patch('/:ordinario/transferencias/:id', asyncHandler(controller.actualizar));

export default router;
