import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { logger } from "./logger";

const root = path.resolve(process.cwd(), "uploads", "reemplazos-individuales");

export function guardarDocumentoIndividual(id: number, archivo: Express.Multer.File): string {
  const carpeta = path.join(root, String(id));
  fs.mkdirSync(carpeta, { recursive: true });
  const nombre = `${randomUUID()}.pdf`;
  fs.writeFileSync(path.join(carpeta, nombre), archivo.buffer);
  return `/uploads/reemplazos-individuales/${id}/${nombre}`;
}

export function eliminarDocumentoIndividual(url: string): void {
  if (!/^\/uploads\/reemplazos-individuales\/\d+\/[\da-f-]+\.pdf$/.test(url)) {
    throw new Error("Ruta de documento individual inválida");
  }
  const archivo = path.join(root, ...url.split("/").slice(3));
  try {
    fs.unlinkSync(archivo);
  } catch (err) {
    logger.error({ err, archivo }, "No se pudo eliminar el documento individual");
    throw err;
  }
}
