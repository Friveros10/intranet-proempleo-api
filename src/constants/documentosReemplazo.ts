/** Catálogo estático de documentos requeridos para un reemplazo de beneficiario en proyecto */
export const DOCUMENTOS_REEMPLAZO = [
  { id: 1, nombre: 'Cédula vigente por ambos lados' },
  { id: 2, nombre: 'Certificado de cotizaciones o afiliación AFP' },
  { id: 3, nombre: 'Certificado OMIL' },
  { id: 4, nombre: 'Registro social de hogares' },
  { id: 5, nombre: 'Declaración jurada simple' },
] as const;

export type DocumentoReemplazoId = (typeof DOCUMENTOS_REEMPLAZO)[number]['id'];

export function esDocumentoReemplazoValido(id: number): id is DocumentoReemplazoId {
  return DOCUMENTOS_REEMPLAZO.some((d) => d.id === id);
}
