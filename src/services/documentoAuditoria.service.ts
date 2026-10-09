import { Request } from "express";
import { Op, Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import { DocumentoAuditoriaModel, type DocumentoAuditoria } from "../models/DocumentoAuditoria.model";
import { documentoAuditoriaRepository } from "../repositories/documentoAuditoria.repository";
import { usuarioSicapRepository } from "../repositories/sicap/usuarioSicap.repository";
import { regionRepository } from "../repositories/sicap/region.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { AppError } from "../utils/AppError";
import { parseRut } from "../utils/rut";
import {
  eliminarPdfAuditoria,
  guardarPdfAuditoria,
  validarPdfAuditoria,
} from "../utils/archivosAuditoria";
import {
  DOCUMENTOS_AUDITORIA,
  puedeVerTodasRegionesAuditoria,
  TipoDocumentoAuditoria,
} from "../constants/documentosAuditoria";
import {
  CrearDocumentoAuditoriaInput,
  EstadoDocumentoAuditoriaInput,
} from "../validations/documentoAuditoria.validation";
import { AuditoriaBioBioModel } from "../models/AuditoriaBioBio.model";

async function regionPerfil(req: Request): Promise<number> {
  const usuario = await usuarioSicapRepository.findByRut(Number(req.user!.sub));
  if (!usuario?.reg_usu) {
    throw new AppError("El perfil no tiene una región asignada", 403);
  }
  return usuario.reg_usu;
}

async function obtenerVisible(
  id: number,
  req: Request,
  transaction?: Transaction,
) {
  const documento = await documentoAuditoriaRepository.obtener(id, transaction);
  if (!documento) throw new AppError("Ficha de auditoría no encontrada", 404);
  if (
    !puedeVerTodasRegionesAuditoria(req.user!.roles) &&
    documento.idRegion !== (await regionPerfil(req))
  ) {
    throw new AppError("No tiene acceso a documentos de otra región", 403);
  }
  return documento;
}

export const documentoAuditoriaService = {
  async actualizarEstadoUpload(
    id: number,
    tipo: TipoDocumentoAuditoria,
    body: { status: "subidos" },
    req: Request,
    transaction?: Transaction,
  ): Promise<DocumentoAuditoriaModel> {
    if (!transaction) {
      return sequelize.transaction((tx) =>
        documentoAuditoriaService.actualizarEstadoUpload(id, tipo, body, req, tx),
      );
    }
    const documento = await obtenerVisible(id, req, transaction);
    const campos = DOCUMENTOS_AUDITORIA[tipo];
    if (documento.idRegion !== (await regionPerfil(req))) {
      throw new AppError("Solo puede cargar documentos en la región de su perfil", 403);
    }
    const url = documento.getDataValue(campos.url);
    if (!url) {
      throw new AppError("Debe subir el documento antes de cambiar su estado", 409);
    }
    if (documento.getDataValue(campos.estado) !== "pendiente") {
      throw new AppError("Solo un documento pendiente puede cambiar a subidos", 409);
    }
    const [actualizados] = await DocumentoAuditoriaModel.update(
      { [campos.estado]: body.status, updated_usr: Number(req.user!.sub) },
      { where: { id, [campos.estado]: "pendiente", [campos.url]: url }, transaction },
    );
    if (!actualizados) {
      throw new AppError("El documento fue modificado; vuelva a cargar la ficha", 409);
    }
    await auditLogRepository.registrar({
      entidad: "documentos_auditoria",
      registroId: String(id),
      accion: "DOCUMENTO_CARGADO",
      usuarioId: Number(req.user!.sub),
      modulo: "DOCUMENTOS_AUDITORIA",
      region: documento.idRegion,
      detalle: `${campos.label}: ${body.status}`,
      req,
      transaction,
    });
    return documento.reload({ transaction });
  },
  async catalogos(req: Request) {
    const usuario = await usuarioSicapRepository.findByRut(
      Number(req.user!.sub),
    );
    const region = usuario?.reg_usu ?? null;
    const global = puedeVerTodasRegionesAuditoria(req.user!.roles);
    if (!global && !region)
      throw new AppError("El perfil no tiene una región asignada", 403);
    const regiones = await regionRepository.findAll();
    return {
      idRegion: region,
      regiones: global
        ? regiones
        : regiones.filter((r) => r.cod_region === region),
    };
  },

  async listar(
    region: number | undefined,
    req: Request,
    page = 1,
    ong?: string,
    rut?: string,
  ) {
    const efectiva = puedeVerTodasRegionesAuditoria(req.user!.roles)
      ? region
      : await regionPerfil(req);
    return documentoAuditoriaRepository.listar(efectiva, page, ong, rut);
  },

  obtenerVisible,

  async crear(
    data: CrearDocumentoAuditoriaInput,
    archivos: {
      certCotizaciones: Express.Multer.File;
      liquidacion: Express.Multer.File;
    },
    req: Request,
  ) {
    const idRegion = await regionPerfil(req);
    const rut = parseRut(data.rut);
    validarPdfAuditoria(archivos.certCotizaciones);
    validarPdfAuditoria(archivos.liquidacion);
    const usuario = Number(req.user!.sub);
    const escritos: { id: number; url: string }[] = [];
    try {
      return await sequelize.transaction(async (transaction) => {
        const doc = await DocumentoAuditoriaModel.create(
          {
            RUT: rut.cuerpo,
            dv: rut.dv,
            nombres: data.nombres,
            apellidoPaterno: data.apellidoPaterno,
            apellidoMaterno: data.apellidoMaterno,
            ong: data.ong,
            idRegion,
            comuna: data.comuna,
            certCotizacionesUrl: "",
            liquidacionUrl: "",
            certCotizacionesNombre: archivos.certCotizaciones.originalname,
            liquidacionNombre: archivos.liquidacion.originalname,
            created_usr: usuario,
            updated_usr: usuario,
          },
          { transaction },
        );
        const certCotizacionesUrl = guardarPdfAuditoria(
          doc.id,
          "certCotizaciones",
          archivos.certCotizaciones,
        );
        escritos.push({ id: doc.id, url: certCotizacionesUrl });
        const liquidacionUrl = guardarPdfAuditoria(
          doc.id,
          "liquidacion",
          archivos.liquidacion,
        );
        escritos.push({ id: doc.id, url: liquidacionUrl });
        await doc.update(
          { certCotizacionesUrl, liquidacionUrl },
          { transaction },
        );
        await auditLogRepository.registrar({
          usuarioId: usuario,
          accion: "DOCUMENTO_CARGADO",
          modulo: "DOCUMENTOS_AUDITORIA",
          entidad: "documentos_auditoria",
          registroId: String(doc.id),
          region: idRegion,
          detalle:
            "Ficha de auditoría creada con certificado de cotizaciones y liquidación",
          req,
          transaction,
        });
        return doc;
      });
    } catch (error) {
      for (const archivo of escritos)
        eliminarPdfAuditoria(archivo.id, archivo.url);
      throw error;
    }
  },

  async actualizarEstado(
    id: number,
    tipo: TipoDocumentoAuditoria,
    data: EstadoDocumentoAuditoriaInput,
    req: Request,
  ) {
    return sequelize.transaction(async (transaction) => {
      const doc = await obtenerVisible(id, req, transaction);
      const campos = DOCUMENTOS_AUDITORIA[tipo];
      const url = doc.getDataValue(campos.url);
      if (!url) {
        throw new AppError("Debe subir el documento antes de revisarlo", 409);
      }
      const [actualizados] = await DocumentoAuditoriaModel.update(
        {
          [campos.estado]: data.status,
          [campos.comentario]:
            data.status === "rechazado" ? data.comentario : null,
          updated_usr: Number(req.user!.sub),
        },
        {
          where: {
            id,
            [campos.estado]: { [Op.in]: ["pendiente", "subidos"] },
            [campos.url]: url,
          },
          transaction,
        },
      );
      if (!actualizados)
        throw new AppError("Solo se pueden revisar documentos pendientes", 409);
      await auditLogRepository.registrar({
        usuarioId: Number(req.user!.sub),
        accion:
          data.status === "aprobado"
            ? "DOCUMENTO_APROBADO"
            : "DOCUMENTO_RECHAZADO",
        modulo: "DOCUMENTOS_AUDITORIA",
        entidad: "documentos_auditoria",
        registroId: String(id),
        region: doc.idRegion,
        detalle: `${campos.label} ${data.status}${data.comentario ? ": " + data.comentario : ""}`,
        req,
        transaction,
      });
      return doc.reload({ transaction });
    });
  },

  async guardarDocumentos(
    id: number,
    archivos: Partial<Record<TipoDocumentoAuditoria, Express.Multer.File>>,
    req: Request,
  ) {
    const tipos = Object.keys(DOCUMENTOS_AUDITORIA) as TipoDocumentoAuditoria[];
    const nuevos: string[] = [];
    const anteriores: string[] = [];
    let doc: DocumentoAuditoriaModel;
    try {
      doc = await sequelize.transaction(async (transaction) => {
        const actual = await obtenerVisible(id, req, transaction);
        if (actual.idRegion !== (await regionPerfil(req))) {
          throw new AppError("Solo puede cargar documentos en la región de su perfil", 403);
        }
        const requeridos = tipos.filter((tipo) => {
          const campos = DOCUMENTOS_AUDITORIA[tipo];
          const estado = actual.getDataValue(campos.estado);
          return estado === "rechazado" ||
            (estado === "subidos" && !!actual.getDataValue(campos.url)) ||
            (estado === "pendiente" && !actual.getDataValue(campos.url));
        });
        if (!requeridos.length) {
          throw new AppError("No hay documentos disponibles para cargar o reemplazar", 409);
        }
        for (const tipo of tipos) {
          if (archivos[tipo] && !requeridos.includes(tipo)) {
            throw new AppError("Solo puede cargar documentos faltantes, rechazados o subidos con archivo", 409);
          }
        }
        for (const tipo of requeridos) {
          const file = archivos[tipo];
          if (!file) {
            throw new AppError(`Debe adjuntar: ${DOCUMENTOS_AUDITORIA[tipo].label}`, 400);
          }
          validarPdfAuditoria(file);
        }
        const values: Partial<DocumentoAuditoria> = {
          updated_usr: Number(req.user!.sub),
        };
        const where: Partial<DocumentoAuditoria> = { id };
        // Compara ambos documentos para detectar revisiones o cargas concurrentes.
        for (const tipo of tipos) {
          const campos = DOCUMENTOS_AUDITORIA[tipo];
          where[campos.estado] = actual.getDataValue(campos.estado);
          where[campos.url] = actual.getDataValue(campos.url);
        }
        for (const tipo of requeridos) {
          const campos = DOCUMENTOS_AUDITORIA[tipo];
          const file = archivos[tipo]!;
          const anterior = actual.getDataValue(campos.url);
          if (anterior) anteriores.push(anterior);
          const url = guardarPdfAuditoria(id, tipo, file);
          nuevos.push(url);
          values[campos.url] = url;
          values[campos.nombre] = file.originalname;
          values[campos.estado] = "pendiente";
          values[campos.comentario] = null;
        }
        const [actualizados] = await DocumentoAuditoriaModel.update(values, { where, transaction });
        if (!actualizados) {
          throw new AppError("La ficha fue modificada; vuelva a cargarla", 409);
        }
        await auditLogRepository.registrar({
          usuarioId: Number(req.user!.sub),
          accion: "DOCUMENTO_CARGADO",
          modulo: "DOCUMENTOS_AUDITORIA",
          entidad: "documentos_auditoria",
          registroId: String(id),
          region: actual.idRegion,
          detalle: `Documentos guardados: ${requeridos.map((tipo) => DOCUMENTOS_AUDITORIA[tipo].label).join(", ")}`,
          req,
          transaction,
        });
        return actual.reload({ transaction });
      });
    } catch (error) {
      for (const url of nuevos) eliminarPdfAuditoria(id, url);
      throw error;
    }
    for (const url of anteriores) eliminarPdfAuditoria(id, url);
    return doc;
  },

  async reemplazar(
    id: number,
    tipo: TipoDocumentoAuditoria,
    file: Express.Multer.File,
    req: Request,
  ) {
    validarPdfAuditoria(file);
    let nuevaUrl: string | undefined;
    let anterior = "";
    let doc: DocumentoAuditoriaModel;
    try {
      doc = await sequelize.transaction(async (transaction) => {
        const actual = await obtenerVisible(id, req, transaction);
        const campos = DOCUMENTOS_AUDITORIA[tipo];
        const estadoAnterior = actual.getDataValue(campos.estado);
        anterior = actual.getDataValue(campos.url);
        if (
          estadoAnterior !== "rechazado" &&
          !(estadoAnterior === "pendiente" && !anterior)
        ) {
          throw new AppError(
            "Solo se puede subir un documento pendiente sin archivo o volver a subir uno rechazado",
            409,
          );
        }
        // También para perfiles con más de un rol: Delegación solo carga en su región.
        if (actual.idRegion !== (await regionPerfil(req))) {
          throw new AppError(
            "Solo puede cargar documentos en la región de su perfil",
            403,
          );
        }
        nuevaUrl = guardarPdfAuditoria(id, tipo, file);
        const [actualizados] = await DocumentoAuditoriaModel.update(
          {
            [campos.url]: nuevaUrl,
            [campos.nombre]: file.originalname,
            [campos.estado]: "pendiente",
            [campos.comentario]: null,
            updated_usr: Number(req.user!.sub),
          },
          {
            where: {
              id,
              [campos.estado]: estadoAnterior,
              [campos.url]: anterior,
            },
            transaction,
          },
        );
        if (!actualizados)
          throw new AppError(
            "El documento fue modificado; vuelva a cargar la ficha",
            409,
          );
        await auditLogRepository.registrar({
          usuarioId: Number(req.user!.sub),
          accion: anterior ? "DOCUMENTO_REEMPLAZADO" : "DOCUMENTO_CARGADO",
          modulo: "DOCUMENTOS_AUDITORIA",
          entidad: "documentos_auditoria",
          registroId: String(id),
          region: actual.idRegion,
          detalle: `${campos.label} ${anterior ? "reemplazado" : "cargado"}`,
          req,
          transaction,
        });
        return actual.reload({ transaction });
      });
    } catch (error) {
      if (nuevaUrl) eliminarPdfAuditoria(id, nuevaUrl);
      throw error;
    }
    if (anterior) eliminarPdfAuditoria(id, anterior);
    return doc;
  },

  async auditoriaBioBioByRut(rut: string, req: Request) {
    if (!req.user) {
      throw new AppError("Usuario no autenticado", 401);
    }
    if (!rut) {
      throw new AppError("Debe proporcionar un RUT válido", 400);
    }
    const [beneficiarioAuditoria] = await AuditoriaBioBioModel.findAll({
      where: { RUT: rut.toString() },
    });
    return { beneficiarioAuditoria };
  },
};
