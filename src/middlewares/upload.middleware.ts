import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import { ErrorRequestHandler, Request } from 'express';
import { AppError } from '../utils/AppError';

// Carpeta local donde se guardan temporalmente los PDF de reemplazos (pendiente migrar a storage definitivo)
export const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads', 'reemplazos');

if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req: Request, _file, cb) {
    const idReemplazo = req.body.idReemplazoBenProyecto;
    const carpetaReemplazo = path.join(UPLOADS_ROOT, String(idReemplazo));
    if (!fs.existsSync(carpetaReemplazo)) {
      fs.mkdirSync(carpetaReemplazo, { recursive: true });
    }
    cb(null, carpetaReemplazo);
  },
  filename(_req, file, cb) {
    const nombreUnico = `${Date.now()}-${file.originalname}`;
    cb(null, nombreUnico);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (file.mimetype !== 'application/pdf') {
    cb(new AppError('Todos los documentos deben cargarse en formato PDF', 400));
    return;
  }
  cb(null, true);
}

export const MAX_PDF_REEMPLAZO_BYTES = 10 * 1024 * 1024;
const limits = { fileSize: MAX_PDF_REEMPLAZO_BYTES };

export const uploadDocumentoReemplazo = multer({ storage, fileFilter, limits });

// Almacenamiento en memoria: se usa cuando aún no existe el id del reemplazo
// (se crea solicitud + beneficiario + documentos en una sola petición) y los
// archivos se escriben a disco recién después de conocer ese id.
export const uploadDocumentosReemplazoEnMemoria = multer({ storage: multer.memoryStorage(), fileFilter, limits });

export const errorCargaDocumentoReemplazo: ErrorRequestHandler = (err, _req, _res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    next(new AppError('Cada PDF puede tener como máximo 10 MB', 400));
    return;
  }
  next(err);
};

export function guardarDocumentoEnDisco(idReemplazo: number, file: Express.Multer.File): string {
  const carpetaReemplazo = path.join(UPLOADS_ROOT, String(idReemplazo));
  if (!fs.existsSync(carpetaReemplazo)) {
    fs.mkdirSync(carpetaReemplazo, { recursive: true });
  }
  const nombreUnico = `${Date.now()}-${file.originalname}`;
  fs.writeFileSync(path.join(carpetaReemplazo, nombreUnico), file.buffer);
  return `/uploads/reemplazos/${idReemplazo}/${nombreUnico}`;
}

export function eliminarDocumentoEnDisco(archivoUrl: string): void {
  if (!archivoUrl.startsWith('/uploads/reemplazos/')) return;
  const archivo = path.resolve(process.cwd(), archivoUrl.replace(/^\//, ''));
  if (!archivo.startsWith(UPLOADS_ROOT)) return;
  if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
}
