import { docReemplazoBenProyectoRepository } from '../repositories/docReemplazoBenProyecto.repository';
import { reemplazoBenProyectoRepository } from '../repositories/reemplazoBenProyecto.repository';
import { beneficiarioRepository } from '../repositories/sicap/beneficiario.repository';
import { AppError } from '../utils/AppError';
import { esDocumentoReemplazoValido } from '../constants/documentosReemplazo';
import { CrearDocReemplazoInput } from '../validations/docReemplazoBenProyecto.validation';
import { DocumentoStatus } from '../models/DocReemplazoBenProyecto';

export const docReemplazoBenProyectoService = {
  async listar() {
    return docReemplazoBenProyectoRepository.findAll();
  },

  async obtenerPorId(id: number) {
    const doc = await docReemplazoBenProyectoRepository.findById(id);
    if (!doc) {
      throw new AppError('Documento no encontrado', 404);
    }
    return doc;
  },

  async listarPorReemplazo(idReemplazoBenProyecto: number) {
    return docReemplazoBenProyectoRepository.findByReemplazo(idReemplazoBenProyecto);
  },

  async crear(data: CrearDocReemplazoInput, archivo: { nombreArchivo: string; archivoUrl: string }) {
    if (!esDocumentoReemplazoValido(data.idDocumento)) {
      throw new AppError('idDocumento no corresponde a un documento válido', 400);
    }

    const [reemplazo, beneficiario] = await Promise.all([
      reemplazoBenProyectoRepository.findById(data.idReemplazoBenProyecto),
      beneficiarioRepository.findByRut(data.idBeneficiario),
    ]);

    if (!reemplazo) {
      throw new AppError('El reemplazo asociado no existe', 404);
    }
    if (!beneficiario) {
      throw new AppError('El beneficiario no existe', 404);
    }

    return docReemplazoBenProyectoRepository.create({ ...data, ...archivo });
  },

  async actualizarEstado(id: number, status: DocumentoStatus, comentarioRechazo: string | null) {
    const actualizado = await docReemplazoBenProyectoRepository.actualizarEstado(id, status, comentarioRechazo);
    if (!actualizado) {
      throw new AppError('Documento no encontrado', 404);
    }
    return actualizado;
  },

  async reemplazarArchivo(id: number, nombreArchivo: string, archivoUrl: string) {
    const documento = await docReemplazoBenProyectoRepository.findById(id);
    if (!documento) throw new AppError('Documento no encontrado', 404);
    if (documento.status !== 'rechazado') {
      throw new AppError('Solo se puede volver a subir un documento rechazado', 400);
    }
    return docReemplazoBenProyectoRepository.reemplazarArchivo(id, nombreArchivo, archivoUrl);
  },
};
