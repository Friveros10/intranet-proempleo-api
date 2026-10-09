import { ProyectoModel } from '../../models/Proyecto.model';
import { BenProModel } from '../../models/BenPro.model';
import { ComunaModel } from '../../models/Comuna.model';

export interface ProyectoConCupo {
  fol_pro: number;
  nom_pro: string | null;
  emp_pro: number | null;
  reg_pro: number | null;
  com_pro: number | null;
  nombreComuna: string | null;
  cuposUtilizados: number;
  cuposDisponibles: number | null;
  ultimoAnoBenPro: number | null;
  ultimoMesBenPro: number | null;
}

export const proyectoRepository = {
  async findAll(): Promise<ProyectoModel[]> {
    return ProyectoModel.findAll();
  },

  async findByFolio(fol_pro: number): Promise<ProyectoModel | null> {
    return ProyectoModel.findByPk(fol_pro);
  },

  async findByFolioConCupo(fol_pro: number): Promise<ProyectoConCupo | null> {
    const [proyecto, ultimoRegistro] = await Promise.all([
      ProyectoModel.findByPk(fol_pro, {
        include: [
          {
            model: ComunaModel,
            as: 'comuna',
            attributes: ['cod_com', 'nom_com'],
            required: false,
          },
        ],
      }),
      BenProModel.findOne({
        where: { fol_pro },
        attributes: ['ano_BenPro', 'mes_benpro'],
        order: [['ano_BenPro', 'DESC'], ['mes_benpro', 'DESC']],
        raw: true,
      }),
    ]);

    if (!proyecto) {
      return null;
    }

    const cupoUtilizado = ultimoRegistro
      ? await BenProModel.count({
          where: {
            fol_pro,
            ano_BenPro: ultimoRegistro.ano_BenPro,
            mes_benpro: ultimoRegistro.mes_benpro,
          },
        })
      : 0;

    const proyectoConComuna = proyecto as ProyectoModel & {
      comuna?: { nom_com?: string | null } | null;
    };

    const empPro = proyecto.emp_pro ?? null;
    const cuposDisponibles = empPro === null ? null : Math.max(empPro - cupoUtilizado, 0);

    return {
      fol_pro: proyecto.fol_pro,
      nom_pro: proyecto.nom_pro,
      emp_pro: empPro,
      reg_pro: proyecto.reg_pro ?? null,
      com_pro: proyecto.com_pro ?? null,
      nombreComuna: proyectoConComuna.comuna?.nom_com ?? null,
      cuposUtilizados: cupoUtilizado,
      cuposDisponibles,
      ultimoAnoBenPro: ultimoRegistro?.ano_BenPro ?? null,
      ultimoMesBenPro: ultimoRegistro?.mes_benpro ?? null,
    };
  },
};
