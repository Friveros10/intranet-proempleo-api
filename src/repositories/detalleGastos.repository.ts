import { QueryTypes, type Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import { DetRendicionModel } from "../models/DetRendicion.model";
import { DetRendicionProempleoModel } from "../models/DetRendicionProempleo.model";
import type {
  CrearDetalleGastoInput,
  ListarDetalleGastosQuery,
} from "../validations/detalleGastos.validation";

type ProyectoGasto = {
  folio: number;
  nombre: string;
  region: number;
  nombreRegion: string | null;
  marco: number;
  origen: "legacy" | "proempleo";
};
type ItemGasto = { id: number; nombre: string | null };
type GastoListado = {
  correlativo: number;
  folio: number;
  item: number | null;
  monto: string;
  cheque: string | null;
  factura: string | null;
  egreso: string | null;
  glosa: string | null;
  region: number | null;
  nombreRegion: string | null;
  origen: "legacy" | "proempleo";
};
const tablaNueva = `dbo.${DetRendicionProempleoModel.tableName}`;
const columnas = `corr_detren, mes_detren, ano_detren, fol_dec, fol_pro, mon_detren,
  che_detren, fac_detren, egr_detren, glo_detren, cod_region, corr_itemgas, est_detren`;

export const detalleGastosRepository = {
  async listar({ decreto, anio, mes, page }: ListarDetalleGastosQuery) {
    const limit = 20;
    const rows = await sequelize.query<
      GastoListado & {
        fila: number | null;
        total: number;
        totalPages: number;
        pagina: number;
      }
    >(
      `
      WITH gastos AS (
        SELECT ${columnas}, 'legacy' origen FROM dbo.${DetRendicionModel.tableName}
        UNION ALL SELECT ${columnas}, 'proempleo' FROM ${tablaNueva}
      ), filtrados AS (
        SELECT corr_detren correlativo, fol_pro folio, corr_itemgas item, RTRIM(che_detren) cheque,
          CONVERT(VARCHAR(40), fac_detren) factura, RTRIM(egr_detren) egreso,
          CONVERT(VARCHAR(40), mon_detren) monto, RTRIM(glo_detren) glosa, cod_region region, origen,
          ROW_NUMBER() OVER (ORDER BY corr_detren DESC, origen) fila
        FROM gastos WHERE fol_dec = :decreto AND ano_detren = :anio AND mes_detren = :mes
          AND ISNULL(est_detren, '') <> 'ELIMINADO'
      ), totales AS (
        SELECT COUNT(*) total,
          CASE WHEN COUNT(*) = 0 THEN 1 ELSE (COUNT(*) - 1) / :limit + 1 END totalPages
        FROM filtrados
      ), meta AS (
        SELECT *, CASE WHEN :page > totalPages THEN totalPages ELSE :page END pagina FROM totales
      )
      SELECT f.*, RTRIM(r.Nom_region) nombreRegion, m.total, m.totalPages, m.pagina
      FROM meta m LEFT JOIN filtrados f
        ON f.fila BETWEEN (m.pagina - 1) * :limit + 1 AND m.pagina * :limit
      LEFT JOIN dbo.REGIONES r ON r.cod_region = f.region
      ORDER BY f.fila
    `,
      {
        type: QueryTypes.SELECT,
        replacements: { decreto, anio, mes, page, limit },
      },
    );
    const meta = rows[0];
    return {
      data: rows
        .filter((row) => row.fila !== null)
        .map(({ fila, total, totalPages, pagina, ...gasto }) => gasto),
      pagination: {
        page: meta.pagina,
        total: meta.total,
        totalPages: meta.totalPages,
        limit,
      },
    };
  },

  async buscarProyecto(
    decreto: string,
    folio: number,
    transaction?: Transaction,
  ) {
    const [proyecto] = await sequelize.query<ProyectoGasto>(
      `
      WITH proyectos AS (
        SELECT fol_pro, nom_pro, reg_pro, corr_mar, est_pro, 'legacy' origen FROM dbo.PROYECTOS WHERE fol_pro = :folio
        UNION ALL
        SELECT fol_pro, nom_pro, reg_pro, corr_mar, est_pro, 'proempleo' FROM dbo.proyectos_proempleo WHERE fol_pro = :folio
      ), asociaciones AS (
        SELECT fol_pro, est_decpro FROM dbo.DECPRO WHERE fol_dec = :decreto
        UNION ALL SELECT fol_pro, est_decpro FROM dbo.decpro_proempleo WHERE fol_dec = :decreto
      ), decretos AS (
        SELECT est_dec FROM dbo.DECRETOS WHERE fol_dec = :decreto
        UNION ALL SELECT est_dec FROM dbo.decretos_proempleo WHERE fol_dec = :decreto
      )
      SELECT TOP (1) p.fol_pro folio, RTRIM(p.nom_pro) nombre, p.reg_pro region,
        RTRIM(r.Nom_region) nombreRegion, p.corr_mar marco, p.origen
      FROM proyectos p LEFT JOIN dbo.REGIONES r ON r.cod_region = p.reg_pro
      WHERE ISNULL(p.est_pro, '') <> 'ELIMINADO'
        AND EXISTS (SELECT 1 FROM asociaciones a WHERE a.fol_pro = p.fol_pro AND ISNULL(a.est_decpro, '') <> 'ELIMINADO')
        AND EXISTS (SELECT 1 FROM decretos WHERE ISNULL(est_dec, '') <> 'ELIMINADO')
      ORDER BY p.origen DESC
    `,
      {
        type: QueryTypes.SELECT,
        replacements: { decreto, folio },
        transaction,
      },
    );
    return proyecto ?? null;
  },

  items(proyecto: ProyectoGasto, transaction?: Transaction) {
    const tabla =
      proyecto.origen === "proempleo" ? "proitemgas_proempleo" : "PROITEMGAS";
    return sequelize.query<ItemGasto>(
      `
      SELECT DISTINCT p.corr_itemGas id, RTRIM(i.nom_itemGas) nombre
      FROM dbo.${tabla} p
      OUTER APPLY (
        SELECT TOP (1) nom_itemGas FROM dbo.itemgastos_unificados
        WHERE corr_mar = :marco AND corr_itemGas = p.corr_itemGas
        ORDER BY nom_itemGas
      ) i
      WHERE p.fol_pro = :folio ORDER BY id
    `,
      {
        type: QueryTypes.SELECT,
        replacements: { folio: proyecto.folio, marco: proyecto.marco },
        transaction,
      },
    );
  },

  async crear(
    data: CrearDetalleGastoInput,
    region: number,
    usuario: string,
    transaction: Transaction,
  ) {
    const [gasto] = await sequelize.query<{ correlativo: number }>(
      `
      INSERT INTO ${tablaNueva} (mes_detren, ano_detren, fol_dec, fol_pro, mon_detren,
        che_detren, fac_detren, usu_cre, fec_cre, est_detren, corr_itemgas, egr_detren, glo_detren, cod_region)
      OUTPUT INSERTED.corr_detren correlativo
      VALUES (:mes, :anio, :decreto, :folio, :monto, :cheque, :factura, :usuario, GETDATE(),
        'ACTIVO', :item, :egreso, :glosa, :region)
    `,
      {
        type: QueryTypes.SELECT,
        replacements: { ...data, glosa: data.glosa || null, region, usuario },
        transaction,
      },
    );
    return gasto;
  },
};
