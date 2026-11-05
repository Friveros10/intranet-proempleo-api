export const DetalleDeGastos = [
  {
    id: 1,
    nombre_detalle: "OP. SUELDOS DE BENEFICIARIOS",
    tipo: "Operación"
  },
  {
    id: 2,
    nombre_detalle: "OP. MATERIALES Y HERRAMIENTAS ",
    tipo: "Operación"
  },
  {
    id: 3,
    nombre_detalle: "OP. PERSONAS Y GASTOS ADMINISTRATIVOS",
    tipo: "Operación"
  },
  {
    id: 4,
    nombre_detalle: "Detalle de Gastos ADM. SUELDOS PARA PERSONAL",
    tipo: "Personal"
  },
  {
    id: 5,
    nombre_detalle: "ADM. GASTOS ADMINISTRATIVOS",
    tipo: "Personal"
  }
] as const;

export type DetalleDeGastosID = (typeof DetalleDeGastos)[number]["id"];

export function esDocumentoReemplazoValido(
  id: number,
): id is DetalleDeGastosID {
  return DetalleDeGastos.some((d) => d.id === id);
}
