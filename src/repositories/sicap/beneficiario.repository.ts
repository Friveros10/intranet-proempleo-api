import { QueryTypes } from "sequelize";
import { BeneficiarioModel } from "../../models/Beneficiario.model";
import { BenProModel } from "../../models/BenPro.model";
import { ProyectoModel } from "../../models/Proyecto.model";
import { RegionModel } from "../../models/Region.model";
import { CiudadModel } from "../../models/Ciudad.model";
import { sequelize } from "../../database/sequelize";
import {
  CrearBeneficiarioInput,
  ListarBeneficiariosQuery,
} from "../../validations/beneficiario.validation";

export interface FichaBeneficiarioRow {
  rut_ben: number;
  nom_ben: string | null;
  pat_ben: string | null;
  mat_ben: string | null;
  dir_ben: string | null;
  reg_ben: number | null;
  nombre_region: string | null;
  ciu_ben: number | null;
  nombre_ciudad: string | null;
  com_ben: number | null;
  nombre_comuna: string | null;
  civ_ben: number | null;
  ultimo_mes_benpro: number | null;
  ultimo_ano_benpro: number | null;
  folio_vigente: number;
  tiene_reemplazo: number;
}

export interface BeneficiarioListadoRow {
  rut_ben: number;
  dig_ben: string | null;
  nom_ben: string | null;
  pat_ben: string | null;
  mat_ben: string | null;
  dir_ben: string | null;
  reg_ben: number | null;
  nombre_region: string | null;
  ciu_ben: number | null;
  nombre_ciudad: string | null;
  com_ben: number | null;
  nombre_comuna: string | null;
  fecnac_ben: string | null;
  sex_ben: string | null;
  tel_ben: string | null;
  cel_ben: string | null;
}

export interface ProyectoBeneficiarioRow {
  fol_pro: number;
  nom_pro: string | null;
  ano_BenPro: number;
  mes_inicio: string | null;
  mes_termino: string | null;
  nombre_region: string | null;
  nombre_ciudad: string | null;
  est_benpro: string | null;
}

export interface CatalogoRegionRow {
  cod_region: number;
  nom_region: string | null;
}

export interface CatalogoCiudadRow {
  cod_ciu: number;
  cod_reg: number | null;
  nom_ciu: string | null;
}

export interface CatalogoComunaRow {
  cod_com: number;
  cod_ciu: number | null;
  nom_com: string | null;
}

export interface BeneficiarioListadoPaginado {
  data: BeneficiarioListadoRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type BenProConProyecto = BenProModel & {
  proyecto?: (ProyectoModel & {
    region?: {
      Nom_region?: string | null;
    } | null;
    ciudad?: {
      nom_ciu?: string | null;
    } | null;
  }) | null;
};

interface CountRow {
  total: number;
}

function formatearMesAno(ano: number, mes: number): string {
  return `${String(mes).padStart(2, "0")}-${ano}`;
}

function buildBeneficiarioWhere(
  filtros: ListarBeneficiariosQuery,
  comunaUsuario?: number | null,
) {
  const where: string[] = ["1 = 1"];
  const replacements: Record<string, string | number> = {};

  if (comunaUsuario) {
    where.push("b.com_ben = :comunaUsuario");
    replacements.comunaUsuario = comunaUsuario;
  } else {
    if (filtros.region) {
      where.push("b.reg_ben = :region");
      replacements.region = filtros.region;
    }
    if (filtros.ciudad) {
      where.push("b.ciu_ben = :ciudad");
      replacements.ciudad = filtros.ciudad;
    }
    if (filtros.comuna) {
      where.push("b.com_ben = :comuna");
      replacements.comuna = filtros.comuna;
    }
  }

  if (filtros.search) {
    where.push(`(
      CAST(b.rut_ben AS VARCHAR(20)) LIKE :search OR
      b.nom_ben LIKE :search OR
      b.pat_ben LIKE :search OR
      b.mat_ben LIKE :search
    )`);
    replacements.search = `%${filtros.search}%`;
  }

  return { where: where.join(" AND "), replacements };
}

export const beneficiarioRepository = {
  async findAll(): Promise<BeneficiarioModel[]> {
    return BeneficiarioModel.findAll();
  },

  async findByRut(rut_ben: number): Promise<BeneficiarioModel | null> {
    return BeneficiarioModel.findByPk(rut_ben);
  },

  async findListadoByRut(
    rut_ben: number,
  ): Promise<BeneficiarioListadoRow | null> {
    const rows = await sequelize.query<BeneficiarioListadoRow>(
      `SELECT
          b.rut_ben,
          b.dig_ben,
          b.nom_ben,
          b.pat_ben,
          b.mat_ben,
          b.dir_ben,
          b.reg_ben,
          r.Nom_region AS nombre_region,
          b.ciu_ben,
          c.nom_ciu AS nombre_ciudad,
          b.com_ben,
          co.nom_com AS nombre_comuna,
          CONVERT(VARCHAR(10), b.fecnac_ben, 23) AS fecnac_ben,
          b.sex_ben,
          b.tel_ben,
          b.cel_ben
       FROM dbo.BENEFICIARIOS b
       LEFT JOIN dbo.REGIONES r ON b.reg_ben = r.cod_region
       LEFT JOIN dbo.CIUDADES c ON b.ciu_ben = c.cod_ciu
       LEFT JOIN dbo.COMUNAS co ON b.com_ben = co.cod_com
       WHERE b.rut_ben = :rut_ben`,
      { replacements: { rut_ben }, type: QueryTypes.SELECT },
    );
    return rows[0] ?? null;
  },

  async findAllListado(
    filtros: ListarBeneficiariosQuery,
    comunaUsuario?: number | null,
  ): Promise<BeneficiarioListadoPaginado> {
    const { where, replacements } = buildBeneficiarioWhere(
      filtros,
      comunaUsuario,
    );
    const page = filtros.page;
    const limit = 50;
    const offset = (page - 1) * limit;
    const countRows = await sequelize.query<CountRow>(
      `SELECT COUNT(1) AS total
       FROM dbo.BENEFICIARIOS b
       LEFT JOIN dbo.REGIONES r ON b.reg_ben = r.cod_region
       LEFT JOIN dbo.CIUDADES c ON b.ciu_ben = c.cod_ciu
       LEFT JOIN dbo.COMUNAS co ON b.com_ben = co.cod_com
       WHERE ${where}`,
      { replacements, type: QueryTypes.SELECT },
    );
    const total = Number(countRows[0]?.total ?? 0);
    const data = await sequelize.query<BeneficiarioListadoRow>(
      `SELECT
          b.rut_ben,
          b.dig_ben,
          b.nom_ben,
          b.pat_ben,
          b.mat_ben,
          b.dir_ben,
          b.reg_ben,
          r.Nom_region AS nombre_region,
          b.ciu_ben,
          c.nom_ciu AS nombre_ciudad,
          b.com_ben,
          co.nom_com AS nombre_comuna,
          CONVERT(VARCHAR(10), b.fecnac_ben, 23) AS fecnac_ben,
          b.sex_ben,
          b.tel_ben,
          b.cel_ben
       FROM dbo.BENEFICIARIOS b
       LEFT JOIN dbo.REGIONES r ON b.reg_ben = r.cod_region
       LEFT JOIN dbo.CIUDADES c ON b.ciu_ben = c.cod_ciu
       LEFT JOIN dbo.COMUNAS co ON b.com_ben = co.cod_com
       WHERE ${where}
       ORDER BY b.rut_ben DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      {
        replacements: { ...replacements, offset, limit },
        type: QueryTypes.SELECT,
      },
    );
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  async findProyectosByRut(
    rut_ben: number,
  ): Promise<ProyectoBeneficiarioRow[]> {
    const registros = await BenProModel.findAll({
      where: { rut_ben },
      include: [
        {
          model: ProyectoModel,
          as: "proyecto",
          attributes: ["fol_pro", "nom_pro", "reg_pro", "ciu_pro"],
          include: [
            {
              model: RegionModel,
              as: "region",
              attributes: ["Nom_region"],
              required: false,
            },
            {
              model: CiudadModel,
              as: "ciudad",
              attributes: ["nom_ciu"],
              required: false,
            },
          ],
        },
      ],
      attributes: ["fol_pro", "ano_BenPro", "mes_benpro", "est_benpro"],
      order: [
        ["fol_pro", "ASC"],
        ["ano_BenPro", "DESC"],
        ["mes_benpro", "DESC"],
      ],
    });

    const porProyecto = new Map<number, ProyectoBeneficiarioRow>();

    for (const registro of registros) {
      const benPro = registro as BenProConProyecto;
      const fol_pro = benPro.fol_pro;
      const proyecto = benPro.proyecto ?? null;
      const fechaActual = benPro.ano_BenPro * 12 + benPro.mes_benpro;
      const valorActual = {
        fol_pro,
        nom_pro: proyecto?.nom_pro ?? null,
        ano_BenPro: benPro.ano_BenPro,
        mes_inicio: formatearMesAno(benPro.ano_BenPro, benPro.mes_benpro),
        mes_termino: formatearMesAno(benPro.ano_BenPro, benPro.mes_benpro),
        nombre_region: proyecto?.region?.Nom_region ?? null,
        nombre_ciudad: proyecto?.ciudad?.nom_ciu ?? null,
        est_benpro: benPro.est_benpro,
      };

      const actual = porProyecto.get(fol_pro) ?? valorActual;
      const fechaInicio = actual.mes_inicio
        ? Number(actual.mes_inicio.split("-")[1]) * 12 + Number(actual.mes_inicio.split("-")[0])
        : Number.POSITIVE_INFINITY;
      const fechaTermino = actual.mes_termino
        ? Number(actual.mes_termino.split("-")[1]) * 12 + Number(actual.mes_termino.split("-")[0])
        : Number.NEGATIVE_INFINITY;

      if (fechaActual < fechaInicio) {
        actual.mes_inicio = formatearMesAno(benPro.ano_BenPro, benPro.mes_benpro);
      }
      if (fechaActual > fechaTermino) {
        actual.mes_termino = formatearMesAno(benPro.ano_BenPro, benPro.mes_benpro);
      }

      actual.ano_BenPro = benPro.ano_BenPro;
      actual.est_benpro = benPro.est_benpro ?? actual.est_benpro;
      actual.nom_pro = proyecto?.nom_pro ?? actual.nom_pro;
      actual.nombre_region = proyecto?.region?.Nom_region ?? actual.nombre_region;
      actual.nombre_ciudad = proyecto?.ciudad?.nom_ciu ?? actual.nombre_ciudad;

      porProyecto.set(fol_pro, {
        ...actual,
        fol_pro,
        nom_pro: actual.nom_pro,
        ano_BenPro: actual.ano_BenPro,
        mes_inicio: actual.mes_inicio,
        mes_termino: actual.mes_termino,
        nombre_region: actual.nombre_region,
        nombre_ciudad: actual.nombre_ciudad,
        est_benpro: actual.est_benpro,
      });
    }

    return Array.from(porProyecto.values()).sort(
      (a, b) => a.fol_pro - b.fol_pro || b.ano_BenPro - a.ano_BenPro,
    );
  },

  async finBenProByRut(rut_ben: number): Promise<ProyectoBeneficiarioRow[]> {
    return this.findProyectosByRut(rut_ben);
  },

  async create(data: {
    rut_ben: number;
    dig_ben: string;
    nom_ben: string;
    pat_ben: string;
    mat_ben: string;
    dir_ben: string | null;
    reg_ben: number | null;
    fecnac_ben: string;
    usu_cre: string;
    fec_cre: Date;
    statusFicha: number;
  }): Promise<BeneficiarioModel> {
    // Insert crudo: Sequelize serializa DataTypes.DATE con offset de zona horaria,
    // lo que SQL Server rechaza para la columna datetime fecnac_ben.
    await sequelize.query(
      `INSERT INTO dbo.BENEFICIARIOS (rut_ben, dig_ben, nom_ben, pat_ben, mat_ben, dir_ben, reg_ben, fecnac_ben, usu_cre, fec_cre, statusFicha)
       VALUES (:rut_ben, :dig_ben, :nom_ben, :pat_ben, :mat_ben, :dir_ben, :reg_ben, :fecnac_ben, :usu_cre, :fec_cre, :statusFicha)`,
      { replacements: data, type: QueryTypes.INSERT },
    );
    return BeneficiarioModel.findByPk(
      data.rut_ben,
    ) as Promise<BeneficiarioModel>;
  },

  async createCompleto(
    data: CrearBeneficiarioInput & { rut_ben: number; dig_ben: string },
  ): Promise<BeneficiarioModel> {
    await sequelize.query(
      `INSERT INTO dbo.BENEFICIARIOS
        (rut_ben, dig_ben, nom_ben, pat_ben, mat_ben, dir_ben, reg_ben, ciu_ben, com_ben, fecnac_ben, sex_ben, tel_ben, cel_ben)
       VALUES
        (:rut_ben, :dig_ben, :nombres, :apellidoPaterno, :apellidoMaterno, :direccion, :region, :ciudad, :comuna, :fechaNacimiento, :sexo, :telefono, :celular)`,
      {
        replacements: {
          ...data,
          direccion: data.direccion ?? null,
          sexo:
            data.sexo === null || data.sexo === undefined
              ? null
              : String(data.sexo),
          telefono: data.telefono ?? null,
          celular: data.celular ?? null,
        },
        type: QueryTypes.INSERT,
      },
    );
    return BeneficiarioModel.findByPk(
      data.rut_ben,
    ) as Promise<BeneficiarioModel>;
  },

  async listarRegiones(): Promise<CatalogoRegionRow[]> {
    return sequelize.query<CatalogoRegionRow>(
      `SELECT cod_region, Nom_region AS nom_region
       FROM dbo.REGIONES
       ORDER BY Nom_region`,
      { type: QueryTypes.SELECT },
    );
  },

  async listarCiudades(cod_reg?: number): Promise<CatalogoCiudadRow[]> {
    return sequelize.query<CatalogoCiudadRow>(
      `SELECT cod_ciu, cod_reg, nom_ciu
       FROM dbo.CIUDADES
       ${cod_reg ? "WHERE cod_reg = :cod_reg" : ""}
       ORDER BY nom_ciu`,
      { replacements: cod_reg ? { cod_reg } : {}, type: QueryTypes.SELECT },
    );
  },

  async listarComunas(cod_ciu?: number): Promise<CatalogoComunaRow[]> {
    return sequelize.query<CatalogoComunaRow>(
      `SELECT cod_com, cod_ciu, nom_com
       FROM dbo.COMUNAS
       ${cod_ciu ? "WHERE cod_ciu = :cod_ciu" : ""}
       ORDER BY nom_com`,
      { replacements: cod_ciu ? { cod_ciu } : {}, type: QueryTypes.SELECT },
    );
  },

  // Usa una query directa porque REGIONES, CIUDADES y COMUNAS aún no tienen modelo Sequelize
  async findByRutFromBenPro(
    rut_ben: number,
  ): Promise<FichaBeneficiarioRow | null> {
    const rows = await sequelize.query<FichaBeneficiarioRow>(
      `SELECT
          b.rut_ben,
          b.nom_ben,
          b.pat_ben,
          b.mat_ben,
          b.dir_ben,
          b.reg_ben,
          r.Nom_region AS nombre_region,
          b.ciu_ben,
          c.nom_ciu AS nombre_ciudad,
          b.com_ben,
          co.nom_com AS nombre_comuna,
          b.civ_ben,
          bp.mes_benpro as ultimo_mes_benpro,
          bp.ANO_benpro as ultimo_ano_benpro,
          bp.folio_vigente as folio_vigente,
          (select count(*) from Reemplazo_benpro rbp where b.rut_ben = rbp.idBeneficiarioProyecto) as tiene_reemplazo
          FROM dbo.BENEFICIARIOS b
          LEFT JOIN dbo.REGIONES r
              ON b.reg_ben = r.cod_region
          LEFT JOIN dbo.CIUDADES c
              ON b.ciu_ben = c.cod_ciu
          LEFT JOIN dbo.COMUNAS co
              ON b.com_ben = co.cod_com
          OUTER APPLY (
              SELECT TOP 1
                  mes_benpro,
                  ANO_benpro,
                  fol_pro as folio_vigente
              FROM dbo.BENPRO
              WHERE rut_ben = b.rut_ben
              ORDER BY ano_BenPro desc, mes_benpro DESC
          ) bp
          WHERE b.rut_ben = :rut_ben`,
      { replacements: { rut_ben }, type: QueryTypes.SELECT },
    );
    return rows[0] ?? null;
  },
};
