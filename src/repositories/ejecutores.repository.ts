import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Ejecutores } from '../models/Ejecutores.model';
import type { Responsables } from '../models/Responsables.model';
import type { OrigenMarco } from '../validations/marco.validation';
import type {
  GuardarEjecutorInput,
  ListarEjecutoresQuery,
} from '../validations/ejecutores.validation';

const LIMIT = 20;
const columnas = `e.rut_eje, RTRIM(e.dig_eje) AS dig_eje, e.nom_eje, e.dir_eje, e.reg_eje, e.ciu_eje, e.com_eje,
  e.tel_eje, e.usu_cre, e.fec_cre, e.usu_mod, e.fec_mod, e.usu_eli, e.fec_eli,
  e.Est_eje, e.rut_res`;
const union = `SELECT ${columnas}, 'legacy' AS origen FROM dbo.EJECUTORES e
  UNION ALL SELECT ${columnas}, 'proempleo' AS origen FROM dbo.ejecutores_proempleo e`;
const unionResponsables = `SELECT rut_res, RTRIM(dig_res) AS dig_res, nom_res, pat_res, mat_res, dir_res,
    reg_res, ciu_res, com_res, tel_res, civ_res, nac_res, Est_res, fax_res, ema_res, car_res, 'legacy' AS origen
  FROM dbo.RESPONSABLES
  UNION ALL
  SELECT rut_res, RTRIM(dig_res) AS dig_res, nom_res, pat_res, mat_res, dir_res,
    reg_res, ciu_res, com_res, tel_res, civ_res, nac_res, Est_res, fax_res, ema_res, car_res, 'proempleo' AS origen
  FROM dbo.responsables_proempleo`;

export type EjecutorListado = Ejecutores & {
  origen: OrigenMarco;
  nombreRegion: string | null;
  nombreComuna: string | null;
};
export type EjecutorDetalle = EjecutorListado & {
  nombreRegion: string | null;
  nombreCiudad: string | null;
  nombreComuna: string | null;
  responsable: (Pick<Responsables, 'rut_res' | 'dig_res' | 'nom_res' | 'pat_res' | 'mat_res' | 'car_res' | 'tel_res' | 'ema_res' | 'fax_res'> & { origen: OrigenMarco }) | null;
};
export type ResponsableListado = Omit<Responsables, 'usu_cre' | 'fec_cre' | 'usu_mod' | 'fec_mod' | 'usu_eli' | 'fec_eli'> & { origen: OrigenMarco };
type Fila = EjecutorListado & { total: number; totalPages: number; pagina: number; fila: number | null };

export const ejecutoresRepository = {
  async listar({ rut, region, comuna, page }: ListarEjecutoresQuery) {
    const filtros = [
      "(Est_eje IS NULL OR RTRIM(Est_eje) <> 'ELIMINADO')",
      ...(rut === undefined ? [] : ['rut_eje = :rut']),
      ...(region === undefined ? [] : ['reg_eje = :region']),
      ...(comuna === undefined ? [] : ['com_eje = :comuna']),
    ];
    const rows = await sequelize.query<Fila>(`
      WITH unificados AS (${union}),
      filtrados AS (SELECT * FROM unificados ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}),
      numerados AS (SELECT *, ROW_NUMBER() OVER (ORDER BY fec_cre DESC, nom_eje ASC, rut_eje ASC, origen ASC) fila FROM filtrados),
      totales AS (SELECT COUNT(*) total FROM filtrados),
      paginas AS (SELECT total, CASE WHEN total = 0 THEN 1 ELSE (total - 1) / :limite + 1 END totalPages FROM totales),
      meta AS (SELECT *, CASE WHEN :pagina > totalPages THEN totalPages ELSE :pagina END pagina FROM paginas)
      SELECT n.*, m.total, m.totalPages, m.pagina,
        r.Nom_region AS nombreRegion, co.nom_com AS nombreComuna
      FROM meta m LEFT JOIN numerados n
        ON n.fila BETWEEN ((m.pagina - 1) * :limite + 1) AND (m.pagina * :limite)
      LEFT JOIN dbo.REGIONES r ON r.cod_region = n.reg_eje
      LEFT JOIN dbo.COMUNAS co ON co.cod_com = n.com_eje
      ORDER BY n.fila`, {
      type: QueryTypes.SELECT,
      replacements: { rut, region, comuna, pagina: page, limite: LIMIT },
    });
    const meta = rows[0];
    const data = rows.filter((row) => row.fila !== null).map(({ total, totalPages, pagina, fila, ...ejecutor }) => ejecutor);
    return { data, pagination: { page: meta.pagina, limit: LIMIT, total: meta.total, totalPages: meta.totalPages } };
  },

  async obtener(rut: number, origen: OrigenMarco = 'legacy', transaction?: Transaction): Promise<EjecutorDetalle | null> {
    const tabla = origen === 'proempleo' ? 'ejecutores_proempleo' : 'EJECUTORES';
    const rows = await sequelize.query<EjecutorDetalle & {
      res_rut: number | null; res_dig: string | null; res_nom: string | null; res_pat: string | null;
      res_mat: string | null; res_car: string | null; res_tel: string | null; res_ema: string | null;
      res_fax: string | null; res_origen: OrigenMarco | null;
    }>(`
      WITH responsables AS (${unionResponsables})
      SELECT ${columnas}, :origen AS origen,
        r.Nom_region AS nombreRegion, ci.nom_ciu AS nombreCiudad, co.nom_com AS nombreComuna,
        res.rut_res AS res_rut, res.dig_res AS res_dig, res.nom_res AS res_nom, res.pat_res AS res_pat,
        res.mat_res AS res_mat, res.car_res AS res_car, res.tel_res AS res_tel, res.ema_res AS res_ema,
        res.fax_res AS res_fax, res.origen AS res_origen
      FROM dbo.[${tabla}] e ${transaction ? 'WITH (UPDLOCK, HOLDLOCK)' : ''}
      LEFT JOIN dbo.REGIONES r ON r.cod_region = e.reg_eje
      LEFT JOIN dbo.CIUDADES ci ON ci.cod_ciu = e.ciu_eje
      LEFT JOIN dbo.COMUNAS co ON co.cod_com = e.com_eje
      LEFT JOIN responsables res ON res.rut_res = e.rut_res
      WHERE e.rut_eje = :rut`, {
      type: QueryTypes.SELECT, replacements: { rut, origen }, transaction,
    });
    const row = rows[0];
    if (!row) return null;
    const { res_rut, res_dig, res_nom, res_pat, res_mat, res_car, res_tel, res_ema, res_fax, res_origen, ...ejecutor } = row;
    return {
      ...ejecutor,
      responsable: res_rut === null ? null : {
        rut_res: res_rut, dig_res: res_dig ?? '', nom_res: res_nom ?? '', pat_res: res_pat ?? '',
        mat_res: res_mat ?? '', car_res: res_car, tel_res: res_tel, ema_res: res_ema,
        fax_res: res_fax, origen: res_origen ?? 'legacy',
      },
    };
  },

  async existe(rut: number, transaction?: Transaction): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM (
        SELECT rut_eje FROM dbo.EJECUTORES WHERE rut_eje = :rut
        UNION ALL SELECT rut_eje FROM dbo.ejecutores_proempleo WHERE rut_eje = :rut
      ) u`, { type: QueryTypes.SELECT, replacements: { rut }, transaction });
    return (rows[0]?.total ?? 0) > 0;
  },

  async crear(rut: { cuerpo: number; dv: string }, data: GuardarEjecutorInput, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      INSERT INTO dbo.ejecutores_proempleo
        (rut_eje, dig_eje, nom_eje, dir_eje, reg_eje, ciu_eje, com_eje, tel_eje,
         usu_cre, fec_cre, Est_eje, rut_res)
      VALUES
        (:rut, :dv, :nom, :dir, :region, :ciudad, :comuna, :telefono,
         :usuario, GETDATE(), 'ACTIVO', :responsable)`, {
      type: QueryTypes.INSERT,
      replacements: {
        rut: rut.cuerpo, dv: rut.dv, nom: data.nom_eje, dir: data.dir_eje,
        region: data.reg_eje, ciudad: data.ciu_eje, comuna: data.com_eje,
        telefono: data.tel_eje === null ? null : Number(data.tel_eje),
        usuario, responsable: data.rut_res,
      },
      transaction,
    });
  },

  async actualizar(rut: number, data: GuardarEjecutorInput, usuario: string, transaction: Transaction) {
    const [, actualizados] = await sequelize.query(`
      UPDATE dbo.ejecutores_proempleo SET
        nom_eje = :nom, dir_eje = :dir, reg_eje = :region, ciu_eje = :ciudad, com_eje = :comuna,
        tel_eje = :telefono, rut_res = :responsable,
        usu_mod = :usuario, fec_mod = GETDATE()
      WHERE rut_eje = :rut`, {
      type: QueryTypes.UPDATE,
      replacements: {
        rut, nom: data.nom_eje, dir: data.dir_eje, region: data.reg_eje, ciudad: data.ciu_eje,
        comuna: data.com_eje, telefono: data.tel_eje === null ? null : Number(data.tel_eje),
        responsable: data.rut_res, usuario,
      },
      transaction,
    });
    return actualizados;
  },

  async responsablesPorComuna(comuna: number): Promise<ResponsableListado[]> {
    return sequelize.query<ResponsableListado>(`
      SELECT * FROM (${unionResponsables}) r
      WHERE r.com_res = :comuna AND (r.Est_res IS NULL OR RTRIM(r.Est_res) <> 'ELIMINADO')
      ORDER BY r.nom_res ASC, r.pat_res ASC, r.rut_res ASC`, {
      type: QueryTypes.SELECT, replacements: { comuna },
    });
  },

  async existeResponsable(rut: number, transaction?: Transaction): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM (
        SELECT rut_res FROM dbo.RESPONSABLES WHERE rut_res = :rut
        UNION ALL SELECT rut_res FROM dbo.responsables_proempleo WHERE rut_res = :rut
      ) u`, { type: QueryTypes.SELECT, replacements: { rut }, transaction });
    return (rows[0]?.total ?? 0) > 0;
  },

  async crearResponsable(rut: { cuerpo: number; dv: string }, data: {
    nom_res: string; car_res: string | null; ema_res: string | null; fax_res: string | null;
    tel_res: string | null; reg_res: number; ciu_res: number; com_res: number;
  }, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      INSERT INTO dbo.responsables_proempleo
        (rut_res, dig_res, nom_res, pat_res, mat_res, dir_res, reg_res, ciu_res, com_res,
         tel_res, civ_res, nac_res, usu_cre, fec_cre, Est_res, fax_res, ema_res, car_res)
      VALUES
        (:rut, :dv, :nom, '', '', NULL, :region, :ciudad, :comuna,
         :telefono, '', '', :usuario, GETDATE(), 'ACTIVO', :fax, :email, :cargo)`, {
      type: QueryTypes.INSERT,
      replacements: {
        rut: rut.cuerpo, dv: rut.dv, nom: data.nom_res, region: data.reg_res,
        ciudad: data.ciu_res, comuna: data.com_res, telefono: data.tel_res,
        usuario, fax: data.fax_res, email: data.ema_res, cargo: data.car_res,
      },
      transaction,
    });
  },

  async comunaValida(region: number, ciudad: number, comuna: number, transaction?: Transaction): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM dbo.COMUNAS co JOIN dbo.CIUDADES ci ON ci.cod_ciu = co.cod_ciu
      WHERE co.cod_com = :comuna AND co.cod_ciu = :ciudad AND ci.cod_reg = :region`, {
      type: QueryTypes.SELECT, replacements: { region, ciudad, comuna }, transaction,
    });
    return (rows[0]?.total ?? 0) > 0;
  },

  ciudades(region: number) {
    return sequelize.query<{ cod_ciu: number; nom_ciu: string }>(`
      SELECT cod_ciu, nom_ciu FROM dbo.CIUDADES WHERE cod_reg = :region ORDER BY nom_ciu`, {
      type: QueryTypes.SELECT, replacements: { region },
    });
  },

  comunas(filtros: { region?: number; ciudad?: number }) {
    const where = [
      ...(filtros.region === undefined ? [] : ['ci.cod_reg = :region']),
      ...(filtros.ciudad === undefined ? [] : ['co.cod_ciu = :ciudad']),
    ];
    return sequelize.query<{ cod_com: number; nom_com: string; cod_ciu: number | null }>(`
      SELECT co.cod_com, co.nom_com, co.cod_ciu
      FROM dbo.COMUNAS co JOIN dbo.CIUDADES ci ON ci.cod_ciu = co.cod_ciu
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY co.nom_com`, {
      type: QueryTypes.SELECT, replacements: { region: filtros.region, ciudad: filtros.ciudad },
    });
  },
};
