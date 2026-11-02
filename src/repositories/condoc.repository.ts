import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Condoc } from '../models/Condoc.model';
import type { Areas } from '../models/Areas.model';
import type { OrigenMarco } from '../validations/marco.validation';
import type { GuardarCondocInput, ListarCondocQuery } from '../validations/condoc.validation';

const LIMIT = 20;
const columnas = `c.id_condoc, RTRIM(c.fol_condoc) AS fol_condoc, c.cod_ano, c.corr_mar, c.tip_condoc, c.cod_are,
  c.des_condoc, c.ant_condoc, c.est_condoc, c.fec_cre, c.usu_cre, c.fec_mod, c.usu_mod,
  c.fec_eli, c.usu_eli, c.Fol_pro, c.fec_pro, c.usu_pro`;
const union = `SELECT ${columnas}, 'legacy' AS origen FROM dbo.CONDOC c
  UNION ALL SELECT ${columnas}, 'proempleo' AS origen FROM dbo.condoc_proempleo c`;
const marcos = `SELECT corr_mar, ano_mar, nombre_mar, est_mar FROM dbo.MARCO
  UNION ALL SELECT corr_mar, ano_mar, nombre_mar, est_mar FROM dbo.marco_proempleo`;

export type CondocListado = Condoc & {
  origen: OrigenMarco;
  nom_are: string | null;
  nombre_mar: string | null;
};
export type ProgramaCondoc = { corr_mar: number; ano_mar: number; nombre_mar: string | null };
type Fila = CondocListado & { total: number; totalPages: number; pagina: number; fila: number | null };

export const condocRepository = {
  async listar({ anio, folio, area, page }: ListarCondocQuery) {
    const filtros = [
      'fec_eli IS NULL',
      ...(anio === undefined ? [] : ['cod_ano = :anio']),
      ...(folio ? ['fol_condoc LIKE :folio'] : []),
      ...(area === undefined ? [] : ['cod_are = :area']),
    ];
    const rows = await sequelize.query<Fila>(`
      WITH unificados AS (${union}),
      programas AS (${marcos}),
      filtrados AS (SELECT * FROM unificados ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}),
      numerados AS (SELECT *, ROW_NUMBER() OVER (ORDER BY cod_ano DESC, id_condoc DESC, origen ASC) fila FROM filtrados),
      totales AS (SELECT COUNT(*) total FROM filtrados),
      paginas AS (SELECT total, CASE WHEN total = 0 THEN 1 ELSE (total - 1) / :limite + 1 END totalPages FROM totales),
      meta AS (SELECT *, CASE WHEN :pagina > totalPages THEN totalPages ELSE :pagina END pagina FROM paginas)
      SELECT n.*, m.total, m.totalPages, m.pagina,
        a.nom_are, p.nombre_mar
      FROM meta m LEFT JOIN numerados n
        ON n.fila BETWEEN ((m.pagina - 1) * :limite + 1) AND (m.pagina * :limite)
      LEFT JOIN dbo.AREAS a ON a.cod_are = n.cod_are
      LEFT JOIN programas p ON p.corr_mar = n.corr_mar
      ORDER BY n.fila`, {
      type: QueryTypes.SELECT,
      replacements: {
        anio,
        folio: `%${folio?.replace(/[\\%_[\]]/g, '[$&]') ?? ''}%`,
        area,
        pagina: page,
        limite: LIMIT,
      },
    });
    const meta = rows[0];
    const data = rows.filter((row) => row.fila !== null).map(({ total, totalPages, pagina, fila, ...documento }) => documento);
    return { data, pagination: { page: meta.pagina, limit: LIMIT, total: meta.total, totalPages: meta.totalPages } };
  },

  async anios() {
    const rows = await sequelize.query<{ cod_ano: number }>(`
      SELECT cod_ano FROM dbo.CONDOC WHERE cod_ano IS NOT NULL AND fec_eli IS NULL
      UNION SELECT cod_ano FROM dbo.condoc_proempleo WHERE cod_ano IS NOT NULL AND fec_eli IS NULL ORDER BY cod_ano DESC`,
    { type: QueryTypes.SELECT });
    return rows.map((row) => row.cod_ano);
  },

  areas(): Promise<Areas[]> {
    return sequelize.query<Areas>(`
      SELECT cod_are, nom_are FROM dbo.AREAS ORDER BY nom_are, cod_are`,
    { type: QueryTypes.SELECT });
  },

  async programasAnios() {
    const rows = await sequelize.query<{ ano_mar: number }>(`
      WITH programas AS (${marcos})
      SELECT ano_mar FROM programas WHERE ano_mar IS NOT NULL AND est_mar = 'ACTIVO'
      GROUP BY ano_mar ORDER BY ano_mar DESC`,
    { type: QueryTypes.SELECT });
    return rows.map((row) => row.ano_mar);
  },

  programas(anio: number): Promise<ProgramaCondoc[]> {
    return sequelize.query<ProgramaCondoc>(`
      WITH programas AS (${marcos})
      SELECT corr_mar, ano_mar, nombre_mar FROM programas
      WHERE ano_mar = :anio AND est_mar = 'ACTIVO' ORDER BY nombre_mar, corr_mar`,
    { type: QueryTypes.SELECT, replacements: { anio } });
  },

  async obtener(id: number, origen: OrigenMarco = 'legacy', transaction?: Transaction): Promise<CondocListado | null> {
    const tabla = origen === 'proempleo' ? 'condoc_proempleo' : 'CONDOC';
    const rows = await sequelize.query<CondocListado>(`
      WITH programas AS (${marcos})
      SELECT ${columnas}, :origen AS origen, a.nom_are, p.nombre_mar
      FROM dbo.[${tabla}] c ${transaction ? 'WITH (UPDLOCK, HOLDLOCK)' : ''}
      LEFT JOIN dbo.AREAS a ON a.cod_are = c.cod_are
      LEFT JOIN programas p ON p.corr_mar = c.corr_mar
      WHERE c.id_condoc = :id`, {
      type: QueryTypes.SELECT, replacements: { id, origen }, transaction,
    });
    return rows[0] ?? null;
  },

  async existeFolio(folio: string, transaction?: Transaction): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM (
        SELECT fol_condoc FROM dbo.CONDOC WHERE RTRIM(fol_condoc) = :folio
        UNION ALL SELECT fol_condoc FROM dbo.condoc_proempleo WHERE RTRIM(fol_condoc) = :folio
      ) u`, { type: QueryTypes.SELECT, replacements: { folio }, transaction });
    return (rows[0]?.total ?? 0) > 0;
  },

  async areaExiste(codAre: number): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM dbo.AREAS WHERE cod_are = :codAre`,
    { type: QueryTypes.SELECT, replacements: { codAre } });
    return (rows[0]?.total ?? 0) > 0;
  },

  async marcoDisponible(corrMar: number, anio: number, transaction?: Transaction): Promise<boolean> {
    const rows = await sequelize.query<{ corr_mar: number }>(`
      WITH programas AS (${marcos})
      SELECT corr_mar FROM programas
      WHERE corr_mar = :corrMar AND ano_mar = :anio AND est_mar = 'ACTIVO'`,
    { type: QueryTypes.SELECT, replacements: { corrMar, anio }, transaction });
    return rows.length === 1;
  },

  async crear(data: GuardarCondocInput, folio: string, usuario: string, transaction: Transaction): Promise<number> {
    const rows = await sequelize.query<{ id_condoc: number }>(`
      INSERT INTO dbo.condoc_proempleo
        (fol_condoc, cod_ano, corr_mar, tip_condoc, cod_are, des_condoc, ant_condoc, est_condoc, usu_cre, fec_cre)
      OUTPUT INSERTED.id_condoc
      VALUES (:folio, :cod_ano, :corr_mar, :tip_condoc, :cod_are, :des_condoc, :ant_condoc, 'Gestion', :usuario, GETDATE())`, {
      type: QueryTypes.SELECT,
      replacements: { ...data, folio, usuario },
      transaction,
    });
    return rows[0].id_condoc;
  },

  async actualizarEstado(id: number, estado: string, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      UPDATE dbo.condoc_proempleo SET est_condoc = :estado, usu_mod = :usuario, fec_mod = GETDATE()
      WHERE id_condoc = :id`, {
      replacements: { id, estado, usuario }, transaction,
    });
  },
};
