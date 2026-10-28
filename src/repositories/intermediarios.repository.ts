import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { Intermediarios } from '../models/Intermediarios.model';
import type { Responsables } from '../models/Responsables.model';
import type { OrigenMarco } from '../validations/marco.validation';
import type {
  GuardarIntermediarioInput,
  GuardarResponsableInput,
  ListarIntermediariosQuery,
} from '../validations/intermediarios.validation';

const LIMIT = 20;
const columnas = `i.rut_int, RTRIM(i.dig_int) AS dig_int, i.nom_int, i.dir_int, i.reg_int, i.ciu_int, i.com_int,
  i.tel_int, i.usu_cre, i.fec_cre, i.usu_mod, i.fec_mod, i.usu_eli, i.fec_eli,
  i.Est_int, i.ema_int, RTRIM(i.int_int) AS int_int, i.rut_res`;
const union = `SELECT ${columnas}, 'legacy' AS origen FROM dbo.INTERMEDIARIOS i
  UNION ALL SELECT ${columnas}, 'proempleo' AS origen FROM dbo.intermediarios_proempleo i`;
const unionResponsables = `SELECT rut_res, RTRIM(dig_res) AS dig_res, nom_res, pat_res, mat_res, dir_res,
    reg_res, ciu_res, com_res, tel_res, civ_res, nac_res, Est_res, fax_res, ema_res, car_res, 'legacy' AS origen
  FROM dbo.RESPONSABLES
  UNION ALL
  SELECT rut_res, RTRIM(dig_res) AS dig_res, nom_res, pat_res, mat_res, dir_res,
    reg_res, ciu_res, com_res, tel_res, civ_res, nac_res, Est_res, fax_res, ema_res, car_res, 'proempleo' AS origen
  FROM dbo.responsables_proempleo`;

export type IntermediarioListado = Intermediarios & {
  origen: OrigenMarco;
  nombreRegion: string | null;
  nombreComuna: string | null;
};
export type IntermediarioDetalle = IntermediarioListado & {
  nombreRegion: string | null;
  nombreCiudad: string | null;
  nombreComuna: string | null;
  responsable: (Pick<Responsables, 'rut_res' | 'dig_res' | 'nom_res' | 'pat_res' | 'mat_res' | 'car_res' | 'tel_res' | 'ema_res' | 'fax_res'> & { origen: OrigenMarco }) | null;
};
export type ResponsableListado = Omit<Responsables, 'usu_cre' | 'fec_cre' | 'usu_mod' | 'fec_mod' | 'usu_eli' | 'fec_eli'> & { origen: OrigenMarco };
type Fila = IntermediarioListado & { total: number; totalPages: number; pagina: number; fila: number | null };

export const intermediariosRepository = {
  async listar({ region, comuna, page }: ListarIntermediariosQuery) {
    const filtros = [
      ...(region === undefined ? [] : ['reg_int = :region']),
      ...(comuna === undefined ? [] : ['com_int = :comuna']),
    ];
    const rows = await sequelize.query<Fila>(`
      WITH unificados AS (${union}),
      filtrados AS (SELECT * FROM unificados ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}),
      numerados AS (SELECT *, ROW_NUMBER() OVER (ORDER BY nom_int ASC, rut_int ASC, origen ASC) fila FROM filtrados),
      totales AS (SELECT COUNT(*) total FROM filtrados),
      paginas AS (SELECT total, CASE WHEN total = 0 THEN 1 ELSE (total - 1) / :limite + 1 END totalPages FROM totales),
      meta AS (SELECT *, CASE WHEN :pagina > totalPages THEN totalPages ELSE :pagina END pagina FROM paginas)
      SELECT n.*, m.total, m.totalPages, m.pagina,
        r.Nom_region AS nombreRegion, co.nom_com AS nombreComuna
      FROM meta m LEFT JOIN numerados n
        ON n.fila BETWEEN ((m.pagina - 1) * :limite + 1) AND (m.pagina * :limite)
      LEFT JOIN dbo.REGIONES r ON r.cod_region = n.reg_int
      LEFT JOIN dbo.COMUNAS co ON co.cod_com = n.com_int
      ORDER BY n.fila`, {
      type: QueryTypes.SELECT,
      replacements: { region, comuna, pagina: page, limite: LIMIT },
    });
    const meta = rows[0];
    const data = rows.filter((row) => row.fila !== null).map(({ total, totalPages, pagina, fila, ...intermediario }) => intermediario);
    return { data, pagination: { page: meta.pagina, limit: LIMIT, total: meta.total, totalPages: meta.totalPages } };
  },

  async obtener(rut: number, origen: OrigenMarco = 'legacy', transaction?: Transaction): Promise<IntermediarioDetalle | null> {
    const tabla = origen === 'proempleo' ? 'intermediarios_proempleo' : 'INTERMEDIARIOS';
    const rows = await sequelize.query<IntermediarioDetalle & {
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
      FROM dbo.[${tabla}] i ${transaction ? 'WITH (UPDLOCK, HOLDLOCK)' : ''}
      LEFT JOIN dbo.REGIONES r ON r.cod_region = i.reg_int
      LEFT JOIN dbo.CIUDADES ci ON ci.cod_ciu = i.ciu_int
      LEFT JOIN dbo.COMUNAS co ON co.cod_com = i.com_int
      LEFT JOIN responsables res ON res.rut_res = i.rut_res
      WHERE i.rut_int = :rut`, {
      type: QueryTypes.SELECT, replacements: { rut, origen }, transaction,
    });
    const row = rows[0];
    if (!row) return null;
    const { res_rut, res_dig, res_nom, res_pat, res_mat, res_car, res_tel, res_ema, res_fax, res_origen, ...intermediario } = row;
    return {
      ...intermediario,
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
        SELECT rut_int FROM dbo.INTERMEDIARIOS WHERE rut_int = :rut
        UNION ALL SELECT rut_int FROM dbo.intermediarios_proempleo WHERE rut_int = :rut
      ) u`, { type: QueryTypes.SELECT, replacements: { rut }, transaction });
    return (rows[0]?.total ?? 0) > 0;
  },

  async crear(rut: { cuerpo: number; dv: string }, data: GuardarIntermediarioInput, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      INSERT INTO dbo.intermediarios_proempleo
        (rut_int, dig_int, nom_int, dir_int, reg_int, ciu_int, com_int, tel_int,
         usu_cre, fec_cre, Est_int, ema_int, int_int, rut_res)
      VALUES
        (:rut, :dv, :nom, :dir, :region, :ciudad, :comuna, :telefono,
         :usuario, GETDATE(), 'ACTIVO', :email, :intendencia, :responsable)`, {
      type: QueryTypes.INSERT,
      replacements: {
        rut: rut.cuerpo, dv: rut.dv, nom: data.nom_int, dir: data.dir_int,
        region: data.reg_int, ciudad: data.ciu_int, comuna: data.com_int,
        telefono: data.tel_int === null ? null : Number(data.tel_int),
        usuario, email: data.ema_int, intendencia: data.int_int ? 'S' : ' ',
        responsable: data.rut_res,
      },
      transaction,
    });
  },

  async actualizar(rut: number, data: GuardarIntermediarioInput, usuario: string, transaction: Transaction) {
    const [, actualizados] = await sequelize.query(`
      UPDATE dbo.intermediarios_proempleo SET
        nom_int = :nom, dir_int = :dir, reg_int = :region, ciu_int = :ciudad, com_int = :comuna,
        tel_int = :telefono, ema_int = :email, int_int = :intendencia, rut_res = :responsable,
        usu_mod = :usuario, fec_mod = GETDATE()
      WHERE rut_int = :rut`, {
      type: QueryTypes.UPDATE,
      replacements: {
        rut, nom: data.nom_int, dir: data.dir_int, region: data.reg_int, ciudad: data.ciu_int,
        comuna: data.com_int, telefono: data.tel_int === null ? null : Number(data.tel_int),
        email: data.ema_int, intendencia: data.int_int ? 'S' : ' ',
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

  async crearResponsable(rut: { cuerpo: number; dv: string }, data: GuardarResponsableInput, usuario: string, transaction: Transaction) {
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
