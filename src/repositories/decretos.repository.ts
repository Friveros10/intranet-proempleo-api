import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Decreto } from '../models/Decretos.model';
import type { DecretoDetalle } from '../models/DecretosDetalle.model';
import { IntermediarioModel } from '../models/Intermediario.model';
import type { GuardarDecretoInput, ListarDecretosQuery } from '../validations/decretos.validation';
import type { OrigenMarco } from '../validations/marco.validation';

const LIMIT = 20;
const columnas = `RTRIM(fol_dec) AS fol_dec, RTRIM(folprov_dec) AS folprov_dec, ano_dec, fec_dec, obs_dec,
  CONVERT(VARCHAR(50), mon_dec) AS mon_dec, cob_dec, usu_cre, fec_cre, usu_mod, fec_mod,
  usu_eli, fec_eli, est_dec, rutint_dec, programaInt`;
const union = `SELECT ${columnas}, 'legacy' AS origen FROM dbo.DECRETOS
  UNION ALL SELECT ${columnas}, 'proempleo' AS origen FROM dbo.decretos_proempleo`;
const marcos = `SELECT corr_mar, ano_mar, subtitulo_mar, item_mar, linea_mar, nombre_mar, est_mar FROM dbo.MARCO
  UNION ALL SELECT corr_mar, ano_mar, subtitulo_mar, item_mar, linea_mar, nombre_mar, est_mar FROM dbo.marco_proempleo`;
const glosas = `SELECT corr_detmar, corr_mar, glo_detmar, nom_detmar FROM dbo.MARCODET
  UNION ALL SELECT corr_detmar, corr_mar, glo_detmar, nom_detmar FROM dbo.marcodet_proempleo`;
export type ProgramaDecreto = {
  corr_mar: number; ano_mar: number; subtitulo_mar: number; item_mar: number; linea_mar: number;
  nombre_mar: string; est_mar: string | null;
};
export type GlosaDecreto = { corr_detmar: number; corr_mar: number; glo_detmar: number; nom_detmar: string };
export type DecretoListado = Omit<Decreto, 'rutint_dec'> & { rutint_dec: number | null; origen: OrigenMarco };
type Fila = DecretoListado & { total: number; totalPages: number; pagina: number; fila: number | null };
type DetalleFila = DecretoDetalle & {
  programa_nombre: string | null; programa_anio: number | null;
  glosa_nombre: string | null; glosa_codigo: number | null;
};

function reemplazos(data: GuardarDecretoInput) {
  const [anioFecha, mesFecha, diaFecha] = data.fec_dec.split('-').map(Number);
  return { ...data, anioFecha, mesFecha, diaFecha };
}

export const decretosRepository = {
  async desvincularProyecto(folio: string, proyecto: number, usuario: string, transaction: Transaction) {
    const rows = await sequelize.query<{ id: number }>(`
      UPDATE dbo.decpro_proempleo SET est_decpro = 'ELIMINADO', usu_eli = :usuario, fec_eli = GETDATE()
      OUTPUT INSERTED.id
      WHERE fol_dec = :folio AND fol_pro = :proyecto AND (est_decpro IS NULL OR est_decpro <> 'ELIMINADO')`, {
      type: QueryTypes.SELECT, replacements: { folio, proyecto, usuario }, transaction,
    });
    return rows.length > 0;
  },
  async regionIntermediario(rut: number, origen: OrigenMarco) {
    const rows = await sequelize.query<{ region: number }>(`
      SELECT TOP 1 reg_int region FROM (
        SELECT rut_int, reg_int, 'legacy' origen FROM dbo.INTERMEDIARIOS
        UNION ALL SELECT rut_int, reg_int, 'proempleo' origen FROM dbo.intermediarios_proempleo
      ) i WHERE rut_int = :rut ORDER BY CASE WHEN origen = :origen THEN 0 ELSE 1 END`, {
      type: QueryTypes.SELECT, replacements: { rut, origen },
    });
    return rows[0]?.region;
  },

  async proyectosAsociados(folio: string, region: number, disponibles: boolean, page: number, buscar: string) {
    const base = `WITH proyectos AS (
      SELECT fol_pro, nom_pro, ano_pro, reg_pro, com_pro, est_pro, 'legacy' origen FROM dbo.PROYECTOS
      UNION ALL SELECT fol_pro, nom_pro, ano_pro, reg_pro, com_pro, est_pro, 'proempleo' origen FROM dbo.proyectos_proempleo
    ), asociaciones AS (
      SELECT fol_dec, fol_pro, est_decpro FROM dbo.DECPRO
      UNION ALL SELECT fol_dec, fol_pro, est_decpro FROM dbo.decpro_proempleo
    ), filtrados AS (
      SELECT p.* FROM proyectos p WHERE p.reg_pro = :region AND (p.est_pro IS NULL OR p.est_pro <> 'ELIMINADO')
        AND (:buscar = '' OR CAST(p.fol_pro AS VARCHAR(20)) LIKE :patron OR p.nom_pro LIKE :patron)
        AND ${disponibles ? 'NOT' : ''} EXISTS (SELECT 1 FROM asociaciones a WHERE a.fol_dec = :folio AND a.fol_pro = p.fol_pro
          AND (a.est_decpro IS NULL OR a.est_decpro <> 'ELIMINADO'))
    )`;
    const replacements = { folio, region, buscar, patron: `%${buscar}%` };
    const counts = await sequelize.query<{ total: number }>(`${base} SELECT COUNT(*) total FROM filtrados`, { type: QueryTypes.SELECT, replacements });
    const total = counts[0].total;
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    const pagina = Math.min(page, totalPages);
    const data = await sequelize.query<{ fol_pro: number; nom_pro: string; ano_pro: number | null; origen: OrigenMarco; nombreComuna: string | null }>(`${base}
      SELECT p.fol_pro, RTRIM(p.nom_pro) nom_pro, p.ano_pro, p.origen, c.nom_com nombreComuna,
        CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.decpro_proempleo a WHERE a.fol_dec = :folio AND a.fol_pro = p.fol_pro
          AND (a.est_decpro IS NULL OR a.est_decpro <> 'ELIMINADO')) THEN 1 ELSE 0 END AS BIT) puedeDesvincular
      FROM filtrados p LEFT JOIN dbo.COMUNAS c ON c.cod_com = p.com_pro
      ORDER BY p.fol_pro DESC, p.origen OFFSET :offset ROWS FETCH NEXT :limite ROWS ONLY`, {
      type: QueryTypes.SELECT, replacements: { ...replacements, offset: (pagina - 1) * LIMIT, limite: LIMIT },
    });
    return { data, pagination: { page: pagina, limit: LIMIT, total, totalPages } };
  },
  intermediarios() {
    return IntermediarioModel.findAll({
      attributes: ['rut_int', 'dig_int', 'nom_int', 'reg_int'],
      order: [['nom_int', 'ASC'], ['rut_int', 'ASC']],
    });
  },

  async listar({ anio, folio, page }: ListarDecretosQuery) {
    const filtros = [
      ...(anio === undefined ? [] : ['ano_dec = :anio']),
      ...(folio ? ['fol_dec LIKE :folio'] : []),
    ];
    const rows = await sequelize.query<Fila>(`
      WITH unificados AS (${union}),
      filtrados AS (SELECT * FROM unificados ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}),
      numerados AS (SELECT *, ROW_NUMBER() OVER (ORDER BY ano_dec DESC, fec_dec DESC, fol_dec DESC, origen ASC) fila FROM filtrados),
      totales AS (SELECT COUNT(*) total FROM filtrados),
      paginas AS (SELECT total, CASE WHEN total = 0 THEN 1 ELSE (total - 1) / :limite + 1 END totalPages FROM totales),
      meta AS (SELECT *, CASE WHEN :pagina > totalPages THEN totalPages ELSE :pagina END pagina FROM paginas)
      SELECT n.*, m.total, m.totalPages, m.pagina FROM meta m LEFT JOIN numerados n
        ON n.fila BETWEEN ((m.pagina - 1) * :limite + 1) AND (m.pagina * :limite) ORDER BY n.fila`, {
      type: QueryTypes.SELECT,
      replacements: { anio, folio: `%${folio?.replace(/[\\%_[\]]/g, '[$&]') ?? ''}%`, pagina: page, limite: LIMIT },
    });
    const meta = rows[0];
    const data = rows.filter((row) => row.fila !== null).map(({ total, totalPages, pagina, fila, ...decreto }) => decreto);
    return { data, pagination: { page: meta.pagina, limit: LIMIT, total: meta.total, totalPages: meta.totalPages } };
  },

  async anios() {
    const rows = await sequelize.query<{ ano_dec: number }>(`
      SELECT ano_dec FROM dbo.DECRETOS WHERE ano_dec IS NOT NULL
      UNION SELECT ano_dec FROM dbo.decretos_proempleo WHERE ano_dec IS NOT NULL ORDER BY ano_dec DESC`,
    { type: QueryTypes.SELECT });
    return rows.map((row) => row.ano_dec);
  },

  async obtener(folio: string, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const tabla = origen === 'proempleo' ? 'decretos_proempleo' : 'DECRETOS';
    const rows = await sequelize.query<DecretoListado>(`
      SELECT ${columnas}, :origen AS origen FROM dbo.[${tabla}] ${transaction ? 'WITH (UPDLOCK, HOLDLOCK)' : ''}
      WHERE fol_dec = :folio`, { type: QueryTypes.SELECT, replacements: { folio, origen }, transaction });
    return rows[0] ?? null;
  },

  async detalles(folio: string, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const tabla = origen === 'proempleo' ? 'decretosDetalle_proempleo' : 'DECDET';
    const rows = await sequelize.query<DetalleFila>(`
      WITH programas AS (${marcos}), glosas AS (${glosas})
      SELECT RTRIM(d.fol_dec) fol_dec, d.corr_mar, d.corr_detmar, CONVERT(VARCHAR(50), d.mon_decdet) mon_decdet, d.sublinea,
        p.nombre_mar programa_nombre, p.ano_mar programa_anio, g.nom_detmar glosa_nombre, g.glo_detmar glosa_codigo
      FROM dbo.[${tabla}] d
      LEFT JOIN programas p ON p.corr_mar = d.corr_mar
      LEFT JOIN glosas g ON g.corr_mar = d.corr_mar AND g.corr_detmar = d.corr_detmar
      WHERE d.fol_dec = :folio ORDER BY d.corr_mar, d.corr_detmar, d.sublinea`, {
      type: QueryTypes.SELECT, replacements: { folio }, transaction,
    });
    return rows.map(({ programa_nombre, programa_anio, glosa_nombre, glosa_codigo, ...detalle }) => ({
      ...detalle,
      programa: programa_anio === null ? null : { corr_mar: detalle.corr_mar, ano_mar: programa_anio, nombre_mar: programa_nombre },
      glosa: glosa_nombre === null ? null : {
        corr_mar: detalle.corr_mar, corr_detmar: detalle.corr_detmar, glo_detmar: glosa_codigo, nom_detmar: glosa_nombre,
      },
    }));
  },

  programas(anio: number) {
    return sequelize.query<ProgramaDecreto>(`WITH programas AS (${marcos})
      SELECT * FROM programas WHERE ano_mar = :anio AND est_mar = 'ACTIVO' ORDER BY nombre_mar, corr_mar`,
    { type: QueryTypes.SELECT, replacements: { anio } });
  },

  glosas(id: number) {
    return sequelize.query<GlosaDecreto>(`WITH glosas AS (${glosas})
      SELECT * FROM glosas WHERE corr_mar = :id ORDER BY glo_detmar, corr_detmar`,
    { type: QueryTypes.SELECT, replacements: { id } });
  },

  async referenciaDisponible(id: number, glosa: number, anio: number, transaction: Transaction) {
    const rows = await sequelize.query<{ corr_mar: number }>(`
      WITH programas AS (${marcos}), glosas AS (${glosas})
      SELECT p.corr_mar FROM programas p JOIN glosas g ON g.corr_mar = p.corr_mar
      WHERE p.corr_mar = :id AND g.corr_detmar = :glosa AND p.ano_mar = :anio AND p.est_mar = 'ACTIVO'`,
    { type: QueryTypes.SELECT, replacements: { id, glosa, anio }, transaction });
    return rows.length === 1;
  },

  async crear(data: GuardarDecretoInput, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      INSERT INTO dbo.decretos_proempleo
        (fol_dec, folprov_dec, ano_dec, fec_dec, obs_dec, mon_dec, cob_dec, rutint_dec, programaInt, est_dec, usu_cre, fec_cre)
      VALUES (:fol_dec, :folprov_dec, :ano_dec, DATEFROMPARTS(:anioFecha, :mesFecha, :diaFecha),
        :obs_dec, :mon_dec, :cob_dec, :rutint_dec, :programaInt, 'ACTIVO', :usuario, GETDATE())`,
    { replacements: { ...reemplazos(data), usuario }, transaction });
  },

  async actualizar(folio: string, data: GuardarDecretoInput, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      UPDATE dbo.decretos_proempleo SET ano_dec = :ano_dec, fec_dec = DATEFROMPARTS(:anioFecha, :mesFecha, :diaFecha),
        obs_dec = :obs_dec, mon_dec = :mon_dec, cob_dec = :cob_dec, rutint_dec = :rutint_dec,
        programaInt = :programaInt, usu_mod = :usuario, fec_mod = GETDATE() WHERE fol_dec = :folio`,
    { replacements: { ...reemplazos(data), folio, usuario }, transaction });
  },

  async reemplazarDetalles(folio: string, detalles: GuardarDecretoInput['detalles'], transaction: Transaction) {
    await sequelize.query('DELETE FROM dbo.decretosDetalle_proempleo WHERE fol_dec = :folio',
      { replacements: { folio }, transaction });
    for (const detalle of detalles) await sequelize.query(`
      INSERT INTO dbo.decretosDetalle_proempleo (fol_dec, corr_mar, corr_detmar, mon_decdet, sublinea)
      VALUES (:folio, :corr_mar, :corr_detmar, :mon_decdet, :sublinea)`,
    { replacements: { ...detalle, folio }, transaction });
  },
};
