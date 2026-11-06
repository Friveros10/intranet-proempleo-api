import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { OrigenMarco } from '../validations/marco.validation';
import type {
  GastoProyectoInput,
  GuardarProyectoInput,
  ListarProyectosQuery,
} from '../validations/proyectos.validation';

const LIMIT = 20;

const columnas = `p.fol_pro, RTRIM(p.nom_pro) AS nom_pro, p.rutint_pro, p.ruteje_pro, p.reg_pro, p.ciu_pro, p.com_pro,
  p.obj_pro, p.imp_pro, p.obs_pro, p.mes_pro, p.emp_pro, p.fecini_pro, p.fecter_pro, p.rutres_pro,
  CAST(p.mon_pro AS VARCHAR(18)) AS mon_pro, RTRIM(p.jor_pro) AS jor_pro, p.ano_pro, RTRIM(p.est_pro) AS est_pro,
  p.usu_cre, p.fec_cre, p.usu_mod, p.fec_mod, p.usu_eli, p.fec_eli`;

const union = `SELECT ${columnas}, NULL AS banco_pro, 'legacy' AS origen FROM dbo.PROYECTOS p
  UNION ALL SELECT ${columnas}, p.banco_pro, 'proempleo' AS origen FROM dbo.proyectos_proempleo p`;

const unionIntermediarios = `SELECT rut_int, RTRIM(dig_int) AS dig_int, nom_int, com_int, Est_int, 'legacy' AS origen FROM dbo.INTERMEDIARIOS
  UNION ALL SELECT rut_int, RTRIM(dig_int) AS dig_int, nom_int, com_int, Est_int, 'proempleo' AS origen FROM dbo.intermediarios_proempleo`;

const unionEjecutores = `SELECT rut_eje, RTRIM(dig_eje) AS dig_eje, nom_eje, com_eje, Est_eje, 'legacy' AS origen FROM dbo.EJECUTORES
  UNION ALL SELECT rut_eje, RTRIM(dig_eje) AS dig_eje, nom_eje, com_eje, Est_eje, 'proempleo' AS origen FROM dbo.ejecutores_proempleo`;

const unionResponsables = `SELECT rut_res, RTRIM(dig_res) AS dig_res, nom_res, pat_res, mat_res, car_res, tel_res,
    ema_res, com_res, Est_res, 'legacy' AS origen FROM dbo.RESPONSABLES
  UNION ALL SELECT rut_res, RTRIM(dig_res) AS dig_res, nom_res, pat_res, mat_res, car_res, tel_res,
    ema_res, com_res, Est_res, 'proempleo' AS origen FROM dbo.responsables_proempleo`;

const marcos = `SELECT ano_mar, est_mar FROM dbo.MARCO
  UNION ALL SELECT ano_mar, est_mar FROM dbo.marco_proempleo`;

export type ProyectoFila = {
  fol_pro: number;
  nom_pro: string;
  rutint_pro: number;
  ruteje_pro: number;
  reg_pro: number;
  ciu_pro: number;
  com_pro: number | null;
  obj_pro: string | null;
  imp_pro: string | null;
  obs_pro: string | null;
  mes_pro: number | null;
  emp_pro: number | null;
  fecini_pro: Date | null;
  fecter_pro: Date | null;
  rutres_pro: number | null;
  mon_pro: string | null;
  jor_pro: string | null;
  ano_pro: number | null;
  est_pro: string | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_mod: string | null;
  fec_mod: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  banco_pro: number | null;
  origen: OrigenMarco;
};

export type ProyectoListado = ProyectoFila & {
  nombreRegion: string | null;
  nombreCiudad: string | null;
  nombreComuna: string | null;
  nombreIntermediario: string | null;
  nombreEjecutor: string | null;
};

export type GastoProyecto = {
  corr_itemGas: number;
  nombre: string | null;
  mon_proitemgas: string;
  compaGas: string;
  obs_proitemgas: string | null;
};

export type ResponsableProyecto = {
  rut_res: number;
  dig_res: string;
  nom_res: string;
  pat_res: string;
  mat_res: string;
  car_res: string | null;
  tel_res: string | null;
  ema_res: string | null;
  origen: OrigenMarco;
};

export type ProyectoDetalle = ProyectoListado & {
  digIntermediario: string | null;
  digEjecutor: string | null;
  responsable: ResponsableProyecto | null;
  gastos: GastoProyecto[];
};

export type IntermediarioCatalogo = { rut_int: number; dig_int: string; nom_int: string; com_int: number | null };
export type EjecutorCatalogo = { rut_eje: number; dig_eje: string; nom_eje: string; com_eje: number | null };
export type ResponsableCatalogo = Omit<ResponsableProyecto, 'origen'> & { com_res: number | null; origen: OrigenMarco };

type Fila = ProyectoListado & { total: number; totalPages: number; pagina: number; fila: number | null };

export const proyectosRepository = {
  async listar({ folio, banco, anio, intermediario, ejecutor, region, comuna, page }: ListarProyectosQuery) {
    const filtros = [
      "(est_pro IS NULL OR est_pro <> 'ELIMINADO')",
      ...(folio === undefined ? [] : ['fol_pro = :folio']),
      ...(banco === undefined ? [] : ['banco_pro = :banco']),
      ...(anio === undefined ? [] : ['ano_pro = :anio']),
      ...(intermediario === undefined ? [] : ['rutint_pro = :intermediario']),
      ...(ejecutor === undefined ? [] : ['ruteje_pro = :ejecutor']),
      ...(region === undefined ? [] : ['reg_pro = :region']),
      ...(comuna === undefined ? [] : ['com_pro = :comuna']),
    ];
    const rows = await sequelize.query<Fila>(`
      WITH unificados AS (${union}),
      filtrados AS (SELECT * FROM unificados ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}),
      numerados AS (SELECT *, ROW_NUMBER() OVER (ORDER BY fec_cre DESC, fol_pro DESC, origen ASC) fila FROM filtrados),
      totales AS (SELECT COUNT(*) total FROM filtrados),
      paginas AS (SELECT total, CASE WHEN total = 0 THEN 1 ELSE (total - 1) / :limite + 1 END totalPages FROM totales),
      meta AS (SELECT *, CASE WHEN :pagina > totalPages THEN totalPages ELSE :pagina END pagina FROM paginas)
      SELECT n.*, m.total, m.totalPages, m.pagina,
        r.Nom_region AS nombreRegion, ci.nom_ciu AS nombreCiudad, co.nom_com AS nombreComuna,
        i.nom_int AS nombreIntermediario, e.nom_eje AS nombreEjecutor
      FROM meta m LEFT JOIN numerados n
        ON n.fila BETWEEN ((m.pagina - 1) * :limite + 1) AND (m.pagina * :limite)
      LEFT JOIN dbo.REGIONES r ON r.cod_region = n.reg_pro
      LEFT JOIN dbo.CIUDADES ci ON ci.cod_ciu = n.ciu_pro
      LEFT JOIN dbo.COMUNAS co ON co.cod_com = n.com_pro
      LEFT JOIN (${unionIntermediarios}) i ON i.rut_int = n.rutint_pro
      LEFT JOIN (${unionEjecutores}) e ON e.rut_eje = n.ruteje_pro
      ORDER BY n.fila`, {
      type: QueryTypes.SELECT,
      replacements: { folio, banco, anio, intermediario, ejecutor, region, comuna, pagina: page, limite: LIMIT },
    });
    const meta = rows[0];
    const data = rows
      .filter((row) => row.fila !== null)
      .map(({ total, totalPages, pagina, fila, ...proyecto }) => proyecto);
    return { data, pagination: { page: meta.pagina, limit: LIMIT, total: meta.total, totalPages: meta.totalPages } };
  },

  async obtener(folio: number, origen: OrigenMarco = 'legacy', transaction?: Transaction): Promise<ProyectoDetalle | null> {
    const tabla = origen === 'proempleo' ? 'proyectos_proempleo' : 'PROYECTOS';
    const rows = await sequelize.query<ProyectoListado & {
      banco_sel: number | null;
      dig_int: string | null; dig_eje: string | null;
      res_rut: number | null; res_dig: string | null; res_nom: string | null; res_pat: string | null;
      res_mat: string | null; res_car: string | null; res_tel: string | null; res_ema: string | null;
      res_origen: OrigenMarco | null;
    }>(`
      WITH intermediarios AS (${unionIntermediarios}),
      ejecutores AS (${unionEjecutores}),
      responsables AS (${unionResponsables})
      SELECT ${columnas}, ${origen === 'proempleo' ? 'p.banco_pro' : 'NULL'} AS banco_sel, :origen AS origen,
        r.Nom_region AS nombreRegion, ci.nom_ciu AS nombreCiudad, co.nom_com AS nombreComuna,
        i.nom_int AS nombreIntermediario, i.dig_int, e.nom_eje AS nombreEjecutor, e.dig_eje,
        res.rut_res AS res_rut, res.dig_res AS res_dig, res.nom_res AS res_nom, res.pat_res AS res_pat,
        res.mat_res AS res_mat, res.car_res AS res_car, res.tel_res AS res_tel, res.ema_res AS res_ema,
        res.origen AS res_origen
      FROM dbo.[${tabla}] p ${transaction ? 'WITH (UPDLOCK, HOLDLOCK)' : ''}
      LEFT JOIN dbo.REGIONES r ON r.cod_region = p.reg_pro
      LEFT JOIN dbo.CIUDADES ci ON ci.cod_ciu = p.ciu_pro
      LEFT JOIN dbo.COMUNAS co ON co.cod_com = p.com_pro
      LEFT JOIN intermediarios i ON i.rut_int = p.rutint_pro
      LEFT JOIN ejecutores e ON e.rut_eje = p.ruteje_pro
      LEFT JOIN responsables res ON res.rut_res = p.rutres_pro
      WHERE p.fol_pro = :folio`, {
      type: QueryTypes.SELECT, replacements: { folio, origen }, transaction,
    });
    const row = rows[0];
    if (!row) return null;
    const {
      banco_sel, dig_int, dig_eje,
      res_rut, res_dig, res_nom, res_pat, res_mat, res_car, res_tel, res_ema, res_origen,
      ...proyecto
    } = row;
    const gastos = await this.gastos(folio, origen, transaction);
    return {
      ...proyecto,
      banco_pro: banco_sel,
      digIntermediario: dig_int,
      digEjecutor: dig_eje,
      responsable: res_rut === null ? null : {
        rut_res: res_rut, dig_res: res_dig ?? '', nom_res: res_nom ?? '', pat_res: res_pat ?? '',
        mat_res: res_mat ?? '', car_res: res_car, tel_res: res_tel, ema_res: res_ema,
        origen: res_origen ?? 'legacy',
      },
      gastos,
    };
  },

  async gastos(folio: number, origen: OrigenMarco, transaction?: Transaction): Promise<GastoProyecto[]> {
    if (origen === 'proempleo') {
      return sequelize.query<GastoProyecto>(`
        SELECT g.corr_itemGas, NULL AS nombre, CAST(g.mon_proitemgas AS VARCHAR(18)) AS mon_proitemgas,
          CAST(COALESCE((
            SELECT SUM(r.mon_detren) FROM dbo.detrendicion_proempleo r
            WHERE r.fol_pro = g.fol_pro AND r.corr_itemGas = g.corr_itemGas
          ), 0) AS VARCHAR(18)) AS compaGas,
          g.obs_proitemgas
        FROM dbo.proitemgas_proempleo g WHERE g.fol_pro = :folio ORDER BY g.corr_itemGas`, {
        type: QueryTypes.SELECT, replacements: { folio }, transaction,
      });
    }
    // Replica la consulta de la intranet legacy: el marco define qué ítems se
    // muestran, aunque el proyecto todavía no tenga un monto asignado para ellos.
    return sequelize.query<GastoProyecto>(`
      SELECT t1.corr_itemGas, RTRIM(t1.nom_itemGas) AS nombre,
        CAST(COALESCE((
          SELECT p.mon_proitemgas FROM dbo.PROITEMGAS p
          WHERE p.fol_pro = :folio AND p.corr_itemGas = t1.corr_itemGas
        ), 0) AS VARCHAR(18)) AS mon_proitemgas,
        CAST(COALESCE((
          SELECT SUM(r.mon_detren) FROM dbo.DETRENDICION r
          WHERE r.fol_pro = :folio AND r.corr_itemGas = t1.corr_itemGas
        ), 0) AS VARCHAR(18)) AS compaGas,
        NULL AS obs_proitemgas
      FROM dbo.vista_ProItemGas t1
      WHERE t1.corr_mar = (
        SELECT p.corr_mar FROM dbo.PROYECTOS p WHERE p.fol_pro = :folio
      )
      ORDER BY t1.corr_itemGas`, {
      type: QueryTypes.SELECT, replacements: { folio }, transaction,
    });
  },

  async proximoFolio(): Promise<number> {
    const rows = await sequelize.query<{ maximo: number | null }>(`
      SELECT MAX(fol_pro) AS maximo FROM (
        SELECT fol_pro FROM dbo.PROYECTOS
        UNION ALL SELECT fol_pro FROM dbo.proyectos_proempleo
      ) u`, { type: QueryTypes.SELECT });
    return (rows[0]?.maximo ?? 0) + 1;
  },

  async existeFolio(folio: number, transaction?: Transaction): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM (
        SELECT fol_pro FROM dbo.PROYECTOS WHERE fol_pro = :folio
        UNION ALL SELECT fol_pro FROM dbo.proyectos_proempleo ${transaction ? 'WITH (UPDLOCK, HOLDLOCK)' : ''} WHERE fol_pro = :folio
      ) u`, { type: QueryTypes.SELECT, replacements: { folio }, transaction });
    return (rows[0]?.total ?? 0) > 0;
  },

  async crear(data: GuardarProyectoInput, nombreBanco: string, meses: number, usuario: string, transaction: Transaction) {
    const [iniAnio, iniMes, iniDia] = data.fecini_pro.split('-').map(Number);
    const [terAnio, terMes, terDia] = data.fecter_pro.split('-').map(Number);
    await sequelize.query(`
      INSERT INTO dbo.proyectos_proempleo
        (fol_pro, nom_pro, rutint_pro, ruteje_pro, reg_pro, ciu_pro, com_pro, obj_pro, imp_pro,
         mes_pro, emp_pro, fecini_pro, fecter_pro, rutres_pro, mon_pro, jor_pro, ano_pro, banco_pro,
         subtitulo_mar, item_mar, linea_mar, corr_mar, est_pro, usu_cre, fec_cre)
      VALUES
        (:folio, :nombre, :intermediario, :ejecutor, :region, :ciudad, :comuna, :objetivo, :impacto,
         :meses, :beneficiarios, DATEFROMPARTS(:iniAnio, :iniMes, :iniDia), DATEFROMPARTS(:terAnio, :terMes, :terDia),
         :responsable, :monto, :jornada, :anio, :banco,
         0, 0, 0, 0, 'ACTIVO', :usuario, GETDATE())`, {
      type: QueryTypes.INSERT,
      replacements: {
        folio: data.fol_pro, nombre: nombreBanco, intermediario: data.rutint_pro, ejecutor: data.ruteje_pro,
        region: data.reg_pro, ciudad: data.ciu_pro, comuna: data.com_pro, objetivo: data.obj_pro,
        impacto: data.imp_pro, meses, beneficiarios: data.emp_pro,
        iniAnio, iniMes, iniDia, terAnio, terMes, terDia,
        responsable: data.rutres_pro, monto: data.mon_pro, jornada: data.jor_pro,
        anio: data.ano_pro, banco: data.banco_pro, usuario,
      },
      transaction,
    });
  },

  async actualizar(folio: number, data: GuardarProyectoInput, nombreBanco: string, meses: number, usuario: string, transaction: Transaction) {
    const [iniAnio, iniMes, iniDia] = data.fecini_pro.split('-').map(Number);
    const [terAnio, terMes, terDia] = data.fecter_pro.split('-').map(Number);
    await sequelize.query(`
      UPDATE dbo.proyectos_proempleo SET
        nom_pro = :nombre, rutint_pro = :intermediario, ruteje_pro = :ejecutor,
        reg_pro = :region, ciu_pro = :ciudad, com_pro = :comuna, obj_pro = :objetivo, imp_pro = :impacto,
        mes_pro = :meses, emp_pro = :beneficiarios,
        fecini_pro = DATEFROMPARTS(:iniAnio, :iniMes, :iniDia), fecter_pro = DATEFROMPARTS(:terAnio, :terMes, :terDia),
        rutres_pro = :responsable, mon_pro = :monto, jor_pro = :jornada, ano_pro = :anio, banco_pro = :banco,
        usu_mod = :usuario, fec_mod = GETDATE()
      WHERE fol_pro = :folio`, {
      type: QueryTypes.UPDATE,
      replacements: {
        folio, nombre: nombreBanco, intermediario: data.rutint_pro, ejecutor: data.ruteje_pro,
        region: data.reg_pro, ciudad: data.ciu_pro, comuna: data.com_pro, objetivo: data.obj_pro,
        impacto: data.imp_pro, meses, beneficiarios: data.emp_pro,
        iniAnio, iniMes, iniDia, terAnio, terMes, terDia,
        responsable: data.rutres_pro, monto: data.mon_pro, jornada: data.jor_pro,
        anio: data.ano_pro, banco: data.banco_pro, usuario,
      },
      transaction,
    });
  },

  async reemplazarGastos(
    folio: number,
    gastos: GastoProyectoInput[],
    contexto: { anio: number; mes: number; region: number; usuario: string },
    transaction: Transaction,
  ) {
    // Esta operación siempre participa de la misma transacción que la cabecera:
    // si falla un detalle, tampoco queda guardado el proyecto (o su modificación).
    await sequelize.query('DELETE FROM dbo.proitemgas_proempleo WHERE fol_pro = :folio', {
      type: QueryTypes.DELETE, replacements: { folio }, transaction,
    });
    await sequelize.query(`
      DELETE FROM dbo.detrendicion_proempleo
      WHERE fol_pro = :folio AND glo_detren = 'FICHA_PROYECTO'`, {
      type: QueryTypes.DELETE, replacements: { folio }, transaction,
    });
    for (const gasto of gastos) {
      await sequelize.query(`
        INSERT INTO dbo.proitemgas_proempleo (corr_itemGas, fol_pro, mon_proitemgas, obs_proitemgas)
        VALUES (:detalle, :folio, :monto, NULL)`, {
        type: QueryTypes.INSERT,
        replacements: { detalle: gasto.corr_itemGas, folio, monto: gasto.mon_proitemgas },
        transaction,
      });
      await sequelize.query(`
        INSERT INTO dbo.detrendicion_proempleo
          (mes_detren, ano_detren, fol_dec, fol_pro, mon_detren, che_detren,
           fac_detren, usu_cre, fec_cre, est_detren, corr_itemgas, egr_detren,
           glo_detren, cod_region)
        VALUES
          (:mes, :anio, '00000000', :folio, :montoGasto, 'FICHA_PROYECTO',
           0, :usuario, GETDATE(), 'ACTIVO', :detalle, 'FICHA',
           'FICHA_PROYECTO', :region)`, {
        type: QueryTypes.INSERT,
        replacements: {
          folio,
          detalle: gasto.corr_itemGas,
          montoGasto: gasto.compaGas,
          ...contexto,
        },
        transaction,
      });
    }
  },

  async eliminar(folio: number, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      UPDATE dbo.proyectos_proempleo SET est_pro = 'ELIMINADO', usu_eli = :usuario, fec_eli = GETDATE()
      WHERE fol_pro = :folio`, {
      type: QueryTypes.UPDATE, replacements: { folio, usuario }, transaction,
    });
  },

  async aniosProgramas(): Promise<number[]> {
    const rows = await sequelize.query<{ ano_mar: number }>(`
      WITH programas AS (${marcos})
      SELECT ano_mar FROM programas WHERE ano_mar IS NOT NULL AND est_mar = 'ACTIVO'
      GROUP BY ano_mar ORDER BY ano_mar DESC`, { type: QueryTypes.SELECT });
    return rows.map((row) => row.ano_mar);
  },

  intermediarios(comuna?: number): Promise<IntermediarioCatalogo[]> {
    return sequelize.query<IntermediarioCatalogo>(`
      SELECT rut_int, dig_int, nom_int, com_int FROM (${unionIntermediarios}) i
      WHERE (i.Est_int IS NULL OR RTRIM(i.Est_int) <> 'ELIMINADO')
      ${comuna === undefined ? '' : 'AND i.com_int = :comuna'}
      ORDER BY i.nom_int, i.rut_int`, { type: QueryTypes.SELECT, replacements: { comuna } });
  },

  ejecutores(comuna?: number): Promise<EjecutorCatalogo[]> {
    return sequelize.query<EjecutorCatalogo>(`
      SELECT rut_eje, dig_eje, nom_eje, com_eje FROM (${unionEjecutores}) e
      WHERE (e.Est_eje IS NULL OR RTRIM(e.Est_eje) <> 'ELIMINADO')
      ${comuna === undefined ? '' : 'AND e.com_eje = :comuna'}
      ORDER BY e.nom_eje, e.rut_eje`, { type: QueryTypes.SELECT, replacements: { comuna } });
  },

  responsables(comuna?: number): Promise<ResponsableCatalogo[]> {
    return sequelize.query<ResponsableCatalogo>(`
      SELECT rut_res, dig_res, nom_res, pat_res, mat_res, car_res, tel_res, ema_res, com_res, origen
      FROM (${unionResponsables}) r
      WHERE (r.Est_res IS NULL OR RTRIM(r.Est_res) <> 'ELIMINADO')
      ${comuna === undefined ? '' : 'AND r.com_res = :comuna'}
      ORDER BY r.nom_res, r.rut_res`, { type: QueryTypes.SELECT, replacements: { comuna } });
  },

  async existeIntermediario(rut: number, comuna?: number): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM (${unionIntermediarios}) i
      WHERE i.rut_int = :rut AND (i.Est_int IS NULL OR RTRIM(i.Est_int) <> 'ELIMINADO')
      ${comuna === undefined ? '' : 'AND i.com_int = :comuna'}`, {
      type: QueryTypes.SELECT, replacements: { rut, comuna },
    });
    return (rows[0]?.total ?? 0) > 0;
  },

  async existeEjecutor(rut: number, comuna?: number): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM (${unionEjecutores}) e
      WHERE e.rut_eje = :rut AND (e.Est_eje IS NULL OR RTRIM(e.Est_eje) <> 'ELIMINADO')
      ${comuna === undefined ? '' : 'AND e.com_eje = :comuna'}`, {
      type: QueryTypes.SELECT, replacements: { rut, comuna },
    });
    return (rows[0]?.total ?? 0) > 0;
  },

  async existeResponsable(rut: number, comuna?: number, transaction?: Transaction): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM (${unionResponsables}) r
      WHERE r.rut_res = :rut
      ${comuna === undefined ? '' : "AND r.com_res = :comuna AND (r.Est_res IS NULL OR RTRIM(r.Est_res) <> 'ELIMINADO')"}`, {
      type: QueryTypes.SELECT, replacements: { rut, comuna }, transaction,
    });
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

  async comunaValida(region: number, ciudad: number, comuna: number): Promise<boolean> {
    const rows = await sequelize.query<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM dbo.COMUNAS co JOIN dbo.CIUDADES ci ON ci.cod_ciu = co.cod_ciu
      WHERE co.cod_com = :comuna AND co.cod_ciu = :ciudad AND ci.cod_reg = :region`, {
      type: QueryTypes.SELECT, replacements: { region, ciudad, comuna },
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
