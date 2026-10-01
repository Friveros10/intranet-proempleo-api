import { Router } from 'express';
import { usuarioController } from '../controllers/usuario.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { actualizarDatosPersonalesSchema, cambiarClaveSchema, crearUsuarioSchema } from '../validations/usuario.validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

// Autogestión: cualquier usuario autenticado puede ver/editar su propio perfil
router.get('/perfil', asyncHandler(usuarioController.obtenerPerfil));
router.put('/perfil', validate(actualizarDatosPersonalesSchema), asyncHandler(usuarioController.actualizarPerfil));
router.put('/perfil/clave', validate(cambiarClaveSchema), asyncHandler(usuarioController.cambiarClave));

// Módulo de administración: solo visible/editable por ADMIN
router.get('/', requireRoles('ADMIN'), asyncHandler(usuarioController.listar));
router.post('/', requireRoles('ADMIN'), validate(crearUsuarioSchema), asyncHandler(usuarioController.crear));
router.get('/catalogos/roles', requireRoles('ADMIN'), asyncHandler(usuarioController.listarRoles));

export default router;
