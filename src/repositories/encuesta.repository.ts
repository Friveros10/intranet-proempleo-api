import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';

export interface PreguntaEncuesta { id: number; pregunta: string; seccion: number; tipo: string; orden: number; obligatoria: boolean }
export interface ContextoEncuesta { region: string; comuna: string; regionId: number; comunaId: number; ejecutor: string; rut_ejecutor: string; folio: number }

export function listarPreguntas(transaction?: Transaction): Promise<PreguntaEncuesta[]> {
  return sequelize.query<PreguntaEncuesta>('SELECT id, pregunta, seccion, tipo, orden, obligatoria FROM dbo.preguntas WHERE NOT (seccion = 1 AND orden = 4) ORDER BY seccion, orden', { type: QueryTypes.SELECT, transaction });
}

export async function buscarBeneficiario(cuerpo: number, dv: string, transaction?: Transaction): Promise<ContextoEncuesta[]> {
  // Mismos INNER JOIN y universo de la consulta entregada; sólo se devuelve
  // el contexto necesario para la encuesta pública, sin datos personales.
  return sequelize.query<ContextoEncuesta>(`
    SELECT DISTINCT RTRIM(r.Nom_region) AS region, RTRIM(c.nom_com) AS comuna,
      r.cod_region AS regionId, c.cod_com AS comunaId,
      CONVERT(VARCHAR(8), e.rut_eje) + '-' + UPPER(LTRIM(RTRIM(e.dig_eje))) AS rut_ejecutor,
      RTRIM(e.nom_eje) AS ejecutor, bp.fol_pro AS folio
    FROM (
      SELECT rut_ben, com_ben, fol_pro FROM dbo.BENPRO WHERE ano_BenPro = :ano AND mes_benpro = :mes AND rut_ben = :cuerpo
      UNION
      SELECT rut_ben, com_ben, fol_pro FROM dbo.BENPROdup WHERE ano_BenPro = :ano AND mes_benpro = :mes AND rut_ben = :cuerpo
    ) bp
    INNER JOIN dbo.BENEFICIARIOS b ON bp.rut_ben = b.rut_ben
    INNER JOIN dbo.COMUNAS c ON bp.com_ben = c.cod_com
    INNER JOIN dbo.REGIONES r ON FLOOR(bp.com_ben / 1000) = r.cod_region
    INNER JOIN dbo.PROYECTOS p ON bp.fol_pro = p.fol_pro
    INNER JOIN dbo.EJECUTORES e ON p.ruteje_pro = e.rut_eje
    INNER JOIN dbo.MARCO m ON p.corr_mar = m.corr_mar
    WHERE UPPER(RTRIM(b.dig_ben)) = :dv
    ORDER BY ejecutor, comuna, folio`, {
    replacements: { cuerpo, dv, ano: 2026, mes: 10 }, type: QueryTypes.SELECT, transaction,
  });
}

export async function yaRespondio(rut: string, transaction?: Transaction): Promise<boolean> {
  const rows = await sequelize.query(`SELECT TOP 1 id FROM dbo.respuestas WHERE rut_ben = :rut`, {
    replacements: { rut }, type: QueryTypes.SELECT, transaction,
  });
  return rows.length > 0;
}

export async function bloquearEnvio(rut: string, transaction: Transaction): Promise<void> {
  // Sin PK/índices únicos: el bloqueo de aplicación serializa envíos del mismo RUT.
  await sequelize.query(`DECLARE @resultado INT;
    EXEC @resultado = sys.sp_getapplock @Resource = :recurso, @LockMode = 'Exclusive',
      @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @resultado < 0 THROW 50001, 'No se pudo bloquear el envío de la encuesta', 1;`, {
    replacements: { recurso: `encuesta-2026:${rut}` }, transaction,
  });
}

export async function insertarRespuesta(rut: string, pregunta: number, respuesta: string, transaction: Transaction, contexto: Pick<ContextoEncuesta, 'regionId' | 'comunaId' | 'rut_ejecutor'>): Promise<void> {
  await sequelize.query(`INSERT INTO dbo.respuestas (rut_ben, Preguntas_id, respuestas, regionId, comunaId, rut_ejecutor)
    VALUES (:rut, :pregunta, :respuesta, :regionId, :comunaId, :rut_ejecutor)`, {
    replacements: { rut, pregunta, respuesta, regionId: contexto.regionId, comunaId: contexto.comunaId, rut_ejecutor: contexto.rut_ejecutor }, transaction,
  });
}
