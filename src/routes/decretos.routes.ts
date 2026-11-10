import { Router } from 'express';
import { desvincularProyectoDecretoSchema } from '../validations/decretos.validation';
import { proyectosDecretoSchema, asociarProyectoDecretoSchema, buscarProyectoDecretoSchema } from '../validations/decretos.validation';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { decretosController as controller } from '../controllers/decretos.controller';
import { glosasDecretoSchema, guardarDecretoSchema, listarDecretosSchema, obtenerDecretoSchema } from '../validations/decretos.validation';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'MINISTERIO'));
router.get('/', validate(listarDecretosSchema), asyncHandler(controller.listar));
router.get('/anios', asyncHandler(controller.anios));
router.get('/programas', asyncHandler(controller.programas));
router.get('/intermediarios', asyncHandler(controller.intermediarios));
router.get('/programas/:id/glosas', validate(glosasDecretoSchema), asyncHandler(controller.glosas));
router.post('/', validate(guardarDecretoSchema), asyncHandler(controller.crear));
router.put('/proempleo/:folio', validate(obtenerDecretoSchema), validate(guardarDecretoSchema), asyncHandler(controller.actualizar));
router.get('/:folio', validate(obtenerDecretoSchema), asyncHandler(controller.obtener));
router.get('/:folio/proyectos', validate(proyectosDecretoSchema), asyncHandler(controller.proyectos));
router.get('/:folio/proyectos/buscar', validate(buscarProyectoDecretoSchema), asyncHandler(controller.buscarProyecto));
router.get('/:folio/proyectos/disponibles', validate(proyectosDecretoSchema), asyncHandler(controller.proyectosDisponibles));
router.post('/:folio/proyectos', validate(proyectosDecretoSchema), validate(asociarProyectoDecretoSchema), asyncHandler(controller.asociarProyecto));
router.delete('/:folio/proyectos/:proyecto', validate(desvincularProyectoDecretoSchema), asyncHandler(controller.desvincularProyecto));

export default router;
