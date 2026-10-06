import { QueryTypes, Transaction } from 'sequelize';
import { DocumentoAuditoria, DocumentoAuditoriaModel } from '../models/DocumentoAuditoria.model';
import { sequelize } from '../database/sequelize';

export const documentoAuditoriaRepository = {
  listar(region?: number) {
    return sequelize.query<DocumentoAuditoria & { nombreRegion: string; nombreComuna: string }>(
      `SELECT a.*, r.Nom_region AS nombreRegion, c.nom_com AS nombreComuna
         FROM dbo.documentos_auditoria a
         LEFT JOIN dbo.REGIONES r ON r.cod_region = a.idRegion
         LEFT JOIN dbo.COMUNAS c ON c.cod_com = a.idComuna
        WHERE a.deleted_at IS NULL ${region === undefined ? '' : 'AND a.idRegion = :region'}
        ORDER BY a.created_at DESC, a.id DESC`, {
      type: QueryTypes.SELECT,
      replacements: { region },
    });
  },
  obtener(id: number, transaction?: Transaction) {
    return DocumentoAuditoriaModel.findByPk(id, { transaction });
  },
};
