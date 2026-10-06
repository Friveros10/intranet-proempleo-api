import { ErrorRequestHandler, Router } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../utils/AppError';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadAuditoria } from '../utils/archivosAuditoria';
import { documentoAuditoriaController as controller } from '../controllers/documentoAuditoria.controller';
import {
  crearDocumentoAuditoriaSchema, listarDocumentoAuditoriaSchema,
  documentoAuditoriaParamsSchema, estadoDocumentoAuditoriaSchema,
} from '../validations/documentoAuditoria.validation';

const router = Router();
router.use(requireAuth, requireRoles('INTENDENCIA', 'ADMIN', 'MINISTERIO'));
router.get('/catalogos', asyncHandler(controller.catalogos));
router.get('/', validate(listarDocumentoAuditoriaSchema), asyncHandler(controller.listar));
router.post('/', requireRoles('INTENDENCIA'), uploadAuditoria.fields([
  { name: 'certCotizaciones', maxCount: 1 }, { name: 'liquidacion', maxCount: 1 },
]), validate(crearDocumentoAuditoriaSchema), asyncHandler(controller.crear));
router.patch('/:id/documentos/:tipo/estado', requireRoles('ADMIN', 'MINISTERIO'),
  validate(estadoDocumentoAuditoriaSchema), asyncHandler(controller.estado));
router.patch('/:id/documentos/:tipo/archivo', requireRoles('INTENDENCIA'),
  validate(documentoAuditoriaParamsSchema), uploadAuditoria.single('archivo'),
  asyncHandler(controller.reemplazar));
router.get('/:id/documentos/:tipo/:filename', validate(documentoAuditoriaParamsSchema),
  asyncHandler(controller.archivo));

const uploadErrorHandler: ErrorRequestHandler = (err, _req, _res, next) => {
  if (err instanceof MulterError) {
    return next(new AppError(
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Cada PDF puede tener como máximo 10 MB'
        : 'Carga inválida: adjunte únicamente los documentos solicitados',
      400,
    ));
  }
  next(err);
};
router.use(uploadErrorHandler);

export default router;
