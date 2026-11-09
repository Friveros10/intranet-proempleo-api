import { Router } from 'express';
import { limitarRegionProyectos } from '../middlewares/proyectosRegion.middleware';
import { asignarDecretoProyectoSchema } from '../validations/proyectos.validation';
import { proyectoController } from '../controllers/proyecto.controller';
import { proyectosController as controller } from '../controllers/proyectos.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermisos, requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  catalogoPorComunaSchema,
  eliminarProyectoSchema,
  guardarProyectoSchema,
  listarProyectosSchema,
  obtenerProyectoSchema,
  listarBeneficiariosProyectoSchema,
  agregarBeneficiarioProyectoSchema,
  eliminarBeneficiarioProyectoSchema,
  buscarBeneficiarioProyectoSchema,
} from '../validations/proyectos.validation';
import {
  ciudadesSchema,
  comunasSchema,
  guardarResponsableSchema,
} from '../validations/intermediarios.validation';

const router = Router();

router.use(requireAuth);

// Consulta de cupos usada por el módulo de reemplazos (se mantiene sin cambios).
router.get(
  '/folio/:folio',
  requirePermisos('REM_CREAR'),
  asyncHandler(proyectoController.buscarPorFolio),
);

// Administración de proyectos (tabla paralela proyectos_proempleo), solo ADMIN/MINISTERIO.
const admin = requireRoles('ADMIN', 'MINISTERIO', 'INTENDENCIA');
router.use(admin, asyncHandler(limitarRegionProyectos));
router.get('/', admin, validate(listarProyectosSchema), asyncHandler(controller.listar));
router.get('/banco', admin, asyncHandler(controller.banco));
router.get('/detalle-gastos', admin, asyncHandler(controller.detalleGastos));
router.get('/anios', admin, asyncHandler(controller.anios));
router.get('/filtros', admin, validate(listarProyectosSchema), asyncHandler(controller.opcionesFiltros));
router.get('/regiones', admin, asyncHandler(controller.regiones));
router.get('/ciudades', admin, validate(ciudadesSchema), asyncHandler(controller.ciudades));
router.get('/comunas', admin, validate(comunasSchema), asyncHandler(controller.comunas));
router.get('/intermediarios', admin, validate(catalogoPorComunaSchema), asyncHandler(controller.intermediarios));
router.get('/ejecutores', admin, validate(catalogoPorComunaSchema), asyncHandler(controller.ejecutores));
router.get('/responsables', admin, validate(catalogoPorComunaSchema), asyncHandler(controller.responsables));
router.post('/responsables', admin, validate(guardarResponsableSchema), asyncHandler(controller.crearResponsable));
router.get('/proximo-folio', admin, asyncHandler(controller.proximoFolio));
router.post('/', admin, validate(guardarProyectoSchema), asyncHandler(controller.crear));
router.put('/proempleo/:folio', admin, validate(obtenerProyectoSchema), validate(guardarProyectoSchema), asyncHandler(controller.actualizar));
router.delete('/proempleo/:folio', requireRoles('ADMIN'), validate(eliminarProyectoSchema), asyncHandler(controller.eliminar));
router.get('/:folio/decretos/disponibles', admin, validate(obtenerProyectoSchema), asyncHandler(controller.decretosDisponibles));
router.post('/:folio/decretos', admin, validate(asignarDecretoProyectoSchema), asyncHandler(controller.asignarDecreto));
router.get('/:folio/resumen', admin, validate(obtenerProyectoSchema), asyncHandler(controller.resumen));
router.get('/:folio/beneficiarios', admin, validate(listarBeneficiariosProyectoSchema), asyncHandler(controller.beneficiarios));
router.get('/:folio/beneficiarios/buscar', admin, validate(buscarBeneficiarioProyectoSchema), asyncHandler(controller.buscarBeneficiario));
router.post('/:folio/beneficiarios', admin, validate(agregarBeneficiarioProyectoSchema), asyncHandler(controller.agregarBeneficiario));
router.delete('/:folio/beneficiarios/:rut', admin, validate(eliminarBeneficiarioProyectoSchema), asyncHandler(controller.eliminarBeneficiario));
router.get('/:folio/gastos', admin, validate(obtenerProyectoSchema), asyncHandler(controller.gastos));
router.get('/:folio', admin, validate(obtenerProyectoSchema), asyncHandler(controller.obtener));

export default router;
