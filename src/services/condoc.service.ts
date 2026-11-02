import { randomInt } from 'crypto';
import { sequelize } from '../database/sequelize';
import { AppError } from '../utils/AppError';
import { condocRepository as repository } from '../repositories/condoc.repository';
import type { OrigenMarco } from '../validations/marco.validation';
import type { GuardarCondocInput, ListarCondocQuery } from '../validations/condoc.validation';

const FOLIO_ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const FOLIO_LARGO = 8;
const FOLIO_INTENTOS = 10;

// Flujo de estados de los documentos nuevos: solo se avanza, Enviado es final.
const SIGUIENTE_ESTADO: Record<string, string> = { GESTION: 'Archivado', ARCHIVADO: 'Enviado' };

function generarFolio(): string {
  let folio = '';
  for (let indice = 0; indice < FOLIO_LARGO; indice++) {
    folio += FOLIO_ALFABETO[randomInt(FOLIO_ALFABETO.length)];
  }
  return folio;
}

export const condocService = {
  listar(query: ListarCondocQuery) {
    return repository.listar(query);
  },

  anios() {
    return repository.anios();
  },

  areas() {
    return repository.areas();
  },

  programasAnios() {
    return repository.programasAnios();
  },

  programas(anio: number) {
    return repository.programas(anio);
  },

  async obtener(id: number, origen: OrigenMarco = 'legacy') {
    const documento = await repository.obtener(id, origen);
    if (!documento) throw new AppError('Documento no encontrado', 404);
    return documento;
  },

  async crear(data: GuardarCondocInput, usuario: string) {
    if (!await repository.areaExiste(data.cod_are)) {
      throw new AppError('El área seleccionada no existe', 400);
    }
    return sequelize.transaction(async (transaction) => {
      if (!await repository.marcoDisponible(data.corr_mar, data.cod_ano, transaction)) {
        throw new AppError('El programa no está activo o no pertenece al año informado', 400);
      }
      let folio = '';
      for (let intento = 0; intento < FOLIO_INTENTOS; intento++) {
        const candidato = generarFolio();
        if (!await repository.existeFolio(candidato, transaction)) {
          folio = candidato;
          break;
        }
      }
      if (!folio) throw new AppError('No se pudo generar un folio único, inténtalo nuevamente', 500);
      const id = await repository.crear(data, folio, usuario, transaction);
      const documento = await repository.obtener(id, 'proempleo', transaction);
      if (!documento) throw new AppError('No se pudo leer el documento creado', 500);
      return documento;
    });
  },

  async avanzarEstado(id: number, usuario: string) {
    return sequelize.transaction(async (transaction) => {
      const documento = await repository.obtener(id, 'proempleo', transaction);
      if (!documento) throw new AppError('Documento no encontrado para modificar', 404);
      const actual = (documento.est_condoc ?? '').trim().toUpperCase();
      const siguiente = SIGUIENTE_ESTADO[actual];
      if (!siguiente) {
        throw new AppError(
          actual === 'ENVIADO'
            ? 'El documento ya fue enviado'
            : 'El estado actual del documento no permite avanzar',
          400,
        );
      }
      await repository.actualizarEstado(id, siguiente, usuario, transaction);
      const actualizado = await repository.obtener(id, 'proempleo', transaction);
      if (!actualizado) throw new AppError('No se pudo leer el documento actualizado', 500);
      return actualizado;
    });
  },
};
