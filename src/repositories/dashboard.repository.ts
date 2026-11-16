import { QueryTypes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import type { DashboardQuery } from '../validations/dashboard.validation';

// Cada folio y cada asignación mensual se cuentan una vez; ProEmpleo prevalece
// sobre legacy cuando ambas fuentes contienen el mismo identificador.
const base = `WITH proyectosBase AS (
  SELECT fol_pro, nom_pro, reg_pro, com_pro, emp_pro, fecini_pro, fecter_pro, est_pro, 'legacy' origen FROM dbo.PROYECTOS
  UNION ALL
  SELECT fol_pro, nom_pro, reg_pro, com_pro, emp_pro, fecini_pro, fecter_pro, est_pro, 'proempleo' FROM dbo.proyectos_proempleo
), proyectosOrdenados AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY fol_pro ORDER BY CASE origen WHEN 'proempleo' THEN 0 ELSE 1 END) prioridad FROM proyectosBase
), proyectos AS (
  SELECT * FROM proyectosOrdenados WHERE prioridad = 1
    AND (est_pro IS NULL OR RTRIM(est_pro) <> 'ELIMINADO')
    AND (:region IS NULL OR reg_pro = :region) AND (:comuna IS NULL OR com_pro = :comuna)
), solicitudesBase AS (
  SELECT idProyecto, idBeneficiarioNuevo, status, fechaSolicitudReemplazo FROM dbo.Reemplazo_benpro
  UNION ALL
  SELECT idProyecto, idBeneficiarioNuevo, status, fechaSolicitudReemplazo FROM dbo.reemplazo_individual_proempleo
), solicitudes AS (
  SELECT s.* FROM solicitudesBase s JOIN proyectos p ON p.fol_pro = s.idProyecto
  WHERE s.fechaSolicitudReemplazo >= :desde AND s.fechaSolicitudReemplazo < :hasta
), asignacionesBase AS (
  SELECT fol_pro, rut_ben, ano_BenPro, mes_benpro, est_benpro, 'legacy' origen FROM dbo.BENPRO
  WHERE ano_BenPro = :anio AND mes_benpro = :mes
  UNION ALL
  SELECT fol_pro, rut_ben, ano_BenPro, mes_benpro, est_benpro, 'proempleo' FROM dbo.benpro_proempleo
  WHERE ano_BenPro = :anio AND mes_benpro = :mes
), asignacionesOrdenadas AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY fol_pro, rut_ben ORDER BY CASE origen WHEN 'proempleo' THEN 0 ELSE 1 END) prioridad FROM asignacionesBase
), asignaciones AS (
  SELECT a.* FROM asignacionesOrdenadas a JOIN proyectos p ON p.fol_pro = a.fol_pro
  WHERE a.prioridad = 1 AND (a.est_benpro IS NULL OR RTRIM(a.est_benpro) <> 'ELIMINADO')
), ocupacion AS (
  SELECT p.fol_pro, RTRIM(p.nom_pro) nombre, p.reg_pro, p.com_pro, p.origen,
    COALESCE(p.emp_pro, 0) capacidad, COUNT(a.rut_ben) ejecucion
  FROM proyectos p LEFT JOIN asignaciones a ON a.fol_pro = p.fol_pro
  WHERE p.fecini_pro < :hasta AND p.fecter_pro >= :desde
    AND (p.est_pro IS NULL OR RTRIM(p.est_pro) <> 'CERRADO')
  GROUP BY p.fol_pro, p.nom_pro, p.reg_pro, p.com_pro, p.origen, p.emp_pro
), cupos AS (
  SELECT *, CASE WHEN capacidad > ejecucion THEN capacidad - ejecucion ELSE 0 END disponibles FROM ocupacion
), beneficiariosOrdenados AS (
  SELECT rut_ben, status, statusFicha, est_ben,
    ROW_NUMBER() OVER (PARTITION BY rut_ben ORDER BY CASE origen WHEN 'proempleo' THEN 0 ELSE 1 END) prioridad
  FROM dbo.beneficiarios_consulta
), beneficiariosPeriodo AS (
  SELECT rut_ben FROM asignaciones
  UNION SELECT idBeneficiarioNuevo FROM solicitudes
)`;

export interface DashboardIndicadores {
  aprobadas: number; rechazadas: number; pendientes: number; resueltas: number;
  fichasIncompletas: number; proyectos: number; capacidad: number; ejecucion: number;
  cuposDisponibles: number; proyectosConVacantes: number;
}

export const dashboardRepository = {
  async opciones(region?: number, global = false) {
    const [regiones, comunas, anios] = await Promise.all([
      sequelize.query<{ codigo: number; nombre: string }>(`SELECT cod_region codigo, RTRIM(Nom_region) nombre
        FROM dbo.REGIONES WHERE (:region IS NULL OR cod_region = :region) ORDER BY cod_region`,
      { type: QueryTypes.SELECT, replacements: { region: global ? null : region ?? null } }),
      region === undefined ? Promise.resolve([]) : sequelize.query<{ codigo: number; nombre: string }>(`
        SELECT co.cod_com codigo, RTRIM(co.nom_com) nombre FROM dbo.COMUNAS co
        JOIN dbo.CIUDADES ci ON ci.cod_ciu = co.cod_ciu WHERE ci.cod_reg = :region ORDER BY co.nom_com`,
      { type: QueryTypes.SELECT, replacements: { region } }),
      sequelize.query<{ anio: number }>(`WITH proyectos AS (
        SELECT fol_pro, reg_pro, ano_pro, fecini_pro, fecter_pro FROM dbo.PROYECTOS
        UNION ALL SELECT fol_pro, reg_pro, ano_pro, fecini_pro, fecter_pro FROM dbo.proyectos_proempleo
      ), solicitudes AS (
        SELECT idProyecto, fechaSolicitudReemplazo FROM dbo.Reemplazo_benpro
        UNION ALL SELECT idProyecto, fechaSolicitudReemplazo FROM dbo.reemplazo_individual_proempleo
      ), anios AS (
        SELECT ano_pro anio FROM proyectos WHERE (:region IS NULL OR reg_pro = :region)
        UNION SELECT YEAR(fecini_pro) FROM proyectos WHERE (:region IS NULL OR reg_pro = :region)
        UNION SELECT YEAR(fecter_pro) FROM proyectos WHERE (:region IS NULL OR reg_pro = :region)
        UNION SELECT YEAR(s.fechaSolicitudReemplazo) FROM solicitudes s JOIN proyectos p ON p.fol_pro = s.idProyecto
          WHERE (:region IS NULL OR p.reg_pro = :region)
      ) SELECT anio FROM anios WHERE anio BETWEEN 1900 AND 3000 ORDER BY anio DESC`,
      { type: QueryTypes.SELECT, replacements: { region: region ?? null } }),
    ]);
    return { regiones, comunas, anios: anios.map((a) => a.anio) };
  },

  async obtener(query: DashboardQuery) {
    const { anio, mes, region, comuna, page } = query;
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const hasta = `${mes === 12 ? anio + 1 : anio}-${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}-01`;
    const replacements = { anio, mes, region: region ?? null, comuna: comuna ?? null, desde, hasta };
    const [indicadores] = await sequelize.query<DashboardIndicadores>(`${base}
      SELECT
        (SELECT COUNT(*) FROM solicitudes WHERE status = 'aprobado') aprobadas,
        (SELECT COUNT(*) FROM solicitudes WHERE status = 'rechazado') rechazadas,
        (SELECT COUNT(*) FROM solicitudes WHERE status IN ('pendiente','enRevision','revisado','preAprobado')) pendientes,
        (SELECT COUNT(*) FROM solicitudes WHERE status IN ('aprobado','rechazado')) resueltas,
        (SELECT COUNT(*) FROM beneficiariosOrdenados b JOIN beneficiariosPeriodo bp ON bp.rut_ben = b.rut_ben
          WHERE b.prioridad = 1 AND b.status > 0 AND b.statusFicha = 1
          AND (b.est_ben IS NULL OR RTRIM(b.est_ben) <> 'ELIMINADO')) fichasIncompletas,
        (SELECT COUNT(*) FROM cupos) proyectos,
        (SELECT COALESCE(SUM(CAST(capacidad AS BIGINT)), 0) FROM cupos) capacidad,
        (SELECT COALESCE(SUM(CAST(ejecucion AS BIGINT)), 0) FROM cupos) ejecucion,
        (SELECT COALESCE(SUM(CAST(disponibles AS BIGINT)), 0) FROM cupos) cuposDisponibles,
        (SELECT COUNT(*) FROM cupos WHERE disponibles > 0) proyectosConVacantes`,
    { type: QueryTypes.SELECT, replacements });
    const total = Number(indicadores.proyectosConVacantes);
    indicadores.capacidad = Number(indicadores.capacidad);
    indicadores.ejecucion = Number(indicadores.ejecucion);
    indicadores.cuposDisponibles = Number(indicadores.cuposDisponibles);
    const totalPages = Math.max(1, Math.ceil(total / 10));
    const pagina = Math.min(page, totalPages);
    const proyectos = await sequelize.query<{
      fol_pro: number; nombre: string; origen: 'legacy' | 'proempleo'; region: string | null;
      comuna: string | null; capacidad: number; ejecucion: number; disponibles: number;
    }>(`${base}, numerados AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY disponibles DESC, fol_pro) fila FROM cupos WHERE disponibles > 0
    ) SELECT p.fol_pro, p.nombre, p.origen, r.Nom_region region, c.nom_com comuna,
      p.capacidad, p.ejecucion, p.disponibles
      FROM numerados p LEFT JOIN dbo.REGIONES r ON r.cod_region = p.reg_pro
      LEFT JOIN dbo.COMUNAS c ON c.cod_com = p.com_pro
      WHERE fila BETWEEN :primero AND :ultimo ORDER BY fila`, {
      type: QueryTypes.SELECT, replacements: { ...replacements, primero: (pagina - 1) * 10 + 1, ultimo: pagina * 10 },
    });
    return { indicadores, proyectos, pagination: { page: pagina, total, totalPages, limit: 10 } };
  },
};
