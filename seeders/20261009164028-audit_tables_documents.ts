import { Transaction } from "sequelize";
import { sequelize } from "../src/database/sequelize";
import { AuditoriaBioBioModel } from "../src/models/AuditoriaBioBio.model";
import { DocumentoAuditoriaModel } from "../src/models/DocumentoAuditoria.model";
import { parseRut as separarRut } from "../src/utils/rut";

function parseRut(rutRaw: string): { rut: number; dv: string } | null {
  if (typeof rutRaw !== "string") return null;
  const limpio = rutRaw.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^[1-9]\d{0,7}[\dK]$/.test(limpio)) return null;
  const { cuerpo, dv } = separarRut(limpio);
  return { rut: cuerpo, dv };
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export function mensajesErrorSql(error: unknown): string[] {
  const mensajes = new Set<string>();
  const visitados = new Set<object>();
  function leer(actual: unknown): void {
    if (typeof actual !== "object" || actual === null || visitados.has(actual)) {
      return;
    }
    visitados.add(actual);
    if ("message" in actual && typeof actual.message === "string" && actual.message) {
      mensajes.add(actual.message);
    }
    if ("errors" in actual && Array.isArray(actual.errors)) {
      for (const interno of actual.errors) leer(interno);
    }
    if ("original" in actual) leer(actual.original);
    if ("parent" in actual) leer(actual.parent);
    if ("cause" in actual) leer(actual.cause);
  }
  leer(error);
  return [...mensajes];
}

export async function up(): Promise<void> {
  const resumen = await sequelize.transaction(async (t: Transaction) => {
    // Serializa ejecuciones de este seeder hasta confirmar o revertir la transaccion.
    await sequelize.query(
      `DECLARE @resultado int;
       EXEC @resultado = sys.sp_getapplock
         @Resource = N'seeder-documentos-auditoria-biobio',
         @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 60000;
       IF @resultado < 0
         THROW 50001, 'No se pudo bloquear el seeder de auditoria Biobio.', 1;`,
      { transaction: t },
    );
    const listadoOrigen = await AuditoriaBioBioModel.findAll({
      transaction: t,
      raw: true,
    });

    if (listadoOrigen.length === 0) {
      return "No se encontraron registros en Listado_AuditoriaBiobio.";
    }

    const ahora = new Date();
    const ID_REGION_BIOBIO = 8;
    const USUARIO_SISTEMA = 1;
    const existentes = await DocumentoAuditoriaModel.findAll({
      attributes: ["RUT"],
      where: { idRegion: ID_REGION_BIOBIO },
      paranoid: false,
      transaction: t,
    });
    const rutsExistentes = new Set(
      existentes.map((documento) => documento.getDataValue("RUT")),
    );
    const rutsNuevos = new Set<number>();
    let omitidos = 0;
    let duplicados = 0;
    let invalidos = 0;

    const nuevosDocumentos = listadoOrigen
      .map((item) => {
        const parsed = parseRut(item.RUT);
        if (!parsed) {
          invalidos += 1;
          return null;
        }
        if (rutsExistentes.has(parsed.rut)) {
          omitidos += 1;
          return null;
        }
        if (rutsNuevos.has(parsed.rut)) {
          duplicados += 1;
          return null;
        }
        rutsNuevos.add(parsed.rut);

        return {
          RUT: parsed.rut,
          dv: parsed.dv,
          nombres: item.nombres ? item.nombres.trim() : "",
          apellidoPaterno: item.pat ? item.pat.trim() : "",
          apellidoMaterno: item.mat ? item.mat.trim() : "",
          ong: item.ejecutor ? item.ejecutor.trim() : "",
          comuna: item.comuna ? item.comuna.trim() : "",
          idRegion: ID_REGION_BIOBIO,
          certCotizacionesUrl: "",
          liquidacionUrl: "",
          certCotizacionesNombre: "",
          liquidacionNombre: "",
          estadoCert: "pendiente" as const,
          estadoLiquidacion: "pendiente" as const,
          created_at: ahora,
          updated_at: ahora,
          created_usr: USUARIO_SISTEMA,
          updated_usr: USUARIO_SISTEMA,
        };
      })
      .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

    const BATCH_SIZE = 500;
    const lotes = chunkArray(nuevosDocumentos, BATCH_SIZE);

    for (const lote of lotes) {
      await DocumentoAuditoriaModel.bulkCreate(lote, {
        transaction: t,
        validate: true,
      });
    }

    if (invalidos > 0) {
      console.warn(
        `Se omitieron ${invalidos} registros de origen con RUT malformado.`,
      );
    }
    return (
      `Auditoría Biobío: ${nuevosDocumentos.length} insertados, ` +
        `${omitidos} existentes omitidos, ${duplicados} duplicados de origen omitidos, ` +
        `${invalidos} RUT malformados omitidos.`
    );
  });
  console.log(resumen);
}

export async function down(): Promise<void> {
  throw new Error(
    "No se puede revertir este seeder automáticamente: las fichas no tienen " +
      "una marca de importación que permita distinguirlas de registros existentes.",
  );
}

// npx ts-node seeders/20261009164028-audit_tables_documents.ts
if (require.main === module) {
  sequelize
    .authenticate()
    .then(() => up())
    .then(() => {
      // eslint-disable-next-line no-console
      console.log("Seeder de Documentos de Auditoría ejecutado correctamente.");
      return sequelize.close();
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      const mensajes = mensajesErrorSql(error);
      console.error("Error ejecutando el seeder de Documentos de Auditoría:");
      if (mensajes.length) {
        for (const mensaje of mensajes) console.error(`- ${mensaje}`);
      } else {
        console.error("Error sin mensaje; tipo:", typeof error);
      }
      process.exitCode = 1;
      return sequelize.close();
    });
}