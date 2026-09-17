import { ReemplazoBenProyectoModel } from '../models/ReemplazoBenProyecto.model';
import { DocReemplazoBenProyectoModel } from '../models/DocReemplazoBenProyecto.model';
import { BeneficiarioModel } from '../models/sicap/Beneficiario.model';
import { ProyectoModel } from '../models/sicap/Proyecto.model';
import { UsuarioSicapModel } from '../models/sicap/UsuarioSicap.model';
import { ReemplazoStatus } from '../models/ReemplazoBenProyecto';

export const reemplazoBenProyectoRepository = {
  async findAll(): Promise<ReemplazoBenProyectoModel[]> {
    return ReemplazoBenProyectoModel.findAll({
      include: [
        { model: BeneficiarioModel, as: 'beneficiarioActual' },
        { model: BeneficiarioModel, as: 'beneficiarioNuevo' },
        { model: ProyectoModel, as: 'proyecto' },
        { model: UsuarioSicapModel, as: 'usuarioSolicitante' },
      ],
      order: [['id', 'DESC']]
    });
  },

  async findById(id: number): Promise<ReemplazoBenProyectoModel | null> {
    return ReemplazoBenProyectoModel.findByPk(id, {
      include: [
        { model: BeneficiarioModel, as: 'beneficiarioActual' },
        { model: BeneficiarioModel, as: 'beneficiarioNuevo' },
        { model: ProyectoModel, as: 'proyecto' },
        { model: UsuarioSicapModel, as: 'usuarioSolicitante' },
        { model: DocReemplazoBenProyectoModel, as: 'documentos' },
      ],
    });
  },

  async create(data: {
    idBeneficiarioProyecto: number;
    idBeneficiarioNuevo: number;
    idProyecto: number;
    rutUsuarioSolicitante: number;
  }): Promise<ReemplazoBenProyectoModel> {
    return ReemplazoBenProyectoModel.create({
      ...data,
      status: 'pendiente',
      fechaSolicitudReemplazo: new Date().toISOString(),
      fechaAprobacionReemplazo: null,
    });
  },

  async actualizarEstado(
    id: number,
    status: ReemplazoStatus
  ): Promise<ReemplazoBenProyectoModel | null> {
    const reemplazo = await ReemplazoBenProyectoModel.findByPk(id);
    if (!reemplazo) return null;
    reemplazo.status = status;
    reemplazo.fechaAprobacionReemplazo = new Date().toISOString();
    await reemplazo.save();
    return reemplazo;
  },

  async eliminar(id: number): Promise<boolean> {
    const filasEliminadas = await ReemplazoBenProyectoModel.destroy({ where: { id } });
    return filasEliminadas > 0;
  },
};
