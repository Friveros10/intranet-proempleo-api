import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { AppError } from './AppError';
import { TipoDocumentoAuditoria } from '../constants/documentosAuditoria';

// Fuera de /uploads: los documentos se sirven solo por la API autenticada.
const root = path.resolve(process.cwd(), 'storage', 'documentos-auditoria');
export const MAX_PDF_AUDITORIA = 10 * 1024 * 1024;

export const uploadAuditoria = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_AUDITORIA, files: 2, fields: 6 },
  fileFilter(_req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new AppError('Los documentos deben estar en formato PDF', 400));
    }
    cb(null, true);
  },
});

export function validarPdfAuditoria(file: Express.Multer.File): void {
  if (file.mimetype !== 'application/pdf' || file.buffer.subarray(0, 5).toString() !== '%PDF-') {
    throw new AppError('El archivo no es un PDF válido', 400);
  }
  if (file.size > MAX_PDF_AUDITORIA) {
    throw new AppError('El PDF no puede superar 10 MB', 400);
  }
  if (!file.originalname.trim() || file.originalname.length > 255) {
    throw new AppError('El nombre del archivo debe tener entre 1 y 255 caracteres', 400);
  }
}

export function guardarPdfAuditoria(id: number, tipo: TipoDocumentoAuditoria, file: Express.Multer.File): string {
  validarPdfAuditoria(file);
  const directory = path.join(root, String(id));
  fs.mkdirSync(directory, { recursive: true });
  const filename = `${tipo}-${randomUUID()}.pdf`;
  fs.writeFileSync(path.join(directory, filename), file.buffer, { flag: 'wx' });
  return `/api/documentos-auditoria/${id}/documentos/${tipo}/${filename}`;
}

export function rutaPdfAuditoria(id: number, url: string): string {
  const prefix = `/api/documentos-auditoria/${id}/documentos/`;
  const filename = url.split('/').pop();
  if (!url.startsWith(prefix) || !filename || !/^(certCotizaciones|liquidacion)-[\da-f-]+\.pdf$/.test(filename)) {
    throw new AppError('Ruta de documento inválida', 400);
  }
  return path.join(root, String(id), filename);
}

export function eliminarPdfAuditoria(id: number, url: string): void {
  fs.rmSync(rutaPdfAuditoria(id, url), { force: true });
}
