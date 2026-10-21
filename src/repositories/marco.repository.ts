import { Op, WhereOptions } from 'sequelize';
import { Marco, MarcoModel } from '../models/Marco.model';
import { MarcoDetalleModel } from '../models/MarcoDetalle.model';
import type { ListarMarcosQuery } from '../validations/marco.validation';

const LIMIT = 20;

export const marcoRepository = {
  async listar({ anio, buscar, page }: ListarMarcosQuery) {
    const where: WhereOptions<Marco> = {
      ...(anio !== undefined ? { ano_mar: anio } : {}),
      ...(buscar ? {
        [Op.or]: [
          { nombre_mar: { [Op.like]: `%${buscar.replace(/[\\%_[\]]/g, '[$&]')}%` } },
          ...(/^\d+$/.test(buscar) && Number.isSafeInteger(Number(buscar))
            ? [{ corr_mar: Number(buscar) }]
            : []),
        ],
      } : {}),
    };
    const total = await MarcoModel.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    const pagina = Math.min(page, totalPages);
    const data = await MarcoModel.findAll({
      where,
      order: [['ano_mar', 'DESC'], ['corr_mar', 'DESC']],
      limit: LIMIT,
      offset: (pagina - 1) * LIMIT,
    });
    return { data, pagination: { page: pagina, limit: LIMIT, total, totalPages } };
  },

  async anios() {
    const registros = await MarcoModel.findAll({
      attributes: ['ano_mar'],
      where: { ano_mar: { [Op.not]: null } },
      group: ['ano_mar'],
      order: [['ano_mar', 'DESC']],
    });
    return registros.map((registro) => registro.ano_mar).filter((anio): anio is number => anio !== null);
  },

  obtener(id: number) {
    return MarcoModel.findByPk(id);
  },

  detalles(corr_mar: number) {
    return MarcoDetalleModel.findAll({
      where: { corr_mar },
      order: [['glo_detmar', 'ASC'], ['corr_detmar', 'ASC']],
    });
  },
};
