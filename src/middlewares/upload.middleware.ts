import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
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

export const uploadDocumentoReemplazo = multer({ storage, fileFilter });

// Almacenamiento en memoria: se usa cuando aún no existe el id del reemplazo
// (se crea solicitud + beneficiario + documentos en una sola petición) y los
// archivos se escriben a disco recién después de conocer ese id.
export const uploadDocumentosReemplazoEnMemoria = multer({ storage: multer.memoryStorage(), fileFilter });

export function guardarDocumentoEnDisco(idReemplazo: number, file: Express.Multer.File): string {
  const carpetaReemplazo = path.join(UPLOADS_ROOT, String(idReemplazo));
  if (!fs.existsSync(carpetaReemplazo)) {
    fs.mkdirSync(carpetaReemplazo, { recursive: true });
  }
  const nombreUnico = `${Date.now()}-${file.originalname}`;
  fs.writeFileSync(path.join(carpetaReemplazo, nombreUnico), file.buffer);
  return `/uploads/reemplazos/${idReemplazo}/${nombreUnico}`;
}
