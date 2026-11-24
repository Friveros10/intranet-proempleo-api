import { QueryTypes, type Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import { TransferenciasModel } from "../models/Transferencias.model";
import { TransferenciasProempleoModel } from "../models/TransferenciasProempleo.model";
import type {
  FiltrosTransferencias,
  RegistrarTransferenciaInput,
} from "../validations/transferencias.validation";
import { ordinariosUnificados } from "./ordinarios.repository";

const tablaNueva = `dbo.${TransferenciasProempleoModel.tableName}`;
const columnas =
  "ordinario, folio, correlativo, monto, estado, fol_dec, fec_trans";
const transferencias = `
  SELECT ${columnas}, 'legacy' origen FROM dbo.${TransferenciasModel.tableName}
  UNION ALL SELECT ${columnas}, 'proempleo' FROM ${tablaNueva}
`;
const asociaciones = `
  SELECT fol_dec, fol_pro, est_decpro FROM dbo.DECPRO
  UNION ALL SELECT fol_dec, fol_pro, est_decpro FROM dbo.decpro_proempleo
`;
const datosProyecto = `
  SELECT fol_pro, nom_pro, com_pro, emp_pro, mon_pro, ano_pro, mes_pro, est_pro, 1 prioridad FROM dbo.PROYECTOS
  UNION ALL SELECT fol_pro, nom_pro, com_pro, emp_pro, mon_pro, ano_pro, mes_pro, est_pro, 0 FROM dbo.proyectos_proempleo
`;
type Decreto = {
  fol_dec: string;
  obs_dec: string | null;
  mon_dec: string;
  origen: string;
};
type Proyecto = {
  folio: number;
  nombre: string;
  comuna: string | null;
  beneficiarios: number | null;
  decretado: string;
  transferido: string;
  saldo: string;
};
type TransferenciaListado = Omit<Proyecto, "decretado" | "saldo"> & {
  decretado: string | null;
  saldo: string | null;
  monto: string;
  decreto: string | null;
  origen: string;
  correlativo: number;
  fecha: string | null;
};
const baseProyectos = `
    WITH asociaciones AS (${asociaciones}), asociados AS (
      SELECT DISTINCT fol_pro
      FROM asociaciones WHERE fol_dec = :decreto AND ISNULL(est_decpro, '') <> 'ELIMINADO'
        AND (:folio IS NULL OR fol_pro = :folio)
    ), proyectos AS (${datosProyecto}), transferencias AS (${transferencias}), totales AS (
      SELECT t.folio, SUM(CAST(t.monto AS DECIMAL(38,0))) transferido
      FROM transferencias t INNER JOIN asociados a ON a.fol_pro = t.folio
      WHERE ISNULL(t.estado, '') <> 'ELIMINADO'
      GROUP BY t.folio
    ), datos AS (
    SELECT a.fol_pro folio, RTRIM(p.nom_pro) nombre, RTRIM(c.nom_com) comuna, p.emp_pro beneficiarios,
      p.ano_pro anio, p.mes_pro mes,
      CONVERT(VARCHAR(40), p.montoProyecto) decretado,
      CONVERT(VARCHAR(40), ISNULL(t.transferido, 0)) transferido,
      CONVERT(VARCHAR(40), p.montoProyecto - ISNULL(t.transferido, 0)) saldo
    FROM asociados a
    CROSS APPLY (
      SELECT TOP (1) nom_pro, com_pro, emp_pro, ano_pro, mes_pro,
        CAST(ISNULL(mon_pro, 0) AS DECIMAL(38,0)) montoProyecto
      FROM proyectos
      WHERE fol_pro = a.fol_pro AND ISNULL(est_pro, '') <> 'ELIMINADO' ORDER BY prioridad
    ) p
    LEFT JOIN dbo.COMUNAS c ON c.cod_com = p.com_pro
    LEFT JOIN totales t ON t.folio = a.fol_pro
    )`;

const baseTransferencias = `
    WITH ordinarios AS (${ordinariosUnificados}),
    proyectos AS (${datosProyecto}), transferencias AS (${transferencias}),
    propias AS (
      SELECT t.*, COALESCE(t.fec_trans, o.fecha_pago) fechaEfectiva
      FROM transferencias t
      LEFT JOIN ordinarios o ON o.ordinario = t.ordinario
      WHERE t.ordinario = :ordinario AND ISNULL(t.estado, '') <> 'ELIMINADO'
    ), totales AS (
      SELECT t.folio, SUM(CAST(t.monto AS DECIMAL(38,0))) transferido
      FROM transferencias t
      WHERE ISNULL(t.estado, '') <> 'ELIMINADO'
        AND EXISTS (SELECT 1 FROM propias p WHERE p.folio = t.folio)
      GROUP BY t.folio
    ), datos AS (
      SELECT t.folio, RTRIM(p.nom_pro) nombre, RTRIM(c.nom_com) comuna, p.emp_pro beneficiarios,
        YEAR(t.fechaEfectiva) anio, MONTH(t.fechaEfectiva) mes, CONVERT(CHAR(10), t.fechaEfectiva, 23) fecha,
        t.origen, t.correlativo, RTRIM(t.fol_dec) decreto,
        CONVERT(VARCHAR(40), p.montoProyecto) decretado, CONVERT(VARCHAR(40), ISNULL(s.transferido, 0)) transferido,
        CONVERT(VARCHAR(40), t.monto) monto,
        CONVERT(VARCHAR(40), p.montoProyecto - ISNULL(s.transferido, 0)) saldo
      FROM propias t
      OUTER APPLY (
        SELECT TOP (1) nom_pro, com_pro, emp_pro,
          CAST(ISNULL(mon_pro, 0) AS DECIMAL(38,0)) montoProyecto
        FROM proyectos
        WHERE fol_pro = t.folio
        ORDER BY CASE WHEN est_pro = 'ELIMINADO' THEN 1 ELSE 0 END, prioridad
      ) p
      LEFT JOIN dbo.COMUNAS c ON c.cod_com = p.com_pro
      LEFT JOIN totales s ON s.folio = t.folio
    )`;

async function paginar<T extends object>(
  base: string,
  orden: string,
  filtros: FiltrosTransferencias,
  alcance: Record<string, string | null>,
) {
  const { page, folio, comuna, anio, mes } = filtros;
  const limit = 20;
  const rows = await sequelize.query<
    T & {
      fila: number | null;
      total: number;
      pagina: number;
      totalPages: number;
      comunas: string;
      anios: string;
    }
  >(
    `
    ${base}, filtrados AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY ${orden}) fila FROM datos
      WHERE (:patron = '' OR CONVERT(VARCHAR(20), folio) LIKE :patron)
        AND (:comuna = '' OR comuna = :comuna)
        AND (:anio IS NULL OR anio = :anio)
        AND (:mes IS NULL OR mes = :mes)
    ), totalesPagina AS (
      SELECT COUNT(*) total, CASE WHEN COUNT(*) = 0 THEN 1 ELSE (COUNT(*) - 1) / :limit + 1 END totalPages
      FROM filtrados
    ), meta AS (
      SELECT *, CASE WHEN :page > totalPages THEN totalPages ELSE :page END pagina FROM totalesPagina
    ), opciones AS (
      SELECT
        (SELECT DISTINCT comuna FROM datos WHERE NULLIF(comuna, '') IS NOT NULL ORDER BY comuna FOR JSON PATH) comunas,
        (SELECT DISTINCT anio FROM datos WHERE anio > 0 ORDER BY anio DESC FOR JSON PATH) anios
    )
    SELECT f.*, m.total, m.pagina, m.totalPages, o.comunas, o.anios
    FROM meta m CROSS JOIN opciones o LEFT JOIN filtrados f
      ON f.fila BETWEEN (m.pagina - 1) * :limit + 1 AND m.pagina * :limit
    ORDER BY f.fila
  `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        ...alcance,
        page,
        limit,
        comuna,
        anio: anio ?? null,
        mes: mes ?? null,
        patron: folio ? `%${folio}%` : "",
      },
    },
  );
  const meta = rows[0];
  return {
    data: rows
      .filter((row) => row.fila !== null)
      .map(
        ({ fila, total, pagina, totalPages, comunas, anios, ...data }) => data,
      ),
    pagination: {
      page: meta.pagina,
      limit,
      total: meta.total,
      totalPages: meta.totalPages,
    },
    comunas: (JSON.parse(meta.comunas || "[]") as { comuna: string }[]).map(
      (row) => row.comuna,
    ),
    anios: (JSON.parse(meta.anios || "[]") as { anio: number }[]).map(
      (row) => row.anio,
    ),
  };
}

export const transferenciasRepository = {
  async decretosDelOrdinario(ordinario: string) {
    const decretos = await sequelize.query<{ fol_dec: string }>(
      `
      WITH transferencias AS (${transferencias})
      SELECT DISTINCT RTRIM(fol_dec) fol_dec FROM transferencias
      WHERE ordinario = :ordinario AND NULLIF(RTRIM(fol_dec), '') IS NOT NULL
        AND ISNULL(estado, '') <> 'ELIMINADO'
      ORDER BY fol_dec
    `,
      { replacements: { ordinario }, type: QueryTypes.SELECT },
    );
    return decretos.map(({ fol_dec }) => fol_dec);
  },

  async buscarDecreto(decreto: string, transaction?: Transaction) {
    return sequelize.query<Decreto>(
      `
      WITH decretos AS (
        SELECT fol_dec, obs_dec, mon_dec, est_dec, 'legacy' origen FROM dbo.DECRETOS
        UNION ALL SELECT fol_dec, obs_dec, mon_dec, est_dec, 'proempleo' FROM dbo.decretos_proempleo
      )
      SELECT RTRIM(fol_dec) fol_dec, obs_dec, CONVERT(VARCHAR(40), mon_dec) mon_dec, origen
      FROM decretos WHERE fol_dec = :decreto AND ISNULL(est_dec, '') <> 'ELIMINADO'
      ORDER BY origen DESC
    `,
      { replacements: { decreto }, type: QueryTypes.SELECT, transaction },
    );
  },

  proyectos(decreto: string, filtros: FiltrosTransferencias) {
    return paginar<Proyecto>(baseProyectos, "folio", filtros, {
      decreto,
      folio: null,
    });
  },

  realizadas(ordinario: string, filtros: FiltrosTransferencias) {
    return paginar<TransferenciaListado>(
      baseTransferencias,
      "fecha DESC, folio, correlativo DESC, origen, decreto",
      filtros,
      { ordinario },
    );
  },

  async obtenerProyecto(
    decreto: string,
    folio: number,
    transaction: Transaction,
  ) {
    const [proyecto] = await sequelize.query<Proyecto>(
      `${baseProyectos} SELECT * FROM datos`,
      {
        replacements: { decreto, folio },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    return proyecto ?? null;
  },

  async bloquearProyecto(folio: number, transaction: Transaction) {
    // Serializa los abonos de un proyecto a través de todos sus ordinarios.
    const [lock] = await sequelize.query<{ resultado: number }>(
      `
      DECLARE @resultado INT;
      EXEC @resultado = sys.sp_getapplock @Resource = :recurso, @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 5000;
      SELECT @resultado resultado;
    `,
      {
        replacements: { recurso: `transferencias:proyecto:${folio}` },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    return Boolean(lock && lock.resultado >= 0);
  },

  async registrar(
    ordinario: string,
    data: RegistrarTransferenciaInput,
    fechaPago: string | null,
    usuario: string,
    transaction: Transaction,
  ) {
    await sequelize.query(
      `
      WITH transferencias AS (${transferencias})
      INSERT INTO ${tablaNueva}
        (ordinario, folio, correlativo, monto, estado, ingreso, ultimo_usuario, ultima_actualizacion, fec_trans, fol_dec)
      SELECT :ordinario, :folio, ISNULL(MAX(CONVERT(INT, correlativo)), 0) + 1, :monto,
        'VIGENTE', GETDATE(), :usuario, GETDATE(), CONVERT(DATE, :fechaPago, 23), :decreto
      FROM transferencias WHERE ordinario = :ordinario AND folio = :folio
    `,
      { replacements: { ...data, ordinario, usuario, fechaPago }, transaction },
    );
  },
};
