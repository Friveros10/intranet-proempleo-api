import { Request } from 'express';
import { Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { DocumentoAuditoriaModel } from '../models/DocumentoAuditoria.model';
import { documentoAuditoriaRepository } from '../repositories/documentoAuditoria.repository';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';
import { regionRepository } from '../repositories/sicap/region.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { AppError } from '../utils/AppError';
import { parseRut } from '../utils/rut';
import { eliminarPdfAuditoria, guardarPdfAuditoria, validarPdfAuditoria } from '../utils/archivosAuditoria';
import { DOCUMENTOS_AUDITORIA, puedeVerTodasRegionesAuditoria, TipoDocumentoAuditoria } from '../constants/documentosAuditoria';
import { CrearDocumentoAuditoriaInput, EstadoDocumentoAuditoriaInput } from '../validations/documentoAuditoria.validation';

async function regionPerfil(req: Request): Promise<number> {
  const usuario = await usuarioSicapRepository.findByRut(Number(req.user!.sub));
  if (!usuario?.reg_usu) {
    throw new AppError('El perfil no tiene una región asignada', 403);
  }
  return usuario.reg_usu;
}

async function obtenerVisible(id: number, req: Request, transaction?: Transaction) {
  const documento = await documentoAuditoriaRepository.obtener(id, transaction);
  if (!documento) throw new AppError('Ficha de auditoría no encontrada', 404);
  if (!puedeVerTodasRegionesAuditoria(req.user!.roles) && documento.idRegion !== await regionPerfil(req)) {
    throw new AppError('No tiene acceso a documentos de otra región', 403);
  }
  return documento;
}

export const documentoAuditoriaService = {
  async catalogos(req: Request) {
    const usuario = await usuarioSicapRepository.findByRut(Number(req.user!.sub));
    const region = usuario?.reg_usu ?? null;
    const global = puedeVerTodasRegionesAuditoria(req.user!.roles);
    if (!global && !region) throw new AppError('El perfil no tiene una región asignada', 403);
    const regiones = await regionRepository.findAll();
    return {
      idRegion: region,
      regiones: global ? regiones : regiones.filter((r) => r.cod_region === region),
      comunas: region ? await regionRepository.findComunasByRegion(region) : [],
    };
  },

  async listar(region: number | undefined, req: Request) {
    const efectiva = puedeVerTodasRegionesAuditoria(req.user!.roles) ? region : await regionPerfil(req);
    return documentoAuditoriaRepository.listar(efectiva);
  },

  obtenerVisible,

  async crear(data: CrearDocumentoAuditoriaInput, archivos: {
    certCotizaciones: Express.Multer.File; liquidacion: Express.Multer.File;
  }, req: Request) {
    const idRegion = await regionPerfil(req);
    const comunas = await regionRepository.findComunasByRegion(idRegion);
    if (!comunas.some((c) => c.cod_com === data.idComuna)) {
      throw new AppError('La comuna no pertenece a la región del perfil', 400);
    }
    const rut = parseRut(data.rut);
    validarPdfAuditoria(archivos.certCotizaciones);
    validarPdfAuditoria(archivos.liquidacion);
    const usuario = Number(req.user!.sub);
    const escritos: { id: number; url: string }[] = [];
    try {
      return await sequelize.transaction(async (transaction) => {
        const doc = await DocumentoAuditoriaModel.create({
          RUT: rut.cuerpo, dv: rut.dv,
          nombres: data.nombres, apellidoPaterno: data.apellidoPaterno,
          apellidoMaterno: data.apellidoMaterno, ong: data.ong,
          idRegion, idComuna: data.idComuna,
          certCotizacionesUrl: '', liquidacionUrl: '',
          certCotizacionesNombre: archivos.certCotizaciones.originalname,
          liquidacionNombre: archivos.liquidacion.originalname,
          created_usr: usuario, updated_usr: usuario,
        }, { transaction });
        const certCotizacionesUrl = guardarPdfAuditoria(doc.id, 'certCotizaciones', archivos.certCotizaciones);
        escritos.push({ id: doc.id, url: certCotizacionesUrl });
        const liquidacionUrl = guardarPdfAuditoria(doc.id, 'liquidacion', archivos.liquidacion);
        escritos.push({ id: doc.id, url: liquidacionUrl });
        await doc.update({ certCotizacionesUrl, liquidacionUrl }, { transaction });
        await auditLogRepository.registrar({
          usuarioId: usuario, accion: 'DOCUMENTO_CARGADO', modulo: 'DOCUMENTOS_AUDITORIA',
          entidad: 'documentos_auditoria', registroId: String(doc.id), region: idRegion,
          detalle: 'Ficha de auditoría creada con certificado de cotizaciones y liquidación',
          req, transaction,
        });
        return doc;
      });
    } catch (error) {
      for (const archivo of escritos) eliminarPdfAuditoria(archivo.id, archivo.url);
      throw error;
    }
  },

  async actualizarEstado(id: number, tipo: TipoDocumentoAuditoria, data: EstadoDocumentoAuditoriaInput, req: Request) {
    return sequelize.transaction(async (transaction) => {
      const doc = await obtenerVisible(id, req, transaction);
      const campos = DOCUMENTOS_AUDITORIA[tipo];
      const [actualizados] = await DocumentoAuditoriaModel.update({
        [campos.estado]: data.status,
        [campos.comentario]: data.status === 'rechazado' ? data.comentario : null,
        updated_usr: Number(req.user!.sub),
      }, {
        where: { id, [campos.estado]: 'pendiente' }, transaction,
      });
      if (!actualizados) throw new AppError('Solo se pueden revisar documentos pendientes', 409);
      await auditLogRepository.registrar({
        usuarioId: Number(req.user!.sub),
        accion: data.status === 'aprobado' ? 'DOCUMENTO_APROBADO' : 'DOCUMENTO_RECHAZADO',
        modulo: 'DOCUMENTOS_AUDITORIA', entidad: 'documentos_auditoria',
        registroId: String(id), region: doc.idRegion,
        detalle: `${campos.label} ${data.status}${data.comentario ? ': ' + data.comentario : ''}`,
        req, transaction,
      });
      return doc.reload({ transaction });
    });
  },

  async reemplazar(id: number, tipo: TipoDocumentoAuditoria, file: Express.Multer.File, req: Request) {
    validarPdfAuditoria(file);
    let nuevaUrl: string | undefined;
    let anterior = '';
    let doc: DocumentoAuditoriaModel;
    try {
      doc = await sequelize.transaction(async (transaction) => {
        const actual = await obtenerVisible(id, req, transaction);
        const campos = DOCUMENTOS_AUDITORIA[tipo];
        if (actual.getDataValue(campos.estado) !== 'rechazado') {
          throw new AppError('Solo se puede volver a subir un documento rechazado', 409);
        }
        // También para perfiles con más de un rol: Delegación solo carga en su región.
        if (actual.idRegion !== await regionPerfil(req)) {
          throw new AppError('Solo puede cargar documentos en la región de su perfil', 403);
        }
        anterior = actual.getDataValue(campos.url);
        nuevaUrl = guardarPdfAuditoria(id, tipo, file);
        const [actualizados] = await DocumentoAuditoriaModel.update({
          [campos.url]: nuevaUrl, [campos.nombre]: file.originalname,
          [campos.estado]: 'pendiente', [campos.comentario]: null,
          updated_usr: Number(req.user!.sub),
        }, { where: { id, [campos.estado]: 'rechazado', [campos.url]: anterior }, transaction });
        if (!actualizados) throw new AppError('El documento fue modificado; vuelva a cargar la ficha', 409);
        await auditLogRepository.registrar({
          usuarioId: Number(req.user!.sub), accion: 'DOCUMENTO_REEMPLAZADO',
          modulo: 'DOCUMENTOS_AUDITORIA', entidad: 'documentos_auditoria',
          registroId: String(id), region: actual.idRegion,
          detalle: `${campos.label} reemplazado`, req, transaction,
        });
        return actual.reload({ transaction });
      });
    } catch (error) {
      if (nuevaUrl) eliminarPdfAuditoria(id, nuevaUrl);
      throw error;
    }
    eliminarPdfAuditoria(id, anterior);
    return doc;
  },
};
