import { Op, WhereOptions } from 'sequelize';
import { Decreto, DecretosModel } from '../models/Decretos.model';
import { DecretosDetalleModel } from '../models/DecretosDetalle.model';
import { MarcoModel } from '../models/Marco.model';
import { MarcoDetalleModel } from '../models/MarcoDetalle.model';
import { IntermediarioModel } from '../models/Intermediario.model';
import type { ListarDecretosQuery } from '../validations/decretos.validation';

const LIMIT = 20;

export const decretosRepository = {
  intermediarios(region: number) {
    return IntermediarioModel.findAll({
      attributes: ['rut_int', 'dig_int', 'nom_int', 'reg_int'],
      where: { reg_int: region },
      order: [['nom_int', 'ASC'], ['rut_int', 'ASC']],
    });
  },
  async listar({ anio, folio, page }: ListarDecretosQuery) {
    const where: WhereOptions<Decreto> = {
      ...(anio !== undefined ? { ano_dec: anio } : {}),
      ...(folio ? { fol_dec: { [Op.like]: `%${folio.replace(/[\\%_[\]]/g, '[$&]')}%` } } : {}),
    };
    const total = await DecretosModel.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    const pagina = Math.min(page, totalPages);
    const data = await DecretosModel.findAll({
      where,
      order: [['ano_dec', 'DESC'], ['fec_dec', 'DESC'], ['fol_dec', 'DESC']],
      limit: LIMIT,
      offset: (pagina - 1) * LIMIT,
    });
    return { data, pagination: { page: pagina, limit: LIMIT, total, totalPages } };
  },

  async anios() {
    const rows = await DecretosModel.findAll({
      attributes: ['ano_dec'],
      where: { ano_dec: { [Op.not]: null } },
      group: ['ano_dec'],
      order: [['ano_dec', 'DESC']],
    });
    return rows.map((row) => row.ano_dec).filter((anio): anio is number => anio !== null);
  },

  obtener(folio: string) {
    return DecretosModel.findByPk(folio);
  },

  detalles(fol_dec: string) {
    return DecretosDetalleModel.findAll({
      where: { fol_dec },
      order: [['corr_mar', 'ASC'], ['corr_detmar', 'ASC'], ['sublinea', 'ASC']],
    });
  },

  programas(anio: number) {
    return MarcoModel.findAll({
      attributes: ['corr_mar', 'ano_mar', 'subtitulo_mar', 'item_mar', 'linea_mar', 'nombre_mar'],
      where: { ano_mar: anio },
      order: [['nombre_mar', 'ASC'], ['corr_mar', 'ASC']],
    });
  },

  marcosPorIds(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return MarcoModel.findAll({
      attributes: ['corr_mar', 'ano_mar', 'nombre_mar'],
      where: { corr_mar: { [Op.in]: ids } },
    });
  },

  glosasPorIds(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return MarcoDetalleModel.findAll({
      attributes: ['corr_detmar', 'corr_mar', 'glo_detmar', 'nom_detmar'],
      where: { corr_detmar: { [Op.in]: ids } },
    });
  },
};
