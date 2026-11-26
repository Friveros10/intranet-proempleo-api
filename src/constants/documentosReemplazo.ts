import { AppError } from "../utils/AppError";

/** Catálogo estático de documentos requeridos para un reemplazo de beneficiario en proyecto */
export const DOCUMENTOS_REEMPLAZO = [
  { id: 1, nombre: "Cédula vigente por ambos lados" },
  { id: 2, nombre: "Certificado de cotizaciones (últimos 24 meses)" },
  { id: 3, nombre: "Certificado OMIL" },
  { id: 4, nombre: "Registro social de hogares" },
  { id: 5, nombre: "Declaración jurada simple" },
  { id: 6, nombre: "Certificado de inscripción BNE" },
] as const;

export type DocumentoReemplazoId = (typeof DOCUMENTOS_REEMPLAZO)[number]["id"];

const nombresPDF: Record<DocumentoReemplazoId, string> = {
  1: "CI_ambosLados.pdf",
  2: "CERTAFP.pdf",
  3: "cer_omil.pdf",
  4: "RSH.pdf",
  5: "declaracion_jurada.pdf",
  6: "cer_bne.pdf",
};

export function nombreDocumentoReemplazo(id: number): string {
  if (!esDocumentoReemplazoValido(id)) throw new AppError("Tipo de documento no válido", 400);
  return nombresPDF[id];
}

export function esDocumentoReemplazoValido(
  id: number,
): id is DocumentoReemplazoId {
  return DOCUMENTOS_REEMPLAZO.some((d) => d.id === id);
}

