import { DocReemplazoBenProyectoModel } from '../models/DocReemplazoBenProyecto.model';
import { BeneficiarioModel } from '../models/sicap/Beneficiario.model';
import { DocumentoStatus } from '../models/DocReemplazoBenProyecto';

export const docReemplazoBenProyectoRepository = {
  async findAll(): Promise<DocReemplazoBenProyectoModel[]> {
    return DocReemplazoBenProyectoModel.findAll({ include: [{ model: BeneficiarioModel, as: 'beneficiario' }] });
  },

  async findById(id: number): Promise<DocReemplazoBenProyectoModel | null> {
    return DocReemplazoBenProyectoModel.findByPk(id, {
      include: [{ model: BeneficiarioModel, as: 'beneficiario' }],
    });
  },

  async findByReemplazo(idReemplazoBenProyecto: number): Promise<DocReemplazoBenProyectoModel[]> {
    return DocReemplazoBenProyectoModel.findAll({ where: { idReemplazoBenProyecto } });
  },

  async create(data: {
    idReemplazoBenProyecto: number;
    idDocumento: number;
    idBeneficiario: number;
    nombreArchivo: string;
    archivoUrl: string;
  }): Promise<DocReemplazoBenProyectoModel> {
    return DocReemplazoBenProyectoModel.create({
      ...data,
      status: 'pendiente',
      fechaCarga: new Date().toISOString(),
    });
  },

  async actualizarEstado(id: number, status: DocumentoStatus): Promise<DocReemplazoBenProyectoModel | null> {
    const doc = await DocReemplazoBenProyectoModel.findByPk(id);
    if (!doc) return null;
    doc.status = status;
    await doc.save();
    return doc;
  },
};
