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
  region: number | null; nombreRegion: string | null; nombreEjecutor: string | null; origen: 'legacy' | 'proempleo';
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
      SELECT f.*, RTRIM(r.Nom_region) nombreRegion, RTRIM(e.nom_eje) nombreEjecutor,
        m.total, m.totalPages, m.pagina
      FROM meta m LEFT JOIN filtrados f
        ON f.fila BETWEEN (m.pagina - 1) * :limit + 1 AND m.pagina * :limit
      LEFT JOIN dbo.REGIONES r ON r.cod_region = f.region
      OUTER APPLY (
        SELECT TOP (1) proyecto.ruteje_pro, proyecto.origen FROM (
          SELECT ruteje_pro, 'legacy' origen FROM dbo.PROYECTOS WHERE fol_pro = f.folio
          UNION ALL
          SELECT ruteje_pro, 'proempleo' origen FROM dbo.proyectos_proempleo WHERE fol_pro = f.folio
        ) proyecto ORDER BY CASE WHEN proyecto.origen = f.origen THEN 0 ELSE 1 END
      ) p
      OUTER APPLY (
        SELECT TOP (1) ejecutor.nom_eje FROM (
          SELECT nom_eje, 'legacy' origen FROM dbo.EJECUTORES WHERE rut_eje = p.ruteje_pro
          UNION ALL
          SELECT nom_eje, 'proempleo' origen FROM dbo.ejecutores_proempleo WHERE rut_eje = p.ruteje_pro
        ) ejecutor ORDER BY CASE WHEN ejecutor.origen = p.origen THEN 0 ELSE 1 END, ejecutor.nom_eje
      ) e
      ORDER BY f.fila
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
      `:mes, :anio, :decreto, :folio, :monto, '1',
       CONVERT(DATE, SYSDATETIMEOFFSET() AT TIME ZONE 'Pacific SA Standard Time'), :usuario, GETDATE(),
       'ACTIVO', :region, NULL, NULL, :ordinario, NULL`,
    ), { type: QueryTypes.SELECT, replacements: { ...data, region, usuario }, transaction });
    return { correlativo: creado.corr_detrei };
  },

  async cambiar(id: number, data: EditarReintegroInput | null, usuario: string) {
    const [actualizado] = await sequelize.query<{
      correlativo: number; folio: number; decreto: string; mes: number; anio: number; region: number | null;
      montoAnterior: string; monto: string; ordinarioAnterior: string | null; ordinario: string | null;
      estadoAnterior: string | null; estado: string | null;
    }>(`
      UPDATE ${tablaNueva}
      SET usu_mod = :usuario, ${data ? 'mon_detrei = :monto, ord_detrei = :ordinario' : "est_detrei = 'ELIMINADO', fec_eli = GETDATE()"}
      OUTPUT INSERTED.corr_detrei correlativo, INSERTED.fol_pro folio, RTRIM(INSERTED.fol_dec) decreto,
        INSERTED.mes_detrei mes, INSERTED.ano_detrei anio, INSERTED.cod_region region,
        CONVERT(VARCHAR(40), DELETED.mon_detrei) montoAnterior, CONVERT(VARCHAR(40), INSERTED.mon_detrei) monto,
        RTRIM(DELETED.ord_detrei) ordinarioAnterior, RTRIM(INSERTED.ord_detrei) ordinario,
        RTRIM(DELETED.est_detrei) estadoAnterior, RTRIM(INSERTED.est_detrei) estado
      WHERE corr_detrei = :id AND ISNULL(est_detrei, '') <> 'ELIMINADO'
    `, { type: QueryTypes.SELECT, replacements: { id, usuario, ...data } });
    return actualizado ?? null;
  },
};
