import { z } from "zod";
import { jsonField, nuevoBeneficiarioSchema } from "./reemplazoBenProyecto.validation";

export const configurarFlujoSchema = z.object({
  params: z.object({ idRegion: z.coerce.number().int().positive() }),
  body: z.object({ status: z.union([z.literal(0), z.literal(1)]) }).strict(),
});

export const crearReemplazoIndividualSchema = z.object({
  body: z.object({
    cupoCobertura: z.preprocess(
      (valor) => valor === "true" ? true : valor === "false" ? false : valor,
      z.boolean(),
    ),
    idBeneficiarioProyecto: z.coerce.number().int().positive().optional(),
    idProyecto: z.coerce.number().int().positive(),
    nuevosBeneficiarios: jsonField(
      z.array(nuevoBeneficiarioSchema).length(1, "Debe ingresar exactamente un beneficiario nuevo"),
      "nuevosBeneficiarios inválido",
    ),
    documentos: jsonField(
      z.array(z.object({ rut: z.string().min(2), idDocumento: z.coerce.number().int() })),
      "documentos inválido",
    ),
  }).superRefine((data, ctx) => {
    if (!data.cupoCobertura && data.idBeneficiarioProyecto === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["idBeneficiarioProyecto"],
        message: "idBeneficiarioProyecto es requerido",
      });
    }
  }),
});

export type CrearReemplazoIndividualInput = z.infer<typeof crearReemplazoIndividualSchema>["body"];
