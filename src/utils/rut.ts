import { AppError } from './AppError';

export interface RutParseado {
  cuerpo: number;
  dv: string;
}

// Recibe un RUT formateado ("11.111.111-1" o "11111111-1"), le quita puntos y guion
// y separa el cuerpo (usado como PK de beneficiarios) del dígito verificador.
export function parseRut(rutFormateado: string): RutParseado {
  const soloAlfanumerico = rutFormateado.replace(/[^0-9kK]/g, '');
  const cuerpoStr = soloAlfanumerico.slice(0, -1);
  const dv = soloAlfanumerico.slice(-1).toUpperCase();
  const cuerpo = Number(cuerpoStr);

  if (!cuerpoStr || Number.isNaN(cuerpo) || !dv) {
    throw new AppError('RUT inválido', 400);
  }

  return { cuerpo, dv };
}
