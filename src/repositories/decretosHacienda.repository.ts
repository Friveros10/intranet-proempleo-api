import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { DecretoHacienda } from '../models/DecretosHacienda.model';
import type { DecretoHaciendaDetalleProempleo } from '../models/DecretosHaciendaDetalleProempleo.model';
import type { OrigenMarco } from '../validations/marco.validation';
import type { GuardarDecretoHaciendaInput, ListarDecretosHaciendaQuery } from '../validations/decretosHacienda.validation';

const LIMIT = 20;
const columnas = `[fol_dechac], [fec_dechac], CONVERT(VARCHAR(50), [mon_dechac]) AS [mon_dechac],
  [obs_dechac], [est_dechac], [usu_cre], [fec_cre], [usu_mod], [fec_mod], [usu_eli], [fec_eli]`;
const union = `SELECT ${columnas}, 'legacy' AS origen FROM [dbo].[DECHACIENDA]
  UNION ALL SELECT ${columnas}, 'proempleo' AS origen FROM [dbo].[dechacienda_proempleo]`;
const marcos = `SELECT [corr_mar], [ano_mar], [subtitulo_mar], [item_mar], [linea_mar], [nombre_mar], [est_mar],
  'legacy' AS origen FROM [dbo].[MARCO]
  UNION ALL SELECT [corr_mar], [ano_mar], [subtitulo_mar], [item_mar], [linea_mar], [nombre_mar], [est_mar],
  'proempleo' AS origen FROM [dbo].[marco_proempleo]`;

function fechaPartes(fecha: string) {
  const [anioFecha, mesFecha, diaFecha] = fecha.split('-').map(Number);
  return { anioFecha, mesFecha, diaFecha };
}

export type DecretoHaciendaListado = DecretoHacienda & { origen: OrigenMarco };
type FilaPaginada = DecretoHaciendaListado & { total: number; totalPages: number; pagina: number; fila: number | null };
export type ProgramaHacienda = {
  corr_mar: number; ano_mar: number; subtitulo_mar: number; item_mar: number;
  linea_mar: number; nombre_mar: string; est_mar: string | null; origen: OrigenMarco;
};
type DetalleFicha = DecretoHaciendaDetalleProempleo & {
  programa_nombre: string | null; programa_anio: number | null;
  glosa_nombre: string | null; glosa_codigo: number | null;
};

export const decretosHaciendaRepository = {
  async listar({ anio, folio, page }: ListarDecretosHaciendaQuery) {
    const filtros = [
      ...(anio === undefined ? [] : ['fec_dechac >= DATEFROMPARTS(:anio, 1, 1) AND fec_dechac < DATEFROMPARTS(:siguiente, 1, 1)']),
      ...(folio ? ['fol_dechac LIKE :folio'] : []),
    ];
    const rows = await sequelize.query<FilaPaginada>(`
      WITH unificados AS (${union}),
      filtrados AS (SELECT * FROM unificados ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}),
      numerados AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY fec_dechac DESC, fol_dechac DESC, origen ASC) AS fila FROM filtrados
      ),
      totales AS (SELECT COUNT(*) AS total FROM filtrados),
      paginas AS (SELECT total, CASE WHEN total = 0 THEN 1 ELSE (total - 1) / :limite + 1 END AS totalPages FROM totales),
      meta AS (SELECT *, CASE WHEN :pagina > totalPages THEN totalPages ELSE :pagina END AS pagina FROM paginas)
      SELECT n.*, m.total, m.totalPages, m.pagina FROM meta m
      LEFT JOIN numerados n ON n.fila BETWEEN ((m.pagina - 1) * :limite + 1) AND (m.pagina * :limite)
      ORDER BY n.fila`, {
      type: QueryTypes.SELECT,
      replacements: { anio, siguiente: anio === undefined ? undefined : anio + 1,
        folio: `%${folio?.replace(/[\\%_[\]]/g, '[$&]') ?? ''}%`, pagina: page, limite: LIMIT },
    });
    const meta = rows[0];
    const data = rows.filter((row) => row.fila !== null).map(({ total, totalPages, pagina, fila, ...decreto }) => decreto);
    return { data, pagination: { page: meta.pagina, limit: LIMIT, total: meta.total, totalPages: meta.totalPages } };
  },

  async anios() {
    const rows = await sequelize.query<{ anio: number }>(`
      SELECT YEAR(fec_dechac) AS anio FROM [dbo].[DECHACIENDA] WHERE fec_dechac IS NOT NULL
      UNION SELECT YEAR(fec_dechac) AS anio FROM [dbo].[dechacienda_proempleo] WHERE fec_dechac IS NOT NULL
      ORDER BY anio DESC`, { type: QueryTypes.SELECT });
    return rows.map((row) => row.anio);
  },

  async obtener(folio: string, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const tabla = origen === 'proempleo' ? 'dechacienda_proempleo' : 'DECHACIENDA';
    const rows = await sequelize.query<DecretoHaciendaListado>(`
      SELECT ${columnas}, :origen AS origen FROM [dbo].[${tabla}] ${transaction ? 'WITH (UPDLOCK, HOLDLOCK)' : ''}
      WHERE fol_dechac = :folio`, { type: QueryTypes.SELECT, replacements: { folio, origen }, transaction });
    return rows[0] ?? null;
  },

  async detalles(folio: string, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const nuevo = origen === 'proempleo';
    const tabla = nuevo ? 'detdechacienda_proempleo' : 'DETDECHACIENDA';
    const rows = await sequelize.query<DetalleFicha>(`
      WITH programas AS (${marcos})
      SELECT d.fol_dechac, d.corr_dethac, d.corr_mar, d.corr_detmar, d.acc_dethac,
        CONVERT(VARCHAR(50), d.mon_dethac) AS mon_dethac,
        ${nuevo ? 'd.origen_mar, d.glosa_dethac' : "'legacy' AS origen_mar, CAST(NULL AS VARCHAR(50)) AS glosa_dethac"},
        p.nombre_mar AS programa_nombre, p.ano_mar AS programa_anio,
        ${nuevo ? 'CAST(NULL AS VARCHAR(250)) AS glosa_nombre, CAST(NULL AS INT) AS glosa_codigo' : 'g.nom_detmar AS glosa_nombre, g.glo_detmar AS glosa_codigo'}
      FROM [dbo].[${tabla}] d
      LEFT JOIN programas p ON p.corr_mar = d.corr_mar AND p.origen = ${nuevo ? 'd.origen_mar' : "'legacy'"}
      ${nuevo ? '' : 'LEFT JOIN [dbo].[MARCODET] g ON g.corr_mar = d.corr_mar AND g.corr_detmar = d.corr_detmar'}
      WHERE d.fol_dechac = :folio ORDER BY d.corr_dethac`, {
      type: QueryTypes.SELECT, replacements: { folio }, transaction,
    });
    return rows.map(({ programa_nombre, programa_anio, glosa_nombre, glosa_codigo, ...detalle }) => ({
      ...detalle,
      programa: programa_anio === null ? null : {
        corr_mar: detalle.corr_mar, ano_mar: programa_anio, nombre_mar: programa_nombre, origen: detalle.origen_mar,
      },
      glosa: glosa_nombre === null ? null : {
        corr_mar: detalle.corr_mar, corr_detmar: detalle.corr_detmar, nom_detmar: glosa_nombre, glo_detmar: glosa_codigo,
      },
    }));
  },

  programas(anio: number) {
    return sequelize.query<ProgramaHacienda>(`
      WITH programas AS (${marcos})
      SELECT * FROM programas WHERE ano_mar = :anio AND est_mar = 'ACTIVO'
      ORDER BY nombre_mar, corr_mar, origen`, { type: QueryTypes.SELECT, replacements: { anio } });
  },

  async programaDisponible(id: number, origen: OrigenMarco, anio: number, transaction: Transaction) {
    const tabla = origen === 'proempleo' ? 'marco_proempleo' : 'MARCO';
    const rows = await sequelize.query<{ corr_mar: number }>(`
      SELECT corr_mar FROM [dbo].[${tabla}] WITH (HOLDLOCK)
      WHERE corr_mar = :id AND ano_mar = :anio AND est_mar = 'ACTIVO'`, {
      type: QueryTypes.SELECT, replacements: { id, anio }, transaction,
    });
    return rows.length > 0;
  },

  async crear(data: GuardarDecretoHaciendaInput, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      INSERT INTO [dbo].[dechacienda_proempleo]
        (fol_dechac, fec_dechac, mon_dechac, obs_dechac, est_dechac, usu_cre, fec_cre)
      VALUES (:fol_dechac, DATEFROMPARTS(:anioFecha, :mesFecha, :diaFecha), :mon_dechac, :obs_dechac, 'ACTIVO', :usuario, GETDATE())`,
    { replacements: { ...data, ...fechaPartes(data.fec_dechac), usuario }, transaction });
  },

  async actualizar(folio: string, data: GuardarDecretoHaciendaInput, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      UPDATE [dbo].[dechacienda_proempleo] SET fec_dechac = DATEFROMPARTS(:anioFecha, :mesFecha, :diaFecha),
        mon_dechac = :mon_dechac, obs_dechac = :obs_dechac, usu_mod = :usuario, fec_mod = GETDATE()
      WHERE fol_dechac = :folio`, { replacements: { ...data, ...fechaPartes(data.fec_dechac), folio, usuario }, transaction });
  },

  async guardarDetalle(folio: string, detalle: GuardarDecretoHaciendaInput['detalles'][number], transaction: Transaction) {
    if (detalle.corr_dethac === undefined) {
      await sequelize.query(`
        INSERT INTO [dbo].[detdechacienda_proempleo]
          (fol_dechac, corr_mar, corr_detmar, origen_mar, glosa_dethac, acc_dethac, mon_dethac)
        VALUES (:folio, :corr_mar, NULL, :origen_mar, :glosa_dethac, :acc_dethac, :mon_dethac)`,
      { replacements: { ...detalle, folio }, transaction });
    } else {
      await sequelize.query(`
        UPDATE [dbo].[detdechacienda_proempleo] SET corr_mar = :corr_mar, corr_detmar = NULL,
          origen_mar = :origen_mar, glosa_dethac = :glosa_dethac, acc_dethac = :acc_dethac, mon_dethac = :mon_dethac
        WHERE fol_dechac = :folio AND corr_dethac = :corr_dethac`,
      { replacements: { ...detalle, folio }, transaction });
    }
  },

  async eliminarDetalles(folio: string, ids: number[], transaction: Transaction) {
    if (!ids.length) return;
    await sequelize.query(`DELETE FROM [dbo].[detdechacienda_proempleo]
      WHERE fol_dechac = :folio AND corr_dethac IN (:ids)`, { replacements: { folio, ids }, transaction });
  },
};
