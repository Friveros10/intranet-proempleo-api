import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { OficioCobertura } from '../models/OficioCobertura.model';
import type { OrdOficob } from '../models/OrdOficob.model';
import type { OrigenMarco } from '../validations/marco.validation';
import type { GuardarCoberturasInput, ListarOrdinariosQuery } from '../validations/oficioCobertura.validation';

const LIMIT = 20;

const marcos = `SELECT corr_mar, ano_mar, nombre_mar, est_mar FROM dbo.MARCO
  UNION ALL SELECT corr_mar, ano_mar, nombre_mar, est_mar FROM dbo.marco_proempleo`;

export type ProgramaOficio = { corr_mar: number; ano_mar: number; nombre_mar: string | null };
export type CoberturaOficio = Omit<OficioCobertura, 'mon_ofi'> & {
  origen: OrigenMarco;
  nom_ciu: string | null;
  nom_com: string | null;
};
export type CoberturaExistente = {
  cod_com: number; jor_ofi: string | null; tip_ofi: string | null; Mes_ofi: number | null; ano_ofi: number | null;
};
export type OrdinarioListado = OrdOficob & { origen: OrigenMarco; totalCoberturas: number; cod_region: number | null; nom_region: string | null };
export type OrdinarioDetalle = OrdOficob & { origen: OrigenMarco; cod_region: number | null; nom_region: string | null };
type Fila = OrdinarioListado & { total: number; totalPages: number; pagina: number; fila: number | null };

export const oficioCoberturaRepository = {
  async listar({ folio, origen, page }: ListarOrdinariosQuery) {
    const filtros = [
      ...(folio ? ['RTRIM(ord_ofi) LIKE :folio'] : []),
      ...(origen === undefined ? [] : ['origen = :origen']),
    ];
    const rows = await sequelize.query<Fila>(`
      WITH unificados AS (
        SELECT RTRIM(ord_ofi) AS ord_ofi, fec_ofi, usu_cre, fec_cre, 'legacy' AS origen, CONVERT(INT, NULL) AS cod_region FROM dbo.ORDOFICOB
        UNION ALL SELECT RTRIM(ord_ofi) AS ord_ofi, fec_ofi, usu_cre, fec_cre, 'proempleo' AS origen, cod_region FROM dbo.ordOficob_proempleo
      ),
      filtrados AS (SELECT * FROM unificados ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}),
      numerados AS (SELECT *, ROW_NUMBER() OVER (ORDER BY fec_cre DESC, ord_ofi ASC, origen ASC) fila FROM filtrados),
      totales AS (SELECT COUNT(*) total FROM filtrados),
      paginas AS (SELECT total, CASE WHEN total = 0 THEN 1 ELSE (total - 1) / :limite + 1 END totalPages FROM totales),
      meta AS (SELECT *, CASE WHEN :pagina > totalPages THEN totalPages ELSE :pagina END pagina FROM paginas)
      SELECT n.*, m.total, m.totalPages, m.pagina, r.Nom_region AS nom_region,
        (SELECT COUNT(*) FROM (
          SELECT ord_ofi FROM dbo.OFICIOCOB WHERE RTRIM(ord_ofi) = n.ord_ofi
          UNION ALL SELECT ord_ofi FROM dbo.oficiocob_proempleo WHERE RTRIM(ord_ofi) = n.ord_ofi
        ) c) AS totalCoberturas
      FROM meta m LEFT JOIN numerados n
        ON n.fila BETWEEN ((m.pagina - 1) * :limite + 1) AND (m.pagina * :limite)
      LEFT JOIN dbo.REGIONES r ON r.cod_region = n.cod_region
      ORDER BY n.fila`, {
      type: QueryTypes.SELECT,
      replacements: { folio: `%${folio?.replace(/[\\%_[\]]/g, '[$&]') ?? ''}%`, origen, pagina: page, limite: LIMIT },
    });
    const meta = rows[0];
    const data = rows.filter((row) => row.fila !== null).map(({ total, totalPages, pagina, fila, ...ordinario }) => ordinario);
    return { data, pagination: { page: meta.pagina, limit: LIMIT, total: meta.total, totalPages: meta.totalPages } };
  },

  regiones() {
    return sequelize.query<{ cod_region: number; nom_region: string }>(`
      SELECT cod_region, Nom_region AS nom_region FROM dbo.REGIONES
      WHERE cod_region IN (5, 8, 10, 14, 16, 9) ORDER BY cod_region`,
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

  ciudades(region: number) {
    return sequelize.query<{ cod_ciu: number; nom_ciu: string }>(`
      SELECT cod_ciu, nom_ciu FROM dbo.CIUDADES WHERE cod_reg = :region ORDER BY nom_ciu`,
    { type: QueryTypes.SELECT, replacements: { region } });
  },

  comunas(ciudad: number) {
    return sequelize.query<{ cod_com: number; nom_com: string }>(`
      SELECT cod_com, nom_com FROM dbo.COMUNAS WHERE cod_ciu = :ciudad ORDER BY nom_com`,
    { type: QueryTypes.SELECT, replacements: { ciudad } });
  },

  programas(anio: number): Promise<ProgramaOficio[]> {
    return sequelize.query<ProgramaOficio>(`
      WITH programas AS (${marcos})
      SELECT corr_mar, ano_mar, nombre_mar FROM programas
      WHERE ano_mar = :anio AND est_mar = 'ACTIVO' ORDER BY nombre_mar, corr_mar`,
    { type: QueryTypes.SELECT, replacements: { anio } });
  },

  async marcoDisponible(corrMar: number, anio: number, transaction?: Transaction): Promise<boolean> {
    const rows = await sequelize.query<{ corr_mar: number }>(`
      WITH programas AS (${marcos})
      SELECT corr_mar FROM programas
      WHERE corr_mar = :corrMar AND ano_mar = :anio AND est_mar = 'ACTIVO'`,
    { type: QueryTypes.SELECT, replacements: { corrMar, anio }, transaction });
    return rows.length === 1;
  },

  async comunaValida(region: number, ciudad: number, comuna: number, transaction?: Transaction): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM dbo.COMUNAS co JOIN dbo.CIUDADES ci ON ci.cod_ciu = co.cod_ciu
      WHERE co.cod_com = :comuna AND co.cod_ciu = :ciudad AND ci.cod_reg = :region`,
    { type: QueryTypes.SELECT, replacements: { region, ciudad, comuna }, transaction });
    return (rows[0]?.total ?? 0) > 0;
  },

  async buscarOrdinario(folio: string, transaction?: Transaction): Promise<OrdinarioDetalle | null> {
    const rows = await sequelize.query<OrdinarioDetalle>(`
      SELECT u.ord_ofi, u.fec_ofi, u.usu_cre, u.fec_cre, u.origen, u.cod_region, r.Nom_region AS nom_region FROM (
        SELECT RTRIM(ord_ofi) AS ord_ofi, fec_ofi, usu_cre, fec_cre, 'legacy' AS origen, CONVERT(INT, NULL) AS cod_region FROM dbo.ORDOFICOB
        UNION ALL SELECT RTRIM(ord_ofi) AS ord_ofi, fec_ofi, usu_cre, fec_cre, 'proempleo' AS origen, cod_region FROM dbo.ordOficob_proempleo
      ) u LEFT JOIN dbo.REGIONES r ON r.cod_region = u.cod_region
      WHERE u.ord_ofi = :folio`,
    { type: QueryTypes.SELECT, replacements: { folio }, transaction });
    return rows[0] ?? null;
  },

  async regionActiva(codRegion: number): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM dbo.REGIONES WHERE cod_region = :codRegion AND cod_region IN (5, 8, 10, 14, 16, 9)`,
    { type: QueryTypes.SELECT, replacements: { codRegion } });
    return (rows[0]?.total ?? 0) > 0;
  },

  async crearOrdinario(folio: string, codRegion: number, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      INSERT INTO dbo.ordOficob_proempleo (ord_ofi, cod_region, fec_ofi, usu_cre, fec_cre)
      VALUES (:folio, :codRegion, GETDATE(), :usuario, GETDATE())`,
    { replacements: { folio, codRegion, usuario }, transaction });
  },

  coberturas(folio: string): Promise<CoberturaOficio[]> {
    return sequelize.query<CoberturaOficio>(`
      SELECT * FROM (
        SELECT c.corr_ofi, RTRIM(c.ord_ofi) AS ord_ofi, c.CORR_MAR, c.Mes_ofi, c.ano_ofi, c.cod_reg, c.cod_ciu, c.cod_com,
          c.jor_ofi, c.tip_ofi, c.ben_ofi, 'legacy' AS origen, ci.nom_ciu, co.nom_com
        FROM dbo.OFICIOCOB c
        LEFT JOIN dbo.CIUDADES ci ON ci.cod_ciu = c.cod_ciu
        LEFT JOIN dbo.COMUNAS co ON co.cod_com = c.cod_com
        WHERE RTRIM(c.ord_ofi) = :folio
        UNION ALL
        SELECT c.corr_ofi, RTRIM(c.ord_ofi) AS ord_ofi, c.CORR_MAR, c.Mes_ofi, c.ano_ofi, c.cod_reg, c.cod_ciu, c.cod_com,
          c.jor_ofi, c.tip_ofi, c.ben_ofi, 'proempleo' AS origen, ci.nom_ciu, co.nom_com
        FROM dbo.oficiocob_proempleo c
        LEFT JOIN dbo.CIUDADES ci ON ci.cod_ciu = c.cod_ciu
        LEFT JOIN dbo.COMUNAS co ON co.cod_com = c.cod_com
        WHERE RTRIM(c.ord_ofi) = :folio
      ) c
      ORDER BY c.ano_ofi DESC, c.Mes_ofi, c.cod_com, c.jor_ofi, c.tip_ofi, c.corr_ofi`,
    { type: QueryTypes.SELECT, replacements: { folio } });
  },

  coberturasExistentes(folio: string, transaction?: Transaction): Promise<CoberturaExistente[]> {
    return sequelize.query<CoberturaExistente>(`
      SELECT cod_com, jor_ofi, tip_ofi, Mes_ofi, ano_ofi FROM dbo.OFICIOCOB WHERE RTRIM(ord_ofi) = :folio
      UNION ALL
      SELECT cod_com, jor_ofi, tip_ofi, Mes_ofi, ano_ofi FROM dbo.oficiocob_proempleo WHERE RTRIM(ord_ofi) = :folio`,
    { type: QueryTypes.SELECT, replacements: { folio }, transaction });
  },

  async guardarCoberturas(folio: string, data: GuardarCoberturasInput, transaction: Transaction) {
    for (const cobertura of data.coberturas) {
      const meses = Array.from({ length: cobertura.mesHasta - cobertura.mesDesde + 1 }, (_, i) => cobertura.mesDesde + i);
      for (const mes of meses) {
        await sequelize.query(`
          INSERT INTO dbo.oficiocob_proempleo
            (ord_ofi, CORR_MAR, Mes_ofi, ano_ofi, cod_reg, cod_ciu, cod_com, jor_ofi, tip_ofi, ben_ofi, mon_ofi)
          VALUES
            (:folio, :corr_mar, :mes, :ano, :region, :ciudad, :comuna, :jornada, :tipo, :beneficiarios, 0)`, {
          replacements: {
            folio, corr_mar: data.corr_mar, mes, ano: cobertura.ano_ofi,
            region: cobertura.cod_reg, ciudad: cobertura.cod_ciu, comuna: cobertura.cod_com,
            jornada: cobertura.jor_ofi, tipo: cobertura.tip_ofi, beneficiarios: cobertura.ben_ofi,
          },
          transaction,
        });
      }
    }
  },
};
