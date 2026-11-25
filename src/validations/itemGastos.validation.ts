import { z } from "zod";

const id = z.number().int().positive().max(2147483647);
export const guardarItemGastosSchema = z.object({
  body: z
    .object({
      nuevos: z
        .array(
          z
            .object({
              nombre: z
                .string()
                .trim()
                .min(1, "Ingresa el nombre del ítem.")
                .max(80),
              categoria: z.enum(["Personal", "Operación", "Inversión"]),
            })
            .strict(),
        )
        .max(100),
      eliminar: z
        .array(id)
        .max(100)
        .refine((ids) => new Set(ids).size === ids.length),
    })
    .strict()
    .refine(
      ({ nuevos, eliminar }) => nuevos.length + eliminar.length > 0,
      "No hay cambios que guardar.",
    ),
});
export type GuardarItemGastosInput = z.infer<
  typeof guardarItemGastosSchema
>["body"];
