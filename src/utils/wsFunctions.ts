// Recibe un RUT como "20129775-3" y separa el cuerpo del dígito verificador.
export function formatearRut(rut: string): { cuerpo: string; dv: string } {
  const normalizado = rut.replace(/[^0-9kK]/g, '');
  return {
    cuerpo: normalizado.slice(0, -1),
    dv: normalizado.slice(-1).toUpperCase(),
  };
}
