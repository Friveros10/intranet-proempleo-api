import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { oficioCoberturaController as controller } from '../controllers/oficioCobertura.controller';
import {
  ciudadesOficioSchema,
  comunasOficioSchema,
  crearOrdinarioSchema,
  folioOficioSchema,
  guardarCoberturasSchema,
  listarOrdinariosSchema,
  programasOficioSchema,
} from '../validations/oficioCobertura.validation';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'MINISTERIO'));
router.get('/', validate(listarOrdinariosSchema), asyncHandler(controller.listar));
router.get('/regiones', asyncHandler(controller.regiones));
router.get('/ciudades', validate(ciudadesOficioSchema), asyncHandler(controller.ciudades));
router.get('/comunas', validate(comunasOficioSchema), asyncHandler(controller.comunas));
router.get('/programas/anios', asyncHandler(controller.programasAnios));
router.get('/programas', validate(programasOficioSchema), asyncHandler(controller.programas));
router.post('/ordinarios', validate(crearOrdinarioSchema), asyncHandler(controller.crearOrdinario));
router.get('/ordinarios/:folio', validate(folioOficioSchema), asyncHandler(controller.buscarOrdinario));
router.get('/ordinarios/:folio/coberturas', validate(folioOficioSchema), asyncHandler(controller.coberturas));
router.post('/coberturas', validate(guardarCoberturasSchema), asyncHandler(controller.guardarCoberturas));

export default router;
