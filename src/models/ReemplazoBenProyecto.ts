export type ReemplazoStatus = 'pendiente' | 'aprobado' | 'rechazado';

export interface ReemplazoBenProyecto {
  id: number;
  idBeneficiarioProyecto: number; // rut_ben (beneficiario actual)
  idBeneficiarioNuevo: number; // rut_ben (beneficiario propuesto)
  idProyecto: number; // fol_pro
  rutUsuarioSolicitante: number | null; // rut_usu de quien creó la solicitud
  status: ReemplazoStatus;
  fechaSolicitudReemplazo: string;
  fechaAprobacionReemplazo: string | null;
}
