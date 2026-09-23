import { Router } from 'express';
import { beneficiarioController } from '../controllers/beneficiario.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermisos } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { crearBeneficiarioSchema, listarBeneficiariosSchema } from '../validations/beneficiario.validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get(
	'/',
	requirePermisos('BEN_VERALL', 'BEN_VERCOM'),
	validate(listarBeneficiariosSchema),
	asyncHandler(beneficiarioController.listar)
);
router.post(
	'/',
	requirePermisos('BEN_CREAR'),
	validate(crearBeneficiarioSchema),
	asyncHandler(beneficiarioController.crear)
);
router.get('/catalogos/regiones', requirePermisos('BEN_VERALL', 'BEN_VERCOM', 'BEN_CREAR'), asyncHandler(beneficiarioController.listarRegiones));
router.get('/catalogos/ciudades', requirePermisos('BEN_VERALL', 'BEN_VERCOM', 'BEN_CREAR'), asyncHandler(beneficiarioController.listarCiudades));
router.get('/catalogos/comunas', requirePermisos('BEN_VERALL', 'BEN_VERCOM', 'BEN_CREAR'), asyncHandler(beneficiarioController.listarComunas));
router.get('/:rut/ficha', asyncHandler(beneficiarioController.ficha));
router.get('/:rut/activo', asyncHandler(beneficiarioController.activo));
router.get('/:rut', requirePermisos('BEN_VERALL', 'BEN_VERCOM'), asyncHandler(beneficiarioController.obtener));
router.get('/:rut/proyectos', requirePermisos('BEN_VERALL', 'BEN_VERCOM'), asyncHandler(beneficiarioController.obtenerBenpro));


export default router;
