import { QueryTypes, type Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { DetReintegroModel } from '../models/DetReintegro.model';
import { DetReintegroProempleoModel } from '../models/DetReintegroProempleo.model';
import type { CrearReintegroInput, EditarReintegroInput, ListarReintegrosQuery } from '../validations/detalleReintegros.validation';
import { insertarConCorrelativo } from './correlativosPresupuesto.sql';

const tablaNueva = `dbo.[${DetReintegroProempleoModel.tableName}]`;
const columnas = `corr_detrei, mes_detrei, ano_detrei, fol_dec, fol_pro, mon_detrei, che_detrei,
  fecche_detrei, cod_region, mem_detrei, fecmem_detrei, ord_detrei, fecord_detrei, est_detrei`;
const reintegros = `
  SELECT ${columnas}, 'legacy' origen FROM dbo.[${DetReintegroModel.tableName}]
  UNION ALL SELECT ${columnas}, 'proempleo' FROM ${tablaNueva}
`;
type Fila = {
  correlativo: number; folio: number; monto: string; cheque: string; fechaCheque: string | null;
  memo: string | null; fechaMemo: string | null; ordinario: string | null; fechaOrdinario: string | null;
  region: number | null; nombreRegion: string | null; origen: 'legacy' | 'proempleo';
};

export const detalleReintegrosRepository = {
  async listar({ decreto, anio, mes, page }: ListarReintegrosQuery) {
    const limit = 20;
    const filas = await sequelize.query<Fila & { fila: number | null; total: number; totalPages: number; pagina: number }>(`
      WITH reintegros AS (${reintegros}), filtrados AS (
        SELECT corr_detrei correlativo, fol_pro folio, CONVERT(VARCHAR(40), mon_detrei) monto,
          RTRIM(che_detrei) cheque, CONVERT(CHAR(10), fecche_detrei, 23) fechaCheque,
          RTRIM(mem_detrei) memo, CONVERT(CHAR(10), fecmem_detrei, 23) fechaMemo,
          RTRIM(ord_detrei) ordinario, CONVERT(CHAR(10), fecord_detrei, 23) fechaOrdinario,
          cod_region region, origen, ROW_NUMBER() OVER (ORDER BY corr_detrei DESC, origen) fila
        FROM reintegros
        WHERE fol_dec = :decreto AND ano_detrei = :anio AND mes_detrei = :mes AND ISNULL(est_detrei, '') <> 'ELIMINADO'
      ), totales AS (
        SELECT COUNT(*) total, CASE WHEN COUNT(*) = 0 THEN 1 ELSE (COUNT(*) - 1) / :limit + 1 END totalPages
        FROM filtrados
      ), meta AS (
        SELECT *, CASE WHEN :page > totalPages THEN totalPages ELSE :page END pagina FROM totales
      )
      SELECT f.*, RTRIM(r.Nom_region) nombreRegion, m.total, m.totalPages, m.pagina
      FROM meta m LEFT JOIN filtrados f
        ON f.fila BETWEEN (m.pagina - 1) * :limit + 1 AND m.pagina * :limit
      LEFT JOIN dbo.REGIONES r ON r.cod_region = f.region ORDER BY f.fila
    `, { type: QueryTypes.SELECT, replacements: { decreto, anio, mes, page, limit } });
    const { total, totalPages, pagina } = filas[0];
    return {
      data: filas.filter((fila) => fila.fila !== null).map(({ fila, total, totalPages, pagina, ...data }) => data),
      pagination: { page: pagina, total, totalPages, limit },
    };
  },

  async crear(data: CrearReintegroInput, region: number, usuario: string, transaction: Transaction) {
    const [creado] = await sequelize.query<{ corr_detrei: number }>(insertarConCorrelativo(
      'DETREINTEGRO', 'detreintegro_proempleo', 'corr_detrei',
      `mes_detrei, ano_detrei, fol_dec, fol_pro, mon_detrei, che_detrei, fecche_detrei, usu_cre, fec_cre,
       est_detrei, cod_region, mem_detrei, fecmem_detrei, ord_detrei, fecord_detrei`,
      `:mes, :anio, :decreto, :folio, :monto, :cheque, CONVERT(DATE, :fechaCheque, 23), :usuario, GETDATE(),
       'ACTIVO', :region, :memo, CONVERT(DATE, :fechaMemo, 23), :ordinario, CONVERT(DATE, :fechaOrdinario, 23)`,
    ), { type: QueryTypes.SELECT, replacements: { ...data, region, usuario }, transaction });
    return { correlativo: creado.corr_detrei };
  },

  async cambiar(id: number, data: EditarReintegroInput | null, usuario: string) {
    const [actualizado] = await sequelize.query<{ correlativo: number }>(`
      UPDATE ${tablaNueva}
      SET usu_mod = :usuario, ${data ? `mon_detrei = :monto, che_detrei = :cheque,
        fecche_detrei = CONVERT(DATE, :fechaCheque, 23), mem_detrei = :memo,
        fecmem_detrei = CONVERT(DATE, :fechaMemo, 23), ord_detrei = :ordinario,
        fecord_detrei = CONVERT(DATE, :fechaOrdinario, 23)` : "est_detrei = 'ELIMINADO', fec_eli = GETDATE()"}
      OUTPUT INSERTED.corr_detrei correlativo
      WHERE corr_detrei = :id AND ISNULL(est_detrei, '') <> 'ELIMINADO'
    `, { type: QueryTypes.SELECT, replacements: { id, usuario, ...data } });
    return actualizado ?? null;
  },
};
