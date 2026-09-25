import { usuarioSicapRepository } from "../repositories/sicap/usuarioSicap.repository";
import { RolSicapModel } from "../models/RolSicap.model";
import {
  toSafeUsuarioSicap,
  UsuarioSicapModel,
} from "../models/UsuarioSicap.model";
import { AppError } from "../utils/AppError";
import { parseRut } from "../utils/rut";
import { compararPasswordLegacy } from "../utils/password";
import { CORR_ROL_VALIDOS, esCorrRolValido } from "../constants/roles";
import { Op } from "sequelize";
import {
  ActualizarDatosPersonalesInput,
  CambiarClaveInput,
  CrearUsuarioInput,
} from "../validations/usuario.validation";

// Quita tildes/espacios y deja solo caracteres alfabéticos en minúsculas
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

// log_usu = primera letra del nombre + apellido paterno completo + primera letra del apellido materno
function generarLogUsuBase(
  nom_usu: string,
  pat_usu: string,
  mat_usu: string,
): string {
  const nombre = normalizar(nom_usu);
  const paterno = normalizar(pat_usu);
  const materno = normalizar(mat_usu);
  return `${nombre.charAt(0)}${paterno}${materno.charAt(0)}`;
}

// cla_usu (clave temporal) = primeros 4 dígitos del RUT + iniciales de nombre, apellido paterno y materno
function generarClaveTemporal(
  rut_usu: number,
  nom_usu: string,
  pat_usu: string,
  mat_usu: string,
): string {
  const nombre = normalizar(nom_usu);
  const paterno = normalizar(pat_usu);
  const materno = normalizar(mat_usu);
  const prefijoRut = String(rut_usu).slice(0, 4);
  return `${prefijoRut}${nombre.charAt(0)}${paterno.charAt(0)}${materno.charAt(0)}`;
}

async function generarLoginUnico(base: string): Promise<string> {
  let candidato = base;
  let sufijo = 1;
  while (await usuarioSicapRepository.existeLogin(candidato)) {
    sufijo += 1;
    candidato = `${base}${sufijo}`;
  }
  return candidato;
}

function usuarioSeguro(usuario: UsuarioSicapModel) {
  return toSafeUsuarioSicap(usuario.get({ plain: true }));
}

export const usuarioService = {
  async listar() {
    return usuarioSicapRepository.findAllPerfilesValidos();
  },

  async listarRoles() {
    return RolSicapModel.findAll({
      where: { corr_rol: { [Op.in]: [...CORR_ROL_VALIDOS] } },
      order: [["nom_rol", "ASC"]],
    });
  },

  async crear(data: CrearUsuarioInput, rutAdmin: number) {
    const { cuerpo: rut_usu, dv: dig_usu } = parseRut(data.rut);

    const existente = await usuarioSicapRepository.findByRut(rut_usu);
    if (existente) {
      throw new AppError("El usuario ya existe", 409);
    }

    const rol = await RolSicapModel.findByPk(data.corr_rol);
    if (!rol || !esCorrRolValido(rol.corr_rol)) {
      throw new AppError("El perfil seleccionado no es válido", 400);
    }

    const logUsuBase = generarLogUsuBase(
      data.nom_usu,
      data.pat_usu,
      data.mat_usu,
    );
    const log_usu = await generarLoginUnico(logUsuBase);
    const cla_usu = generarClaveTemporal(
      rut_usu,
      data.nom_usu,
      data.pat_usu,
      data.mat_usu,
    );

    const usuarioAdmin = await usuarioSicapRepository.findByRut(rutAdmin);

    await usuarioSicapRepository.crear({
      rut_usu,
      dig_usu,
      nom_usu: data.nom_usu,
      pat_usu: data.pat_usu,
      mat_usu: data.mat_usu,
      reg_usu: data.reg_usu,
      corr_rol: data.corr_rol,
      log_usu,
      cla_usu,
      usu_cre: usuarioAdmin?.log_usu ?? String(rutAdmin),
    });

    const creado = await usuarioSicapRepository.findByRut(rut_usu);
    return creado ? usuarioSeguro(creado) : null;
  },

  async obtenerPerfil(rutUsuario: number) {
    const usuario = await usuarioSicapRepository.findByRut(rutUsuario);
    if (!usuario) {
      throw new AppError("Usuario no encontrado", 404);
    }
    return usuarioSeguro(usuario);
  },

  async actualizarPerfil(
    rutUsuario: number,
    data: ActualizarDatosPersonalesInput,
  ) {
    const usuario = await usuarioSicapRepository.findByRut(rutUsuario);
    if (!usuario) {
      throw new AppError("Usuario no encontrado", 404);
    }

    await usuarioSicapRepository.actualizarDatosPersonales(rutUsuario, {
      dir_usu: data.dir_usu ?? null,
      ciu_usu: data.ciu_usu ?? null,
      com_usu: data.com_usu ?? null,
      ema_usu: data.ema_usu ?? null,
    });

    const actualizado = await usuarioSicapRepository.findByRut(rutUsuario);
    return actualizado ? usuarioSeguro(actualizado) : null;
  },

  async cambiarClave(rutUsuario: number, data: CambiarClaveInput) {
    const usuario = await usuarioSicapRepository.findByRut(rutUsuario);
    if (!usuario) {
      throw new AppError("Usuario no encontrado", 404);
    }

    const claveValida = compararPasswordLegacy(
      data.claveActual,
      usuario.cla_usu,
    );
    if (!claveValida) {
      throw new AppError("La contraseña actual no es correcta", 400);
    }

    // Se guarda en texto plano por ahora, siguiendo el esquema legacy de dbo.Usuario
    await usuarioSicapRepository.cambiarClave(rutUsuario, data.claveNueva);
  },
};
