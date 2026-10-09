import { QueryTypes, Transaction } from 'sequelize';
import { DocumentoAuditoria, DocumentoAuditoriaModel } from '../models/DocumentoAuditoria.model';
import { sequelize } from '../database/sequelize';

export const documentoAuditoriaRepository = {
  async listar(region?: number, page = 1, ong?: string, rut?: string) {
    const limit = 50;
    const offset = (page - 1) * limit;
    const filtroRegional = `a.deleted_at IS NULL ${region === undefined ? '' : 'AND a.idRegion = :region'}`;
    const [cuerpo, dv] = rut?.split('-') ?? [];
    const rutNumero = cuerpo === undefined ? undefined : Number(cuerpo);
    const filtro = `${filtroRegional}
      ${ong === undefined ? '' : 'AND LTRIM(RTRIM(a.ong)) = :ong'}
      ${rut === undefined ? '' : 'AND a.RUT = :rutNumero'}
      ${dv === undefined ? '' : 'AND a.dv = :dv'}`;
    const replacements = { region, ong, rutNumero, dv };
    const [data, [conteo], ejecutores] = await Promise.all([
      sequelize.query<DocumentoAuditoria & { nombreRegion: string }>(
        `SELECT a.*, r.Nom_region AS nombreRegion
         FROM dbo.documentos_auditoria a
         LEFT JOIN dbo.REGIONES r ON r.cod_region = a.idRegion
        WHERE ${filtro}
        ORDER BY a.created_at DESC, a.id DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`, {
        type: QueryTypes.SELECT,
        replacements: { ...replacements, offset, limit },
      }),
      sequelize.query<{ total: number }>(
        `SELECT COUNT(*) AS total FROM dbo.documentos_auditoria a WHERE ${filtro}`,
        { type: QueryTypes.SELECT, replacements },
      ),
      sequelize.query<{ ong: string }>(
        `SELECT DISTINCT LTRIM(RTRIM(a.ong)) AS ong
           FROM dbo.documentos_auditoria a
          WHERE ${filtroRegional} AND LTRIM(RTRIM(a.ong)) <> N''
          ORDER BY ong`,
        { type: QueryTypes.SELECT, replacements: { region } },
      ),
    ]);
    if (!conteo) throw new Error('No se pudo obtener el total de fichas de auditoria.');
    return {
      data,
      ejecutores: ejecutores.map((ejecutor) => ejecutor.ong),
      pagination: {
        page, limit, total: conteo.total,
        totalPages: Math.max(1, Math.ceil(conteo.total / limit)),
      },
    };
  },
  obtener(id: number, transaction?: Transaction) {
    return DocumentoAuditoriaModel.findByPk(id, { transaction });
  },
};
