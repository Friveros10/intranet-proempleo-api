import { Op } from "sequelize";
import { BeneficiarioModel } from "../../models/Beneficiario.model";
import { BenProModel } from "../../models/BenPro.model";
import { ProyectoModel } from "../../models/Proyecto.model";
import { RegionModel } from "../../models/Region.model";
import { CiudadModel } from "../../models/Ciudad.model";
import { ComunaModel } from "../../models/Comuna.model";
import { ReemplazoBenProyectoModel } from "../../models/ReemplazoBenProyecto.model";
import { sequelize } from "../../database/sequelize";
import {
  CompletarFichaBeneficiarioInput,
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
  status: number;
  statusFicha: number;
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

function formatearMesAno(ano: number, mes: number): string {
  return `${String(mes).padStart(2, "0")}-${ano}`;
}

// Todas las columnas fec* son datetime en SQL Server. Al pasar un Date como parámetro
// bindeado, el driver mssql lo serializa con offset ("+00:00"), formato que la columna
// rechaza. Se inserta como literal SQL ISO ("YYYY-MM-DD"), que SQL Server siempre
// interpreta sin ambigüedad, sin importar el idioma/DATEFORMAT configurado.
function fechaIsoLiteral(fechaIso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) {
    throw new Error(`Fecha con formato inválido: ${fechaIso}`);
  }
  return sequelize.literal(`'${fechaIso}'`);
}

function buildBeneficiarioWhere(
  filtros: ListarBeneficiariosQuery,
  regionUsuario?: number | null,
) {
  const and: Record<string, unknown>[] = [
    { statusFicha: { [Op.gt]: 0 } },
    { status: { [Op.gt]: 0 } },
  ];

  if (regionUsuario) {
    and.push({ reg_ben: regionUsuario });
  } else {
    if (filtros.region) {
      and.push({ reg_ben: filtros.region });
    }
    if (filtros.ciudad) {
      and.push({ ciu_ben: filtros.ciudad });
    }
    if (filtros.comuna) {
      and.push({ com_ben: filtros.comuna });
    }
  }

  if (filtros.search) {
    const termino = `%${filtros.search}%`;
    and.push({
      [Op.or]: [
        sequelize.where(sequelize.cast(sequelize.col("rut_ben"), "VARCHAR(20)"), {
          [Op.like]: termino,
        }),
        { nom_ben: { [Op.like]: termino } },
        { pat_ben: { [Op.like]: termino } },
        { mat_ben: { [Op.like]: termino } },
      ],
    });
  }

  return { [Op.and]: and };
}

// Atributos e includes compartidos por los listados de beneficiarios: agrega los
// nombres de región/ciudad/comuna vía LEFT JOIN y formatea fecnac_ben sin hora.
const ATRIBUTOS_LISTADO: any[] = [
  "rut_ben",
  "dig_ben",
  "nom_ben",
  "pat_ben",
  "mat_ben",
  "dir_ben",
  "reg_ben",
  "ciu_ben",
  "com_ben",
  [
    sequelize.fn("CONVERT", sequelize.literal("VARCHAR(10)"), sequelize.col("fecnac_ben"), 23),
    "fecnac_ben",
  ],
  "sex_ben",
  "tel_ben",
  "cel_ben",
  "status",
  "statusFicha",
  [sequelize.col("region.Nom_region"), "nombre_region"],
  [sequelize.col("ciudad.nom_ciu"), "nombre_ciudad"],
  [sequelize.col("comuna.nom_com"), "nombre_comuna"],
];

const INCLUDES_LISTADO = [
  { model: RegionModel, as: "region", attributes: [], required: false },
  { model: CiudadModel, as: "ciudad", attributes: [], required: false },
  { model: ComunaModel, as: "comuna", attributes: [], required: false },
];

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
    const row = await BeneficiarioModel.findOne({
      where: { rut_ben },
      attributes: ATRIBUTOS_LISTADO,
      include: INCLUDES_LISTADO,
      raw: true,
    });
    return (row as unknown as BeneficiarioListadoRow) ?? null;
  },

  async findAllListado(
    filtros: ListarBeneficiariosQuery,
    regionUsuario?: number | null,
  ): Promise<BeneficiarioListadoPaginado> {
    const where = buildBeneficiarioWhere(filtros, regionUsuario);
    const page = filtros.page;
    const limit = 50;
    const offset = (page - 1) * limit;
    const { count, rows } = await BeneficiarioModel.findAndCountAll({
      where,
      attributes: ATRIBUTOS_LISTADO,
      include: INCLUDES_LISTADO,
      order: [["statusFicha", "ASC"]],
      limit,
      offset,
      subQuery: false,
      raw: true,
    });

    return {
      data: rows as unknown as BeneficiarioListadoRow[],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
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
    // console.log("[beneficiarioRepository.create] data recibida:", data);
    // fecnac_ben llega como "DD-MM-YYYY"; se convierte a "YYYY-MM-DD" antes de armar el literal.
    const [dia, mes, anio] = data.fecnac_ben.split("-").map(Number);
    const fecnac_ben = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    // console.log("[beneficiarioRepository.create] fecnac_ben parseada:", fecnac_ben);

    try {
      const creado = await BeneficiarioModel.create({
        rut_ben: data.rut_ben,
        dig_ben: data.dig_ben,
        nom_ben: data.nom_ben,
        pat_ben: data.pat_ben,
        mat_ben: data.mat_ben,
        dir_ben: data.dir_ben,
        reg_ben: data.reg_ben,
        fecnac_ben: fechaIsoLiteral(fecnac_ben) as unknown as Date,
        usu_cre: data.usu_cre,
        fec_cre: sequelize.fn("GETDATE") as unknown as Date,
        status: 1,
        statusFicha: data.statusFicha,
      });
      // console.log("[beneficiarioRepository.create] beneficiario creado:", creado.toJSON());
      return creado;
    } catch (error) {
      // console.log("[beneficiarioRepository.create] error al crear beneficiario:", error);
      throw error;
    }
  },

  async createCompleto(
    data: CrearBeneficiarioInput & { rut_ben: number; dig_ben: string },
  ): Promise<BeneficiarioModel> {
    // console.log("[beneficiarioRepository.createCompleto] data recibida:", data);
    // fechaNacimiento llega como "YYYY-MM-DD" (formato ISO).
    // console.log("[beneficiarioRepository.createCompleto] fecnac_ben:", data.fechaNacimiento);

    try {
      const creado = await BeneficiarioModel.create({
        rut_ben: data.rut_ben,
        dig_ben: data.dig_ben,
        nom_ben: data.nombres,
        pat_ben: data.apellidoPaterno,
        mat_ben: data.apellidoMaterno,
        dir_ben: data.direccion ?? null,
        reg_ben: data.region,
        ciu_ben: data.ciudad,
        com_ben: data.comuna,
        fecnac_ben: fechaIsoLiteral(data.fechaNacimiento) as unknown as Date,
        sex_ben:
          data.sexo === null || data.sexo === undefined
            ? null
            : String(data.sexo),
        tel_ben: data.telefono ?? null,
        cel_ben: data.celular ?? null,
        status: 1,
        statusFicha: 2,
      });
      // console.log("[beneficiarioRepository.createCompleto] beneficiario creado:", creado.toJSON());
      return creado;
    } catch (error) {
      console.log("[beneficiarioRepository.createCompleto] error al crear beneficiario:", error);
      throw error;
    }
  },

  async eliminar(rut_ben: number, usu_eli: string): Promise<number> {
    const [affected] = await BeneficiarioModel.update(
      { status: -1, usu_eli, fec_eli: sequelize.fn("GETDATE") as unknown as Date },
      { where: { rut_ben, status: { [Op.gt]: 0 } } },
    );
    return affected ?? 0;
  },

  async completarFicha(
    rut_ben: number,
    data: CompletarFichaBeneficiarioInput,
    usu_mod: string,
  ): Promise<BeneficiarioModel> {
    await BeneficiarioModel.update(
      {
        ciu_ben: data.ciudad,
        com_ben: data.comuna,
        reg_ben: data.region,
        dir_ben: data.direccion ?? null,
        sex_ben:
          data.sexo === null || data.sexo === undefined
            ? null
            : String(data.sexo),
        tel_ben: data.telefono ?? null,
        cel_ben: data.celular ?? null,
        statusFicha: 2,
        usu_mod,
        fec_mod: sequelize.fn("GETDATE") as unknown as Date,
      },
      { where: { rut_ben } },
    );
    return BeneficiarioModel.findByPk(rut_ben) as Promise<BeneficiarioModel>;
  },

  async listarRegiones(): Promise<CatalogoRegionRow[]> {
    const regiones = await RegionModel.findAll({
      attributes: ["cod_region", ["Nom_region", "nom_region"]],
      order: [["Nom_region", "ASC"]],
      raw: true,
    });
    return regiones as unknown as CatalogoRegionRow[];
  },

  async listarCiudades(cod_reg?: number): Promise<CatalogoCiudadRow[]> {
    const ciudades = await CiudadModel.findAll({
      attributes: ["cod_ciu", "cod_reg", "nom_ciu"],
      where: cod_reg ? { cod_reg } : undefined,
      order: [["nom_ciu", "ASC"]],
      raw: true,
    });
    return ciudades as unknown as CatalogoCiudadRow[];
  },

  async listarComunas(cod_ciu?: number): Promise<CatalogoComunaRow[]> {
    const comunas = await ComunaModel.findAll({
      attributes: ["cod_com", "cod_ciu", "nom_com"],
      where: cod_ciu ? { cod_ciu } : undefined,
      order: [["nom_com", "ASC"]],
      raw: true,
    });
    return comunas as unknown as CatalogoComunaRow[];
  },

  // El folio vigente y el último mes/año de BenPro se resuelven con el registro más
  // reciente (equivalente a la fila TOP 1 que antes entregaba el OUTER APPLY).
  async findByRutFromBenPro(
    rut_ben: number,
  ): Promise<FichaBeneficiarioRow | null> {
    const beneficiario = await BeneficiarioModel.findOne({
      where: { rut_ben },
      attributes: [
        "rut_ben",
        "nom_ben",
        "pat_ben",
        "mat_ben",
        "dir_ben",
        "reg_ben",
        "ciu_ben",
        "com_ben",
        "civ_ben",
        [sequelize.col("region.Nom_region"), "nombre_region"],
        [sequelize.col("ciudad.nom_ciu"), "nombre_ciudad"],
        [sequelize.col("comuna.nom_com"), "nombre_comuna"],
      ],
      include: INCLUDES_LISTADO,
      raw: true,
    });
    if (!beneficiario) return null;

    const [ultimoBenPro, tieneReemplazo] = await Promise.all([
      BenProModel.findOne({
        where: { rut_ben },
        attributes: ["mes_benpro", "ano_BenPro", "fol_pro"],
        order: [
          ["ano_BenPro", "DESC"],
          ["mes_benpro", "DESC"],
        ],
        raw: true,
      }),
      ReemplazoBenProyectoModel.count({
        where: { idBeneficiarioProyecto: rut_ben },
      }),
    ]);

    return {
      ...(beneficiario as unknown as FichaBeneficiarioRow),
      ultimo_mes_benpro: ultimoBenPro?.mes_benpro ?? null,
      ultimo_ano_benpro: ultimoBenPro?.ano_BenPro ?? null,
      folio_vigente: (ultimoBenPro?.fol_pro ?? null) as unknown as number,
      tiene_reemplazo: tieneReemplazo,
    };
  },
};
