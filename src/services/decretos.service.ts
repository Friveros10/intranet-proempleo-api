import { decretosRepository as repository } from '../repositories/decretos.repository';
import type { GuardarDecretoInput, ListarDecretosQuery } from '../validations/decretos.validation';
import type { OrigenMarco } from '../validations/marco.validation';
import { sequelize } from '../database/sequelize';
import type { Transaction } from 'sequelize';
import { AppError } from '../utils/AppError';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';
import { proyectosRepository } from '../repositories/proyectos.repository';

export const decretosService = {
  async desvincularProyecto(folio: string, origen: OrigenMarco, proyectoFolio: number, origenProyecto: OrigenMarco, usuario: string) {
    const { region } = await this.contextoAsignacion(folio, origen);
    return sequelize.transaction(async (transaction) => {
      const proyecto = await proyectosRepository.obtener(proyectoFolio, origenProyecto, transaction);
      if (!proyecto) throw new AppError('Proyecto no encontrado', 404);
      if (Number(proyecto.reg_pro) !== Number(region)) throw new AppError('El proyecto debe pertenecer a la región del intermediario del decreto', 400);
      if (!await repository.desvincularProyecto(folio, proyectoFolio, usuario, transaction)) throw new AppError('No hay una asociación modificable entre este proyecto y el decreto', 404);
      return { fol_dec: folio, fol_pro: proyectoFolio };
    });
  },
  async contextoAsignacion(folio: string, origen: OrigenMarco) {
    const decreto = await this.obtener(folio, origen);
    const region = await repository.regionIntermediario(Number(decreto.rutint_dec), origen);
    if (!region) throw new AppError('El intermediario del decreto no tiene una región registrada', 400);
    return { decreto, region };
  },
  async proyectos(folio: string, query: { origen: OrigenMarco; page: number; buscar: string }, disponibles: boolean) {
    const { region } = await this.contextoAsignacion(folio, query.origen);
    return repository.proyectosAsociados(folio, region, disponibles, query.page, query.buscar);
  },
  async buscarProyecto(folio: string, origen: OrigenMarco, folioProyecto: number) {
    const { region } = await this.contextoAsignacion(folio, origen);
    const nuevo = await proyectosRepository.obtener(folioProyecto, 'proempleo');
    const proyecto = nuevo ?? await proyectosRepository.obtener(folioProyecto, 'legacy');
    if (!proyecto || proyecto.est_pro === 'ELIMINADO') throw new AppError('Proyecto no encontrado', 404);
    if (Number(proyecto.reg_pro) !== Number(region)) throw new AppError('El proyecto debe pertenecer a la región del intermediario del decreto', 400);
    if ((await proyectosRepository.decretos(folioProyecto)).some((d) => d.fol_dec === folio)) throw new AppError('El proyecto ya está asociado al decreto', 409);
    return {
      fol_pro: proyecto.fol_pro, origen: proyecto.origen, nom_pro: proyecto.nom_pro,
      mes_pro: proyecto.mes_pro, emp_pro: proyecto.emp_pro, fecini_pro: proyecto.fecini_pro,
      fecter_pro: proyecto.fecter_pro, nombreEjecutor: proyecto.nombreEjecutor,
    };
  },
  async asociarProyecto(folio: string, origen: OrigenMarco, data: { fol_pro: number; origen: OrigenMarco; mon_decpro: string }, usuario: string) {
    const { decreto, region } = await this.contextoAsignacion(folio, origen);
    if (folio.toUpperCase().includes('P')) throw new AppError('No se pueden asignar proyectos a folios con P', 400);
    return sequelize.transaction(async (transaction) => {
      // Serializa las asignaciones de un mismo proyecto y comprueba ambas fuentes.
      await sequelize.query('SELECT fol_pro FROM dbo.proyectos_proempleo WITH (UPDLOCK, HOLDLOCK) WHERE fol_pro = :folio', { replacements: { folio: data.fol_pro }, transaction });
      await sequelize.query('SELECT fol_pro FROM dbo.PROYECTOS WITH (UPDLOCK, HOLDLOCK) WHERE fol_pro = :folio', { replacements: { folio: data.fol_pro }, transaction });
      const proyecto = await proyectosRepository.obtener(data.fol_pro, data.origen, transaction);
      if (!proyecto || proyecto.est_pro === 'ELIMINADO') throw new AppError('Proyecto no encontrado', 404);
      if (Number(proyecto.reg_pro) !== Number(region)) throw new AppError('El proyecto debe pertenecer a la región del intermediario del decreto', 400);
      if ((await proyectosRepository.decretos(data.fol_pro, transaction)).some((d) => d.fol_dec === folio)) throw new AppError('El proyecto ya está asociado al decreto', 409);
      await proyectosRepository.asignarDecreto(data.fol_pro, folio, data.mon_decpro, usuario, transaction, decreto.folprov_dec ?? '');
      return { fol_dec: folio, fol_pro: data.fol_pro };
    });
  },
  async intermediarios(rut: number) {
    const usuario = await usuarioSicapRepository.findByRut(rut);
    if (!usuario) throw new AppError('Usuario no encontrado', 401);
    return repository.intermediarios();
  },
  listar(query: ListarDecretosQuery) {
    return repository.listar(query);
  },

  anios() {
    return repository.anios();
  },

  async programas() {
    const anio = new Date().getFullYear();
    return { anio, data: await repository.programas(anio) };
  },

  glosas(id: number) {
    return repository.glosas(id);
  },

  async obtener(folio: string, origen: OrigenMarco = 'legacy', transaction?: Transaction) {
    const decreto = await repository.obtener(folio, origen, transaction);
    if (!decreto) throw new AppError('Decreto no encontrado', 404);
    return { ...decreto, detalles: await repository.detalles(folio, origen, transaction) };
  },

  async crear(data: GuardarDecretoInput, usuario: string) {
    await validarIntermediario(data.rutint_dec, Number(usuario));
    return sequelize.transaction(async (transaction) => {
      const existente = await repository.obtener(data.fol_dec, 'proempleo', transaction);
      if (existente || await repository.obtener(data.fol_dec, 'legacy', transaction)) {
        throw new AppError('Ya existe un decreto con ese folio', 409);
      }
      await validarReferencias(data, transaction);
      await repository.crear(data, usuario, transaction);
      await repository.reemplazarDetalles(data.fol_dec, data.detalles, transaction);
      return this.obtener(data.fol_dec, 'proempleo', transaction);
    });
  },

  async actualizar(folio: string, data: GuardarDecretoInput, usuario: string) {
    if (data.fol_dec !== folio) throw new AppError('El folio no se puede modificar', 400);
    await validarIntermediario(data.rutint_dec, Number(usuario));
    return sequelize.transaction(async (transaction) => {
      const decreto = await repository.obtener(folio, 'proempleo', transaction);
      if (!decreto) throw new AppError('Decreto no encontrado para modificar', 404);
      if (data.folprov_dec !== decreto.folprov_dec) throw new AppError('El folio provisorio no se puede modificar', 400);
      const anteriores = await repository.detalles(folio, 'proempleo', transaction);
      await validarReferencias(data, transaction, anteriores);
      await repository.actualizar(folio, data, usuario, transaction);
      await repository.reemplazarDetalles(folio, data.detalles, transaction);
      return this.obtener(folio, 'proempleo', transaction);
    });
  },
};

async function validarIntermediario(rut: number, usuario: number) {
  const intermediarios = await decretosService.intermediarios(usuario);
  if (!intermediarios.some((item) => item.rut_int === rut)) {
    throw new AppError('Selecciona un intermediario registrado', 400);
  }
}

async function validarReferencias(data: GuardarDecretoInput, transaction: Transaction,
  anteriores: { corr_mar: number | null; corr_detmar: number | null }[] = []) {
  const verificadas = new Set<string>();
  for (const detalle of data.detalles) {
    if (anteriores.some((item) => item.corr_mar === detalle.corr_mar && item.corr_detmar === detalle.corr_detmar)) continue;
    const key = `${detalle.corr_mar}:${detalle.corr_detmar}`;
    if (verificadas.has(key)) continue;
    if (!await repository.referenciaDisponible(detalle.corr_mar, detalle.corr_detmar, new Date().getFullYear(), transaction)) {
      throw new AppError('La glosa no pertenece al programa o el programa no está activo en el año en curso', 400);
    }
    verificadas.add(key);
  }
}
