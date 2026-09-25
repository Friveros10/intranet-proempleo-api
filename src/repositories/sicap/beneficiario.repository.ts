import { QueryTypes } from "sequelize";
import { BeneficiarioModel } from "../../models/Beneficiario.model";
import { BenProModel } from "../../models/BenPro.model";
import { ProyectoModel } from "../../models/Proyecto.model";
import { RegionModel } from "../../models/Region.model";
import { CiudadModel } from "../../models/Ciudad.model";
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

interface CountRow {
  total: number;
}

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
  comunaUsuario?: number | null,
) {
  const where: string[] = ["b.statusFicha > 0", "b.status > 0"];
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
          b.cel_ben,
          b.status,
          b.statusFicha
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
          b.cel_ben,
          b.status,
          b.statusFicha
       FROM dbo.BENEFICIARIOS b
       LEFT JOIN dbo.REGIONES r ON b.reg_ben = r.cod_region
       LEFT JOIN dbo.CIUDADES c ON b.ciu_ben = c.cod_ciu
       LEFT JOIN dbo.COMUNAS co ON b.com_ben = co.cod_com
       WHERE ${where}
       ORDER BY statusFicha asc
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
    console.log("[beneficiarioRepository.create] data recibida:", data);
    // fecnac_ben llega como "DD-MM-YYYY"; se convierte a "YYYY-MM-DD" antes de armar el literal.
    const [dia, mes, anio] = data.fecnac_ben.split("-").map(Number);
    const fecnac_ben = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    console.log("[beneficiarioRepository.create] fecnac_ben parseada:", fecnac_ben);

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
      console.log("[beneficiarioRepository.create] beneficiario creado:", creado.toJSON());
      return creado;
    } catch (error) {
      console.log("[beneficiarioRepository.create] error al crear beneficiario:", error);
      throw error;
    }
  },

  async createCompleto(
    data: CrearBeneficiarioInput & { rut_ben: number; dig_ben: string },
  ): Promise<BeneficiarioModel> {
    console.log("[beneficiarioRepository.createCompleto] data recibida:", data);
    // fechaNacimiento llega como "YYYY-MM-DD" (formato ISO).
    console.log("[beneficiarioRepository.createCompleto] fecnac_ben:", data.fechaNacimiento);

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
      console.log("[beneficiarioRepository.createCompleto] beneficiario creado:", creado.toJSON());
      return creado;
    } catch (error) {
      console.log("[beneficiarioRepository.createCompleto] error al crear beneficiario:", error);
      throw error;
    }
  },

  async eliminar(rut_ben: number, usu_eli: string): Promise<number> {
    const [, affected] = await sequelize.query(
      `UPDATE dbo.BENEFICIARIOS
       SET status = -1, usu_eli = :usu_eli, fec_eli = GETDATE()
       WHERE rut_ben = :rut_ben AND status > 0`,
      { replacements: { rut_ben, usu_eli }, type: QueryTypes.UPDATE },
    );
    return affected ?? 0;
  },

  async completarFicha(
    rut_ben: number,
    data: CompletarFichaBeneficiarioInput,
    usu_mod: string,
  ): Promise<BeneficiarioModel> {
    await sequelize.query(
      `UPDATE dbo.BENEFICIARIOS
       SET ciu_ben = :ciudad,
           com_ben = :comuna,
           reg_ben = :region,
           dir_ben = :direccion,
           sex_ben = :sexo,
           tel_ben = :telefono,
           cel_ben = :celular,
           statusFicha = 2,
           usu_mod = :usu_mod,
           fec_mod = GETDATE()
       WHERE rut_ben = :rut_ben`,
      {
        replacements: {
          rut_ben,
          region: data.region,
          ciudad: data.ciudad,
          comuna: data.comuna,
          direccion: data.direccion ?? null,
          sexo:
            data.sexo === null || data.sexo === undefined
              ? null
              : String(data.sexo),
          telefono: data.telefono ?? null,
          celular: data.celular ?? null,
          usu_mod,
        },
        type: QueryTypes.UPDATE,
      },
    );
    return BeneficiarioModel.findByPk(rut_ben) as Promise<BeneficiarioModel>;
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
