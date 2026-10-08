import { IncludeOptions, Op, WhereOptions } from "sequelize";
import {
  Beneficiario,
  BeneficiarioModel,
} from "../../models/Beneficiario.model";
import { BeneficiarioProempleoModel } from "../../models/BeneficiarioProempleo.model";
import { BeneficiarioConsulta, BeneficiarioConsultaModel } from "../../models/BeneficiarioConsulta.model";
import { BenProModel } from "../../models/BenPro.model";
import { ProyectoModel } from "../../models/Proyecto.model";
import { RegionModel } from "../../models/Region.model";
import { CiudadModel } from "../../models/Ciudad.model";
import { ComunaModel } from "../../models/Comuna.model";
import { ReemplazoBenProyectoModel } from "../../models/ReemplazoBenProyecto.model";
import { sequelize } from "../../database/sequelize";
import { AppError } from "../../utils/AppError";
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
  sex_ben: string | null;
  est_ben: string | null;
  etn_ben: string | null;
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
  email_ben: string | null;
  status: number;
  statusFicha: number;
  origen: "historico" | "proempleo";
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

// Resumen del beneficiario usado por el flujo de reemplazos (misma forma que
// entregaba el include legacy de BeneficiarioModel).
export interface BeneficiarioResumenRow {
  rut_ben: number;
  dig_ben: string | null;
  nom_ben: string | null;
  pat_ben: string | null;
  mat_ben: string | null;
  fecnac_ben: string | null;
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
  proyecto?:
    | (ProyectoModel & {
        region?: {
          Nom_region?: string | null;
        } | null;
        ciudad?: {
          nom_ciu?: string | null;
        } | null;
      })
    | null;
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

function incluirCatalogos(): IncludeOptions[] {
  return [
    { model: RegionModel, as: "region", attributes: ["Nom_region"], required: false },
    {
      model: CiudadModel, as: "ciudad", attributes: ["nom_ciu"],
      where: { estado: "ACTIVO" }, required: false,
    },
    { model: ComunaModel, as: "comuna", attributes: ["nom_com"], required: false },
  ];
}

function mapearListado(model: BeneficiarioConsultaModel): BeneficiarioListadoRow {
  const ben = model.get();
  return {
    rut_ben: ben.rut_ben,
    dig_ben: ben.dig_ben,
    nom_ben: ben.nom_ben,
    pat_ben: ben.pat_ben,
    mat_ben: ben.mat_ben,
    dir_ben: ben.dir_ben,
    reg_ben: ben.reg_ben,
    ciu_ben: ben.ciu_ben,
    com_ben: ben.com_ben,
    nombre_region: model.region?.Nom_region ?? null,
    nombre_ciudad: model.ciudad?.nom_ciu ?? null,
    nombre_comuna: model.comuna?.nom_com ?? null,
    fecnac_ben: ben.fecnac_ben,
    sex_ben: ben.sex_ben,
    tel_ben: ben.tel_ben,
    cel_ben: ben.cel_ben,
    email_ben: ben.email_ben,
    status: ben.status,
    statusFicha: ben.statusFicha,
    origen: ben.origen,
  };
}

function buildListadoWhere(
  filtros: ListarBeneficiariosQuery,
  regionUsuario?: number | null,
): WhereOptions<BeneficiarioConsulta> {
  const condiciones: WhereOptions<BeneficiarioConsulta>[] = [
    { statusFicha: { [Op.gt]: 0 }, status: { [Op.gt]: 0 } },
  ];

  if (regionUsuario) {
    condiciones.push({ reg_ben: regionUsuario });
  } else {
    if (filtros.region) {
      condiciones.push({ reg_ben: filtros.region });
    }
    if (filtros.ciudad) {
      condiciones.push({ ciu_ben: filtros.ciudad });
    }
    if (filtros.comuna) {
      condiciones.push({ com_ben: filtros.comuna });
    }
  }

  if (filtros.search) {
    const search = { [Op.like]: `%${filtros.search}%` };
    condiciones.push({
      [Op.or]: [
        sequelize.where(sequelize.cast(sequelize.col("BeneficiarioConsultaModel.rut_ben"), "VARCHAR(20)"), search),
        { nom_ben: search },
        { pat_ben: search },
        { mat_ben: search },
      ],
    });
  }

  return { [Op.and]: condiciones };
}

// Normaliza un registro de beneficiarios_proempleo a la forma legacy (interfaz
// Beneficiario), para que los consumidores existentes sigan funcionando igual.
function mapearProempleoALegacy(p: BeneficiarioProempleoModel): Beneficiario {
  return {
    rut_ben: p.rutBeneficiario,
    dig_ben: p.digitoVerificador,
    nom_ben: p.nombres,
    pat_ben: p.apellidoPaterno,
    mat_ben: p.apellidoMaterno,
    dir_ben: p.direccion,
    reg_ben: p.idRegion,
    ciu_ben: p.idCiudad,
    com_ben: p.idComuna,
    civ_ben: null,
    nac_ben: null,
    fecnac_ben: p.fechaNacimiento,
    tra_ben: null,
    car_ben: null,
    sex_ben: p.sexo,
    jefhog_ben: null,
    nivedu_ben: p.nivelEducacional,
    usu_cre: p.usuarioCreacion,
    fec_cre: p.fechaCreacion,
    usu_mod: p.usuarioModificacion,
    fec_mod: p.fechaModificacion,
    usu_eli: p.usuarioEliminacion,
    fec_eli: p.fechaEliminacion,
    est_ben: null,
    etn_ben: p.etnia,
    idchs_ben: null,
    dis_ben: null,
    aredes_ben: null,
    pan_ben: null,
    con_ben: null,
    peninh_ben: null,
    cerdes_ben: null,
    eda_ben: null,
    chs_ben: null,
    idcerdes_ben: null,
    cod_RC: null,
    fec_RC: null,
    usu_apr: null,
    fec_apr: null,
    usu_imp: null,
    fec_imp: null,
    key_imp: null,
    fm_ben: null,
    fs_ben: null,
    tel_ben: p.telefono,
    ano_ben: null,
    corr_mar: null,
    cod_cel_ben: null,
    cel_ben: p.celular,
    cod_tel_ben: null,
    tip_mar: null,
    telrec_ben: null,
    codtelrec_ben: null,
  };
}

export const beneficiarioRepository = {
  async findAll(): Promise<BeneficiarioModel[]> {
    return BeneficiarioModel.findAll();
  },

  // Busca primero en beneficiarios_proempleo (registros nuevos) y luego en la
  // tabla legacy BENEFICIARIOS. Siempre devuelve la forma legacy de la interfaz.
  async findByRut(rut_ben: number): Promise<Beneficiario | null> {
    const proempleo = await BeneficiarioProempleoModel.findOne({
      where: { rutBeneficiario: rut_ben },
    });
    if (proempleo) {
      return mapearProempleoALegacy(proempleo);
    }
    return BeneficiarioModel.findByPk(rut_ben);
  },

  async findListadoByRut(
    rut_ben: number,
  ): Promise<BeneficiarioListadoRow | null> {
    const row = await BeneficiarioConsultaModel.findOne({
      where: { rut_ben },
      include: incluirCatalogos(),
      order: [["origen", "DESC"]],
    });
    return row ? mapearListado(row) : null;
  },

  // Resuelve los datos básicos de beneficiarios en ambas tablas (legacy +
  // beneficiarios_proempleo) para un conjunto de RUTs. Usado por reemplazos.
  async findResumenesPorRuts(
    ruts: number[],
  ): Promise<Map<number, BeneficiarioResumenRow>> {
    if (ruts.length === 0) {
      return new Map();
    }
    const rows = await BeneficiarioConsultaModel.findAll({
      attributes: ["rut_ben", "dig_ben", "nom_ben", "pat_ben", "mat_ben", "fecnac_ben"],
      where: { rut_ben: { [Op.in]: ruts } },
      order: [["origen", "ASC"]],
    });
    return new Map(rows.map((row) => {
      const ben = row.get();
      const resumen: BeneficiarioResumenRow = {
        rut_ben: ben.rut_ben, dig_ben: ben.dig_ben, nom_ben: ben.nom_ben,
        pat_ben: ben.pat_ben, mat_ben: ben.mat_ben, fecnac_ben: ben.fecnac_ben,
      };
      return [ben.rut_ben, resumen];
    }));
  },

  async findAllListado(
    filtros: ListarBeneficiariosQuery,
    regionUsuario?: number | null,
  ): Promise<BeneficiarioListadoPaginado> {
    const page = filtros.page;
    const limit = 50;
    const offset = (page - 1) * limit;
    const where = buildListadoWhere(filtros, regionUsuario);

    const [rows, total] = await Promise.all([
      BeneficiarioConsultaModel.findAll({
        where,
        include: incluirCatalogos(),
        order: [["origen", "DESC"], ["statusFicha", "ASC"], ["rut_ben", "ASC"]],
        offset,
        limit,
      }),
      BeneficiarioConsultaModel.count({ where }),
    ]);

    return {
      data: rows.map(mapearListado),
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
        ? Number(actual.mes_inicio.split("-")[1]) * 12 +
          Number(actual.mes_inicio.split("-")[0])
        : Number.POSITIVE_INFINITY;
      const fechaTermino = actual.mes_termino
        ? Number(actual.mes_termino.split("-")[1]) * 12 +
          Number(actual.mes_termino.split("-")[0])
        : Number.NEGATIVE_INFINITY;

      if (fechaActual < fechaInicio) {
        actual.mes_inicio = formatearMesAno(
          benPro.ano_BenPro,
          benPro.mes_benpro,
        );
      }
      if (fechaActual > fechaTermino) {
        actual.mes_termino = formatearMesAno(
          benPro.ano_BenPro,
          benPro.mes_benpro,
        );
      }

      actual.ano_BenPro = benPro.ano_BenPro;
      actual.est_benpro = benPro.est_benpro ?? actual.est_benpro;
      actual.nom_pro = proyecto?.nom_pro ?? actual.nom_pro;
      actual.nombre_region =
        proyecto?.region?.Nom_region ?? actual.nombre_region;
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

  async createProempleo(data: {
    rut_ben: number;
    dig_ben: string;
    nom_ben: string;
    pat_ben: string;
    mat_ben: string;
    dir_ben: string | null;
    reg_ben: number | null;
    fecnac_ben: string;
    sex_ben?: string | null;
    etn_ben?: string | null;
    nivedu_ben?: string | null;
    usu_cre: string;
    fec_cre: Date;
    statusFicha: number;
  }): Promise<BeneficiarioProempleoModel> {
    // fecnac_ben llega como "DD-MM-YYYY"; se convierte a "YYYY-MM-DD" antes de armar el literal.
    const [dia, mes, anio] = data.fecnac_ben.split("-").map(Number);
    const fecnac_ben = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

    const creado = await BeneficiarioProempleoModel.create({
      rutBeneficiario: data.rut_ben,
      digitoVerificador: data.dig_ben,
      nombres: data.nom_ben,
      apellidoPaterno: data.pat_ben,
      apellidoMaterno: data.mat_ben,
      direccion: data.dir_ben,
      idRegion: data.reg_ben,
      sexo: data.sex_ben ?? null,
      etnia: data.etn_ben ?? null,
      nivelEducacional: data.nivedu_ben ?? null,
      fechaNacimiento: fechaIsoLiteral(fecnac_ben) as unknown as Date,
      usuarioCreacion: data.usu_cre,
      fechaCreacion: sequelize.fn("GETDATE") as unknown as Date,
      status: 1,
      statusFicha: data.statusFicha,
    });
    return creado;
  },

  async createCompleto(
    data: CrearBeneficiarioInput & { rut_ben: number; dig_ben: string },
    usu_cre?: string,
  ): Promise<BeneficiarioProempleoModel> {
    // fechaNacimiento llega como "YYYY-MM-DD" (formato ISO).
    const creado = await BeneficiarioProempleoModel.create({
      rutBeneficiario: data.rut_ben,
      digitoVerificador: data.dig_ben,
      nombres: data.nombres,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno,
      direccion: data.direccion ?? null,
      idRegion: data.region,
      idCiudad: data.ciudad,
      idComuna: data.comuna,
      fechaNacimiento: fechaIsoLiteral(data.fechaNacimiento) as unknown as Date,
      sexo:
        data.sexo === null || data.sexo === undefined
          ? null
          : String(data.sexo),
      telefono: data.telefono ?? null,
      celular: data.celular ?? null,
      usuarioCreacion: usu_cre ?? null,
      fechaCreacion: sequelize.fn("GETDATE") as unknown as Date,
      status: 1,
      statusFicha: 2,
    });
    return creado;
  },

  // BENEFICIARIOS es historica: las escrituras solo usan beneficiarios_proempleo.
  async eliminar(rut_ben: number, usu_eli: string): Promise<number> {
    await this.findProempleoEditable(rut_ben);
    const [afectadosProempleo] = await BeneficiarioProempleoModel.update(
      {
        status: -1,
        usuarioEliminacion: usu_eli,
        fechaEliminacion: sequelize.fn("GETDATE") as unknown as Date,
      },
      { where: { rutBeneficiario: rut_ben, status: { [Op.gt]: 0 } } },
    );
    return afectadosProempleo;
  },

  async findProempleoEditable(rut_ben: number): Promise<BeneficiarioProempleoModel> {
    const proempleo = await BeneficiarioProempleoModel.findOne({
      where: { rutBeneficiario: rut_ben },
    });
    if (!proempleo) {
      const historico = await BeneficiarioModel.findByPk(rut_ben);
      if (historico) {
        throw new AppError("Los beneficiarios historicos son de solo lectura", 403);
      }
      throw new AppError("Beneficiario no encontrado", 404);
    }
    return proempleo;
  },

  async completarFicha(
    rut_ben: number,
    data: CompletarFichaBeneficiarioInput,
    usu_mod: string,
  ): Promise<void> {
    const proempleo = await this.findProempleoEditable(rut_ben);
    if (proempleo.status <= 0) {
      throw new AppError("El beneficiario ya se encuentra eliminado", 409);
    }
    const [afectados] = await BeneficiarioProempleoModel.update(
      {
        idCiudad: data.ciudad,
        idComuna: data.comuna,
        idRegion: data.region,
        direccion: data.direccion ?? null,
        telefono: data.telefono ?? null,
        celular: data.celular ?? null,
        email: data.email_ben ?? null,
        statusFicha: 2,
        usuarioModificacion: usu_mod,
        fechaModificacion: sequelize.fn("GETDATE") as unknown as Date,
      },
      { where: { rutBeneficiario: rut_ben, status: { [Op.gt]: 0 } } },
    );
    if (afectados === 0) {
      throw new AppError("El beneficiario ya se encuentra eliminado", 409);
    }
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
      where: {
        ...(cod_reg ? { cod_reg } : {}),
        estado: "ACTIVO",
      },
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
    const registro = await BeneficiarioConsultaModel.findOne({
      where: { rut_ben },
      include: incluirCatalogos(),
      order: [["origen", "DESC"]],
    });
    if (!registro) return null;
    const ben = registro.get();
    const beneficiario = mapearListado(registro);

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
      rut_ben: ben.rut_ben,
      nom_ben: ben.nom_ben,
      pat_ben: ben.pat_ben,
      mat_ben: ben.mat_ben,
      dir_ben: ben.dir_ben,
      reg_ben: ben.reg_ben,
      ciu_ben: ben.ciu_ben,
      com_ben: ben.com_ben,
      civ_ben: ben.civ_ben,
      sex_ben: ben.sex_ben,
      est_ben: ben.est_ben,
      etn_ben: ben.etn_ben,
      nombre_region: beneficiario.nombre_region,
      nombre_ciudad: beneficiario.nombre_ciudad,
      nombre_comuna: beneficiario.nombre_comuna,
      ultimo_mes_benpro: ultimoBenPro?.mes_benpro ?? null,
      ultimo_ano_benpro: ultimoBenPro?.ano_BenPro ?? null,
      folio_vigente: (ultimoBenPro?.fol_pro ?? null) as unknown as number,
      tiene_reemplazo: tieneReemplazo,
    };
  },
};
