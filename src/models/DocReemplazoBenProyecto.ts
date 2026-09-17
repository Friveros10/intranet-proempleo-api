export type DocumentoStatus = 'pendiente' | 'aprobado' | 'rechazado';

export interface DocReemplazoBenProyecto {
  id: number;
  idReemplazoBenProyecto: number; // ref ReemplazoBenProyecto.id
  idDocumento: number; // ref catálogo estático DOCUMENTOS_REEMPLAZO
  idBeneficiario: number; // rut_ben
  nombreArchivo: string;
  archivoUrl: string;
  status: DocumentoStatus;
  fechaCarga: string;
}
