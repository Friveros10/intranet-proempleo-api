import { col, fn, Op, WhereOptions } from 'sequelize';
import { DecretoHacienda, DecretosHaciendaModel } from '../models/DecretosHacienda.model';
import { DecretosHaciendaDetalleModel } from '../models/DecretosHaciendaDetalle.model';
import { MarcoModel } from '../models/Marco.model';
import { MarcoDetalleModel } from '../models/MarcoDetalle.model';
import type { ListarDecretosHaciendaQuery } from '../validations/decretosHacienda.validation';

const LIMIT = 20;
683023

export const decretosHaciendaRepository = {
  async listar({ anio, folio, page }: ListarDecretosHaciendaQuery) {
    const where: WhereOptions<DecretoHacienda> = {
      ...(anio !== undefined ? {
        fec_dechac: {
          [Op.gte]: fn('DATEFROMPARTS', anio, 1, 1),
          [Op.lt]: fn('DATEFROMPARTS', anio + 1, 1, 1),
        },
      } : {}),
      ...(folio ? { fol_dechac: { [Op.like]: `%${folio.replace(/[\\%_[\]]/g, '[$&]')}%` } } : {}),
    };
    const total = await DecretosHaciendaModel.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    const pagina = Math.min(page, totalPages);
    const data = await DecretosHaciendaModel.findAll({
      where,
      order: [['fec_dechac', 'DESC'], ['fol_dechac', 'DESC']],
      limit: LIMIT,
      offset: (pagina - 1) * LIMIT,
    });
    return { data, pagination: { page: pagina, limit: LIMIT, total, totalPages } };
  },

  async anios() {
    const expresion = fn('YEAR', col('fec_dechac'));
    const rows = await DecretosHaciendaModel.findAll({
      attributes: [[expresion, 'anio']],
      where: { fec_dechac: { [Op.not]: null } },
      group: [expresion],
      order: [[expresion, 'DESC']],
    });
    return rows.map((row) => {
      const anio: unknown = row.get('anio');
      return anio;
    }).filter((anio): anio is number => typeof anio === 'number');
  },

  obtener(folio: string) {
    return DecretosHaciendaModel.findByPk(folio);
  },

  detalles(fol_dechac: string) {
    return DecretosHaciendaDetalleModel.findAll({
      where: { fol_dechac },
      order: [['corr_dethac', 'ASC']],
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
