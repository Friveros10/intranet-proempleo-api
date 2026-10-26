import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { MarcoProempleo } from '../models/MarcoProempleo.model';
import type { MarcoDetalleProempleo } from '../models/MarcoDetalleProempleo.model';
import type { GuardarMarcoInput, ListarMarcosQuery, OrigenMarco } from '../validations/marco.validation';

const LIMIT = 20;
const columnas = `[corr_mar], [ano_mar], [subtitulo_mar], [item_mar], [linea_mar],
  [nombre_mar], CONVERT(VARCHAR(50), [monto_mar]) AS [monto_mar],
  [usu_cre], [fec_cre], [usu_mod], [fec_mod], [usu_eli], [fec_eli], [est_mar], [ema_mar], [tip_mar]`;
const union = `SELECT ${columnas}, 'legacy' AS [origen] FROM [dbo].[MARCO]
  UNION ALL SELECT ${columnas}, 'proempleo' AS [origen] FROM [dbo].[marco_proempleo]`;

export type MarcoListado = MarcoProempleo & { origen: OrigenMarco };
type FilaPaginada = MarcoListado & { total: number; pagina: number; totalPages: number; fila: number | null };

export const marcoRepository = {
  async listar({ anio, buscar, page }: ListarMarcosQuery) {
    const id = buscar && /^\d+$/.test(buscar) && Number(buscar) <= 2147483647 ? Number(buscar) : null;
    const filtros = [
      "[est_mar] = 'ACTIVO'",
      ...(anio === undefined ? [] : ['[ano_mar] = :anio']),
      ...(buscar ? ['([nombre_mar] LIKE :buscar OR [corr_mar] = :id)'] : []),
    ];
    const rows = await sequelize.query<FilaPaginada>(`
      WITH unificados AS (${union}),
      filtrados AS (SELECT * FROM unificados WHERE ${filtros.join(' AND ')}),
      numerados AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY [ano_mar] DESC, [corr_mar] DESC, [origen] ASC) AS fila FROM filtrados
      ),
      totales AS (SELECT COUNT(*) AS total FROM filtrados),
      paginas AS (SELECT total, CASE WHEN total = 0 THEN 1 ELSE (total - 1) / :limite + 1 END AS totalPages FROM totales),
      meta AS (SELECT *, CASE WHEN :pagina > totalPages THEN totalPages ELSE :pagina END AS pagina FROM paginas)
      SELECT n.*, m.total, m.totalPages, m.pagina FROM meta m
      LEFT JOIN numerados n ON n.fila BETWEEN ((m.pagina - 1) * :limite + 1) AND (m.pagina * :limite)
      ORDER BY n.fila`, {
      type: QueryTypes.SELECT,
      replacements: { anio, buscar: `%${buscar?.replace(/[\\%_[\]]/g, '[$&]') ?? ''}%`, id, pagina: page, limite: LIMIT },
    });
    const meta = rows[0];
    const data = rows.filter((row) => row.fila !== null).map(({ total, totalPages, pagina, fila, ...marco }) => marco);
    return { data, pagination: { page: meta.pagina, limit: LIMIT, total: meta.total, totalPages: meta.totalPages } };
  },

  async anios() {
    const rows = await sequelize.query<{ ano_mar: number }>(`
      SELECT [ano_mar] FROM [dbo].[MARCO] WHERE [ano_mar] IS NOT NULL
      UNION SELECT [ano_mar] FROM [dbo].[marco_proempleo] WHERE [ano_mar] IS NOT NULL
      ORDER BY [ano_mar] DESC`, { type: QueryTypes.SELECT });
    return rows.map((row) => row.ano_mar);
  },

  async obtener(id: number, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const tabla = origen === 'proempleo' ? 'marco_proempleo' : 'MARCO';
    const rows = await sequelize.query<MarcoListado>(`
      SELECT ${columnas}, :origen AS origen FROM [dbo].[${tabla}] ${transaction ? 'WITH (UPDLOCK, HOLDLOCK)' : ''}
      WHERE [corr_mar] = :id`, { type: QueryTypes.SELECT, replacements: { id, origen }, transaction });
    return rows[0] ?? null;
  },

  detalles(corr_mar: number, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const tabla = origen === 'proempleo' ? 'marcodet_proempleo' : 'MARCODET';
    return sequelize.query<MarcoDetalleProempleo>(`
      SELECT [corr_detmar], [corr_mar], [glo_detmar], [ano_mar], [subtitulo_mar], [item_mar], [linea_mar],
        [nom_detmar], [acc_detmar], CONVERT(VARCHAR(50), [mon_detmar]) AS [mon_detmar],
        [usu_cre], [fec_cre], [usu_mod], [fec_mod], [usu_eli], [fec_eli]
      FROM [dbo].[${tabla}] WHERE [corr_mar] = :corr_mar ORDER BY [glo_detmar], [corr_detmar]`,
    { type: QueryTypes.SELECT, replacements: { corr_mar }, transaction });
  },

  async crear(data: GuardarMarcoInput, usuario: string, transaction: Transaction) {
    const rows = await sequelize.query<{ corr_mar: number }>(`
      INSERT INTO [dbo].[marco_proempleo]
        ([ano_mar], [subtitulo_mar], [item_mar], [linea_mar], [nombre_mar], [monto_mar], [est_mar], [ema_mar], [tip_mar], [usu_cre], [fec_cre])
      OUTPUT INSERTED.[corr_mar]
      VALUES (:ano_mar, :subtitulo_mar, :item_mar, :linea_mar, :nombre_mar, :monto_mar, :est_mar, :ema_mar, :tip_mar, :usuario, GETDATE())`,
    { type: QueryTypes.SELECT, replacements: { ...data, usuario }, transaction });
    return rows[0].corr_mar;
  },

  async actualizar(id: number, data: GuardarMarcoInput, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      UPDATE [dbo].[marco_proempleo] SET [ano_mar] = :ano_mar, [subtitulo_mar] = :subtitulo_mar,
        [item_mar] = :item_mar, [linea_mar] = :linea_mar, [nombre_mar] = :nombre_mar, [monto_mar] = :monto_mar,
        [est_mar] = :est_mar, [ema_mar] = :ema_mar, [tip_mar] = :tip_mar, [usu_mod] = :usuario, [fec_mod] = GETDATE()
      WHERE [corr_mar] = :id`, { replacements: { ...data, id, usuario }, transaction });
  },

  async guardarDetalle(corr_mar: number, data: GuardarMarcoInput, detalle: GuardarMarcoInput['detalles'][number], usuario: string, transaction: Transaction) {
    const replacements = { ...data, ...detalle, corr_mar, usuario };
    if (detalle.corr_detmar !== undefined) {
      await sequelize.query(`
        UPDATE [dbo].[marcodet_proempleo] SET [ano_mar] = :ano_mar, [subtitulo_mar] = :subtitulo_mar,
          [item_mar] = :item_mar, [linea_mar] = :linea_mar, [glo_detmar] = :glo_detmar,
          [nom_detmar] = :nom_detmar, [acc_detmar] = :acc_detmar, [mon_detmar] = :mon_detmar,
          [usu_mod] = :usuario, [fec_mod] = GETDATE()
        WHERE [corr_mar] = :corr_mar AND [corr_detmar] = :corr_detmar`, { replacements, transaction });
    } else {
      await sequelize.query(`
        INSERT INTO [dbo].[marcodet_proempleo]
          ([corr_mar], [ano_mar], [subtitulo_mar], [item_mar], [linea_mar], [glo_detmar], [nom_detmar],
           [acc_detmar], [mon_detmar], [usu_cre], [fec_cre])
        VALUES (:corr_mar, :ano_mar, :subtitulo_mar, :item_mar, :linea_mar, :glo_detmar, :nom_detmar,
          :acc_detmar, :mon_detmar, :usuario, GETDATE())`, { replacements, transaction });
    }
  },

  async eliminarDetalles(corr_mar: number, ids: number[], transaction: Transaction) {
    if (ids.length === 0) return;
    await sequelize.query(`
      DELETE FROM [dbo].[marcodet_proempleo] WHERE [corr_mar] = :corr_mar AND [corr_detmar] IN (:ids)`,
    { replacements: { corr_mar, ids }, transaction });
  },
};
