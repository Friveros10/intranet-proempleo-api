import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { intermediariosController as controller } from '../controllers/intermediarios.controller';
import {
  ciudadesSchema,
  comunasSchema,
  guardarIntermediarioSchema,
  guardarResponsableSchema,
  listarIntermediariosSchema,
  obtenerIntermediarioSchema,
  responsablesPorComunaSchema,
} from '../validations/intermediarios.validation';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'MINISTERIO'));
router.get('/', validate(listarIntermediariosSchema), asyncHandler(controller.listar));
router.get('/regiones', asyncHandler(controller.regiones));
router.get('/ciudades', validate(ciudadesSchema), asyncHandler(controller.ciudades));
router.get('/comunas', validate(comunasSchema), asyncHandler(controller.comunas));
router.get('/responsables', validate(responsablesPorComunaSchema), asyncHandler(controller.responsables));
router.post('/responsables', validate(guardarResponsableSchema), asyncHandler(controller.crearResponsable));
router.post('/', validate(guardarIntermediarioSchema), asyncHandler(controller.crear));
router.put('/proempleo/:rut', validate(obtenerIntermediarioSchema), validate(guardarIntermediarioSchema), asyncHandler(controller.actualizar));
router.get('/:rut', validate(obtenerIntermediarioSchema), asyncHandler(controller.obtener));

export default router;
