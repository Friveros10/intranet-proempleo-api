import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";
import type { OrigenMarco } from "../validations/marco.validation";
import type { GuardarProyectoInput } from "../validations/proyectos.validation";

export interface CoberturaProyectoDisponible {
  corr_ofi: number;
  ord_ofi: string;
  origen_cobertura: OrigenMarco;
  origen_oficio: OrigenMarco;
  ano_ofi: number;
  Mes_ofi: number;
  ben_ofi: number;
}

export const coberturaProyectoRepository = {
  proyectosEnPeriodo(data: GuardarProyectoInput, transaction: Transaction, coberturas: CoberturaProyectoDisponible[]) {
    // Solo consumen cupos los proyectos vinculados a la cobertura de este mes.
    // Los bloqueos de rango se mantienen hasta confirmar proyecto y asociaciones,
    // para que dos creaciones concurrentes no consuman los mismos cupos.
    if (!coberturas.length) return Promise.resolve([]);
    const vinculos: Record<string, string | number> = {};
    const condiciones = coberturas.map((c, i) => {
      vinculos[`corr${i}`] = c.corr_ofi;
      vinculos[`cobertura${i}`] = c.origen_cobertura;
      vinculos[`oficio${i}`] = c.ord_ofi;
      vinculos[`origenOficio${i}`] = c.origen_oficio;
      return `(cp.corr_ofi = :corr${i} AND cp.origen_cobertura = :cobertura${i}
        AND cp.ord_ofi = :oficio${i} AND cp.origen_oficio = :origenOficio${i})`;
    });
    return sequelize.query<{ desde: number; hasta: number; beneficiarios: number }>(`
      WITH proyectos AS (
        SELECT fol_pro, reg_pro, com_pro, fecini_pro, fecter_pro, emp_pro, est_pro,
          'legacy' origen FROM dbo.PROYECTOS WITH (HOLDLOCK)
        UNION ALL
        SELECT fol_pro, reg_pro, com_pro, fecini_pro, fecter_pro, emp_pro, est_pro,
          'proempleo' FROM dbo.proyectos_proempleo WITH (UPDLOCK, HOLDLOCK)
      )
      SELECT YEAR(fecini_pro) * 100 + MONTH(fecini_pro) desde,
        YEAR(fecter_pro) * 100 + MONTH(fecter_pro) hasta,
        COALESCE(emp_pro, 0) beneficiarios
      FROM proyectos p
      WHERE reg_pro = :region AND com_pro = :comuna
        AND (est_pro IS NULL OR RTRIM(est_pro) <> 'ELIMINADO')
        AND NOT (origen = 'proempleo' AND fol_pro = :folio)
        AND EXISTS (
          SELECT 1 FROM dbo.coberturaProyecto cp WITH (UPDLOCK, HOLDLOCK)
          WHERE cp.fol_pro = p.fol_pro AND cp.origen_proyecto = p.origen
            AND (${condiciones.join(' OR ')})
        )
        AND YEAR(fecini_pro) * 100 + MONTH(fecini_pro) <= :hasta
        AND YEAR(fecter_pro) * 100 + MONTH(fecter_pro) >= :desde`, {
      type: QueryTypes.SELECT,
      replacements: {
        ...vinculos,
        region: data.reg_pro, comuna: data.com_pro, folio: data.fol_pro,
        desde: Number(data.fecini_pro.slice(0, 7).replace('-', '')),
        hasta: Number(data.fecter_pro.slice(0, 7).replace('-', '')),
      }, transaction,
    });
  },

  async nombreComuna(comuna: number, ciudad: number, transaction: Transaction) {
    const rows = await sequelize.query<{ nombre: string | null }>(
      `SELECT RTRIM(nom_com) AS nombre FROM dbo.COMUNAS
       WHERE cod_com = :comuna AND cod_ciu = :ciudad`,
      { type: QueryTypes.SELECT, replacements: { comuna, ciudad }, transaction },
    );
    return rows[0]?.nombre?.trim() || 'seleccionada';
  },

  disponibles(data: GuardarProyectoInput, transaction: Transaction) {
    return sequelize.query<CoberturaProyectoDisponible>(
      `
      WITH oficios AS (
        SELECT RTRIM(ord_ofi) ord_ofi, fec_ofi, 'legacy' origen_oficio FROM dbo.ORDOFICOB WITH (HOLDLOCK)
        UNION ALL
        SELECT RTRIM(ord_ofi), fec_ofi, 'proempleo' FROM dbo.ordOficob_proempleo WITH (HOLDLOCK)
      ), coberturas AS (
        SELECT corr_ofi, RTRIM(ord_ofi) ord_ofi, ano_ofi, Mes_ofi, ben_ofi, cod_reg, cod_com,
          'legacy' origen_cobertura FROM dbo.OFICIOCOB WITH (HOLDLOCK)
        UNION ALL
        SELECT corr_ofi, RTRIM(ord_ofi), ano_ofi, Mes_ofi, ben_ofi, cod_reg, cod_com,
          'proempleo' FROM dbo.oficiocob_proempleo WITH (HOLDLOCK)
      ), vigentes AS (
        SELECT c.*, o.origen_oficio,
          DENSE_RANK() OVER (PARTITION BY c.ano_ofi, c.Mes_ofi
            ORDER BY o.fec_ofi DESC, o.ord_ofi DESC, o.origen_oficio DESC) prioridad
        FROM coberturas c JOIN oficios o ON o.ord_ofi = c.ord_ofi
        WHERE c.cod_reg = :region AND c.cod_com = :comuna
          AND c.ano_ofi * 100 + c.Mes_ofi BETWEEN :desde AND :hasta
      )
      SELECT corr_ofi, ord_ofi, origen_cobertura, origen_oficio, ano_ofi, Mes_ofi, ben_ofi
      FROM vigentes WHERE prioridad = 1`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          region: data.reg_pro,
          comuna: data.com_pro,
          desde: Number(data.fecini_pro.slice(0, 7).replace("-", "")),
          hasta: Number(data.fecter_pro.slice(0, 7).replace("-", "")),
        },
        transaction,
      },
    );
  },

  async reemplazar(
    folio: number,
    origen: OrigenMarco,
    coberturas: CoberturaProyectoDisponible[],
    usuario: string,
    transaction: Transaction,
  ) {
    await sequelize.query(
      `DELETE FROM dbo.coberturaProyecto
      WHERE fol_pro = :folio AND origen_proyecto = :origen`,
      {
        replacements: { folio, origen },
        transaction,
      },
    );
    for (const cobertura of coberturas) {
      await sequelize.query(
        `INSERT INTO dbo.coberturaProyecto
        (fol_pro, origen_proyecto, corr_ofi, origen_cobertura, ord_ofi, origen_oficio, usu_cre, fec_cre)
        VALUES (:folio, :origen, :corr_ofi, :origen_cobertura, :ord_ofi, :origen_oficio, :usuario, GETDATE())`,
        {
          replacements: { ...cobertura, folio, origen, usuario },
          transaction,
        },
      );
    }
  },
};
