import { DocReemplazoBenProyectoModel, DocumentoStatus } from '../models/DocReemplazoBenProyecto.model';
import { beneficiarioRepository } from './sicap/beneficiario.repository';

// Adjunta el resumen del beneficiario a cada documento. Ya no se puede usar un
// include a BeneficiarioModel porque los beneficiarios nuevos viven en
// beneficiarios_proempleo; se resuelven en ambas tablas con una sola query y
// quedan en dataValues (se serializan en el JSON con la clave "beneficiario").
async function adjuntarBeneficiario(
  documentos: DocReemplazoBenProyectoModel[],
): Promise<void> {
  const ruts = [...new Set(documentos.map((doc) => doc.idBeneficiario))];
  const resumenes = await beneficiarioRepository.findResumenesPorRuts(ruts);
  for (const doc of documentos) {
    (doc.dataValues as unknown as Record<string, unknown>).beneficiario =
      resumenes.get(doc.idBeneficiario) ?? null;
  }
}

export const docReemplazoBenProyectoRepository = {
  async findAll(): Promise<DocReemplazoBenProyectoModel[]> {
    const documentos = await DocReemplazoBenProyectoModel.findAll();
    await adjuntarBeneficiario(documentos);
    return documentos;
  },

  async findById(id: number): Promise<DocReemplazoBenProyectoModel | null> {
    const doc = await DocReemplazoBenProyectoModel.findByPk(id);
    if (doc) {
      await adjuntarBeneficiario([doc]);
    }
    return doc;
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

  async actualizarEstado(id: number, status: DocumentoStatus, comentarioRechazo: string | null): Promise<DocReemplazoBenProyectoModel | null> {
    const doc = await DocReemplazoBenProyectoModel.findByPk(id);
    if (!doc) return null;
    doc.status = status;
    doc.comentarioRechazo = comentarioRechazo;
    await doc.save();
    return doc;
  },

  async reemplazarArchivo(id: number, nombreArchivo: string, archivoUrl: string): Promise<{ doc: DocReemplazoBenProyectoModel; archivoUrlAnterior: string } | null> {
    const doc = await DocReemplazoBenProyectoModel.findByPk(id);
    if (!doc) return null;
    const archivoUrlAnterior = doc.archivoUrl;
    doc.nombreArchivo = nombreArchivo;
    doc.archivoUrl = archivoUrl;
    doc.status = 'pendiente';
    doc.comentarioRechazo = null;
    await doc.save();
    return { doc, archivoUrlAnterior };
  },
};
