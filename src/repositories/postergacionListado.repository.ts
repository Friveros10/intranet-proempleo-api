import { QueryTypes, type Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";

const vinculos = `
  SELECT fol_dec, fol_pro, est_decpro FROM dbo.DECPRO
  UNION ALL
  SELECT fol_dec, fol_pro, est_decpro FROM dbo.decpro_proempleo
`;
const activo = "(est_decpro IS NULL OR RTRIM(est_decpro) <> 'ELIMINADO')";

type Postergacion = {
  folio: string;
  mes: number;
  anio: number;
  fecha: string;
  observacion: string;
};

export function plazoOrdinario(anio: number, mes: number) {
  return new Date(Date.UTC(anio, mes, 15)).toISOString().slice(0, 10);
}

export const postergacionListadoRepository = {
  async buscarDecreto(folio: string) {
    const [decreto] = await sequelize.query<{
      folio: string;
      obs_dec: string | null;
      mon_dec: string | null;
    }>(
      `
      SELECT TOP (1) RTRIM(d.fol_dec) AS folio, d.obs_dec, CONVERT(varchar(50), d.mon_dec) AS mon_dec
      FROM (
        SELECT fol_dec, CAST(obs_dec AS nvarchar(max)) AS obs_dec, mon_dec, 0 AS prioridad FROM dbo.decretos_proempleo
        UNION ALL
        SELECT fol_dec, CAST(obs_dec AS nvarchar(max)), mon_dec, 1 FROM dbo.DECRETOS
      ) d
      WHERE d.fol_dec = :folio
        AND EXISTS (SELECT 1 FROM (${vinculos}) v WHERE v.fol_dec = d.fol_dec AND ${activo})
      ORDER BY d.prioridad
    `,
      { replacements: { folio }, type: QueryTypes.SELECT },
    );
    return decreto ?? null;
  },

  async listar(paginaSolicitada: number, folio?: string) {
    const limit = 10;
    const filtro = "WHERE :folio IS NULL OR CHARINDEX(:folio, fol_dec) = 1";
    const replacements = { folio: folio ?? null };
    const [conteo] = await sequelize.query<{ total: number }>(
      `
      SELECT COUNT(*) AS total FROM dbo.benpropos_consulta ${filtro}
    `,
      { replacements, type: QueryTypes.SELECT },
    );
    const total = conteo.total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(paginaSolicitada, totalPages);
    const data = await sequelize.query(
      `
      SELECT id_benpropos AS id, RTRIM(fol_dec) AS folio, mes_benpropos AS mes, ano_benpropos AS anio,
        CONVERT(char(10), fec_benpropos, 23) AS fecha, RTRIM(est_benpropos) AS estado,
        CAST(obs_benpropos AS nvarchar(max)) AS observacion, origen
      FROM dbo.benpropos_consulta
      ${filtro}
      ORDER BY ano_benpropos DESC, mes_benpropos DESC, id_benpropos DESC, origen
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `,
      {
        replacements: { ...replacements, offset: (page - 1) * limit, limit },
        type: QueryTypes.SELECT,
      },
    );
    return { data, pagination: { total, totalPages, page, limit } };
  },

  async guardar(data: Postergacion, usuario: string) {
    const rows = await sequelize.transaction((transaction) => sequelize.query<{ id: number }>(
      `
      DECLARE @ultimoLegacy int, @ultimoProempleo int, @nuevoId bigint;
      SELECT @ultimoProempleo = MAX(id_benpropos)
        FROM dbo.benpropos_proempleo WITH (TABLOCKX, HOLDLOCK);
      SELECT @ultimoLegacy = MAX(id_benpropos) FROM dbo.BENPROPOS WITH (HOLDLOCK);
      SELECT @nuevoId = COALESCE(MAX(CONVERT(bigint, id)), 0) + 1
        FROM (VALUES (@ultimoLegacy), (@ultimoProempleo)) ids(id);

      SET IDENTITY_INSERT dbo.benpropos_proempleo ON;
      BEGIN TRY
        INSERT INTO dbo.benpropos_proempleo
          (id_benpropos, fol_dec, mes_benpropos, ano_benpropos, fec_benpropos, obs_benpropos, usu_cre, fec_cre, est_benpropos)
        OUTPUT INSERTED.id_benpropos AS id
        SELECT @nuevoId, :folio, :mes, :anio, CONVERT(date, :fecha, 23), :observacion, :usuario, GETDATE(), 'ACTIVO'
        WHERE EXISTS (SELECT 1 FROM (${vinculos}) d WHERE fol_dec = :folio AND ${activo});
        SET IDENTITY_INSERT dbo.benpropos_proempleo OFF;
      END TRY
      BEGIN CATCH
        SET IDENTITY_INSERT dbo.benpropos_proempleo OFF;
        THROW;
      END CATCH;
      `,
      { replacements: { ...data, usuario }, type: QueryTypes.SELECT, transaction },
    ));
    return rows[0];
  },

  async anular(id: number, usuario: string) {
    const rows = await sequelize.query<{ id: number }>(
      `
      UPDATE dbo.benpropos_proempleo SET est_benpropos = 'ANULADO', usu_eli = :usuario, fec_elli = GETDATE()
      OUTPUT INSERTED.id_benpropos AS id
      WHERE id_benpropos = :id AND est_benpropos = 'ACTIVO'
    `,
      { replacements: { id, usuario }, type: QueryTypes.SELECT },
    );
    return rows[0];
  },

  async plazo(
    folio: number,
    { anio, mes }: { anio: number; mes: number },
    transaction?: Transaction,
  ) {
    const ordinario = plazoOrdinario(anio, mes);
    const [row] = await sequelize.query<{ postergacion: string | null }>(
      `
      SELECT CONVERT(char(10), MAX(CAST(p.fec_benpropos AS date)), 23) AS postergacion
      FROM dbo.benpropos_consulta p
      WHERE p.ano_benpropos = :anio AND p.mes_benpropos = :mes AND p.est_benpropos = 'ACTIVO'
        AND EXISTS (SELECT 1 FROM (${vinculos}) d
          WHERE d.fol_pro = :folio AND d.fol_dec = p.fol_dec AND ${activo})
    `,
      {
        replacements: { folio, anio, mes },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    const fechaLimite =
      row.postergacion && row.postergacion > ordinario
        ? row.postergacion
        : ordinario;
    // El día siguiente de la consulta legacy corresponde al cierre exclusivo.
    const hoy = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return { fechaLimite, abierto: hoy <= fechaLimite };
  },
};
