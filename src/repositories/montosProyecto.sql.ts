import { QueryTypes, type Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";

const marcaPresupuesto = "PRESUPUESTO_PROYECTO";
export const marcaAcumulado = "GASTOS_PROEMPLEO";
export const marcaAsiento = "PROITEMGAS";

// Los movimientos nuevos tienen un asiento en DETRENDICION para el listado.
// El saldo los toma del acumulado y excluye su asiento para evitar duplicarlos.
export const montosProyectoSql = `
  WITH movimientos AS (
    SELECT corr_itemgas item, CAST(mon_detren AS DECIMAL(38,0)) monto, 'rendicion' tipo
      FROM dbo.DETRENDICION WHERE fol_pro = :folio AND ISNULL(est_detren, '') <> 'ELIMINADO'
    UNION ALL
    SELECT corr_itemGas, CAST(mon_proitemgas AS DECIMAL(38,0)), 'presupuesto_anterior'
      FROM dbo.PROITEMGAS WHERE fol_pro = :folio AND :origen = 'legacy'
    UNION ALL
    SELECT corr_itemgas, CAST(mon_detren AS DECIMAL(38,0)),
      CASE
        WHEN fol_dec = '00000000' AND glo_detren = '${marcaPresupuesto}' THEN 'presupuesto'
        WHEN fol_dec = '00000000' AND glo_detren = 'FICHA_PROYECTO' THEN 'manual_anterior'
        WHEN EstApr_detren = '${marcaAsiento}' THEN 'asiento'
        ELSE 'rendicion'
      END
      FROM dbo.detrendicion_proempleo WHERE fol_pro = :folio AND ISNULL(est_detren, '') <> 'ELIMINADO'
    UNION ALL
    SELECT corr_itemGas, CAST(mon_proitemgas AS DECIMAL(38,0)),
      CASE WHEN obs_proitemgas = '${marcaAcumulado}' THEN 'acumulado' ELSE 'presupuesto_anterior' END
      FROM dbo.proitemgas_proempleo WHERE fol_pro = :folio
  ), totales AS (
    SELECT item,
      SUM(CASE WHEN tipo = 'presupuesto' THEN monto END) presupuestoNuevo,
      SUM(CASE WHEN tipo = 'presupuesto_anterior' THEN monto ELSE 0 END) presupuestoAnterior,
      SUM(CASE WHEN tipo = 'acumulado' THEN monto END) acumulado,
      SUM(CASE WHEN tipo = 'manual_anterior' THEN monto ELSE 0 END) manualAnterior,
      SUM(CASE WHEN tipo = 'rendicion' THEN monto ELSE 0 END) rendidoAnterior,
      SUM(CASE WHEN tipo IN ('rendicion', 'asiento') THEN monto ELSE 0 END) rendido
    FROM movimientos WHERE item IS NOT NULL GROUP BY item
  ), montos AS (
    SELECT item, presupuestoNuevo, COALESCE(presupuestoNuevo, presupuestoAnterior) presupuesto,
      COALESCE(acumulado, manualAnterior) acumulado,
      rendidoAnterior, rendido, COALESCE(acumulado, manualAnterior) + rendidoAnterior gastado
    FROM totales
  )`;

type Partida = { folio: number; item: number; monto: string };

export async function guardarAcumulado(partida: Partida, transaction: Transaction) {
  await sequelize.query(`
    UPDATE dbo.proitemgas_proempleo SET mon_proitemgas = :monto, obs_proitemgas = :marca
    WHERE fol_pro = :folio AND corr_itemGas = :item;
    IF @@ROWCOUNT = 0
      INSERT INTO dbo.proitemgas_proempleo (corr_itemGas, fol_pro, mon_proitemgas, obs_proitemgas)
      VALUES (:item, :folio, :monto, :marca);
  `, { replacements: { ...partida, marca: marcaAcumulado }, transaction });
}

export async function guardarPresupuesto(
  partida: Partida & { mes: number; anio: number; region: number; usuario: string },
  transaction: Transaction,
) {
  await sequelize.query(`
    UPDATE dbo.detrendicion_proempleo
    SET mon_detren = :monto, mes_detren = :mes, ano_detren = :anio, cod_region = :region, usu_mod = :usuario
    WHERE fol_pro = :folio AND corr_itemgas = :item AND fol_dec = '00000000' AND glo_detren = :marca
      AND ISNULL(est_detren, '') <> 'ELIMINADO';
    IF @@ROWCOUNT = 0
      INSERT INTO dbo.detrendicion_proempleo
      (mes_detren, ano_detren, fol_dec, fol_pro, mon_detren, che_detren, fac_detren, usu_cre, fec_cre,
       est_detren, corr_itemgas, egr_detren, glo_detren, cod_region)
    VALUES (:mes, :anio, '00000000', :folio, :monto, 'FICHA_PROYECTO', 0, :usuario, GETDATE(),
            'ACTIVO', :item, 'FICHA', :marca, :region);
  `, { replacements: { ...partida, marca: marcaPresupuesto }, transaction });
}

export async function bloquearGastosProyecto(folio: number, transaction: Transaction) {
  const [lock] = await sequelize.query<{ resultado: number }>(`
    DECLARE @resultado INT;
    EXEC @resultado = sys.sp_getapplock @Resource = :recurso, @LockMode = 'Exclusive',
      @LockOwner = 'Transaction', @LockTimeout = 5000;
    SELECT @resultado resultado;
  `, { replacements: { recurso: `gastos:proyecto:${folio}` }, type: QueryTypes.SELECT, transaction });
  return Boolean(lock && lock.resultado >= 0);
}
