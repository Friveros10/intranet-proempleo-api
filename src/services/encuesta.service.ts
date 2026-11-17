import { z } from 'zod';
import { sequelize } from '../database/sequelize';
import * as repo from '../repositories/encuesta.repository';
import { AppError } from '../utils/AppError';
import { calcularDv, parseRut } from '../utils/rut';
import { preguntasEncuesta } from './encuesta.catalogo';

export const envioEncuestaSchema = z.object({
  rut: z.string().max(20), folio: z.number().int().positive(),
  respuestas: z.array(z.object({ preguntaId: z.number().int().positive(), valor: z.string().max(6000) })).max(17),
});

export function normalizarRut(valor: string): { cuerpo: number; dv: string; rut: string } {
  if (!/^\d{1,2}(?:\.\d{3}){2}-[\dkK]$|^\d{7,8}-?[\dkK]$/.test(valor.trim())) throw new AppError('Ingrese un RUT válido con dígito verificador.', 400);
  const { cuerpo, dv } = parseRut(valor);
  if (calcularDv(cuerpo) !== dv) throw new AppError('El dígito verificador del RUT no es válido.', 400);
  return { cuerpo, dv, rut: `${cuerpo}-${dv}` };
}

export async function validarBeneficiario(valor: string) {
  const { cuerpo, dv, rut } = normalizarRut(valor);
  if (await repo.yaRespondio(rut)) throw new AppError('Este RUT ya respondió la encuesta.', 409);
  const contextos = await repo.buscarBeneficiario(cuerpo, dv);
  if (!contextos.length) throw new AppError('No se encontró al beneficiario en octubre de 2026.', 404);
  if (contextos.length !== 1) throw new AppError('No se pudo determinar un único proyecto para este beneficiario. Contacte al equipo regional.', 409);
  const { region, comuna, ejecutor, folio } = contextos[0];
  return { rut, contexto: { region, comuna, ejecutor, folio } };
}

export function validarRespuestas(preguntas: repo.PreguntaEncuesta[], entradas: { preguntaId: number; valor: string }[], contexto: repo.ContextoEncuesta): Map<number, string> {
  if (preguntas.length !== preguntasEncuesta.length) throw new AppError('La encuesta no está configurada. Ejecute el seeder.', 503);
  const valores = new Map(entradas.map(r => [r.preguntaId, r.valor.trim()]));
  if (valores.size !== entradas.length || entradas.some(r => !preguntas.some(p => p.id === r.preguntaId))) throw new AppError('Hay preguntas duplicadas o desconocidas.', 400);
  const rol = preguntas.find(p => (p.seccion === 1 && p.orden === 3));
  const dirigente = rol && valores.get(rol.id) === 'Dirigente/a';
  for (const p of preguntas) {
    if (p.seccion === 4 && !dirigente) { valores.delete(p.id); continue; }
    if ((p.seccion === 1 && p.orden === 1)) valores.set(p.id, `${contexto.region} / ${contexto.comuna}`);
    if ((p.seccion === 1 && p.orden === 2)) valores.set(p.id, contexto.ejecutor);
    const valor = valores.get(p.id) || '';
    if (p.obligatoria && !valor) throw new AppError(`Responda: ${p.pregunta}`, 400);
    if (!valor) continue;
    // Contratos de valores; no son opciones de presentación almacenadas en BD.
    const valido = (p.seccion === 1 && p.orden === 3) ? /^(Trabajador\/a|Dirigente\/a)$/.test(valor)
      : p.seccion === 2 ? /^(siempre|casi siempre|a veces|nunca|no aplica)$/.test(valor)
      : (p.seccion === 4 && p.tipo === 'radio') ? /^(siempre|casi siempre|a veces|nunca)$/.test(valor)
      : (p.seccion === 3 && p.tipo === 'radio') ? /^[1-7]$/.test(valor) : true;
    if (!valido) throw new AppError(`Respuesta inválida: ${p.pregunta}`, 400);
    if (p.tipo === 'table_repeat') {
      const schema = z.array(z.object({ problema: z.string().trim().min(1).max(1000), comuna: z.string().trim().min(1).max(150), fecha: z.string().trim().min(1).max(100), reclamo_escrito: z.enum(['Sí', 'No']) }).strict()).max(3);
      let datos: unknown;
      try { datos = JSON.parse(valor); } catch { throw new AppError('La tabla de problemas es inválida.', 400); }
      const result = schema.safeParse(datos);
      if (!result.success) throw new AppError('Complete problema, comuna, fecha y reclamo escrito en cada fila utilizada.', 400);
      valores.set(p.id, JSON.stringify(result.data));
    }
  }
  return valores;
}

export async function guardarEncuesta(entrada: unknown): Promise<void> {
  const data = envioEncuestaSchema.parse(entrada);
  const { cuerpo, dv, rut } = normalizarRut(data.rut);
  await sequelize.transaction(async transaction => {
    await repo.bloquearEnvio(rut, transaction);
    if (await repo.yaRespondio(rut, transaction)) throw new AppError('Este RUT ya respondió la encuesta.', 409);
    const contextos = await repo.buscarBeneficiario(cuerpo, dv, transaction);
    if (contextos.length > 1) throw new AppError('No se pudo determinar un único proyecto para este beneficiario. Contacte al equipo regional.', 409);
    const contexto = contextos.find(c => c.folio === data.folio);
    if (!contexto) throw new AppError('El beneficiario no tiene ese proyecto en octubre de 2026.', 400);
    const preguntas = await repo.listarPreguntas(transaction);
    const valores = validarRespuestas(preguntas, data.respuestas, contexto);
    for (const [id, valor] of valores) {
      if (valor) await repo.insertarRespuesta(rut, id, valor, transaction, contexto);
    }
  });
}

