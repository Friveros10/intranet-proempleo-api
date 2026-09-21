import { reemplazoBenProyectoRepository, ReemplazoFiltros } from '../repositories/reemplazoBenProyecto.repository';
import { docReemplazoBenProyectoRepository } from '../repositories/docReemplazoBenProyecto.repository';
import { beneficiarioRepository } from '../repositories/sicap/beneficiario.repository';
import { proyectoRepository } from '../repositories/sicap/proyecto.repository';
import { regionRepository } from '../repositories/sicap/region.repository';
import { usuarioSicapRepository } from '../repositories/sicap/usuarioSicap.repository';
import { AppError } from '../utils/AppError';
import { parseRut } from '../utils/rut';
import { esDocumentoReemplazoValido } from '../constants/documentosReemplazo';
import { guardarDocumentoEnDisco } from '../middlewares/upload.middleware';
import { CrearReemplazoInput } from '../validations/reemplazoBenProyecto.validation';
import { ReemplazoStatus } from '../models/ReemplazoBenProyecto';

const PERMISO_VER_TODAS_REGIONES = 'REM_VERALL';
const PERMISO_APROBAR = 'REM_APROB';
const PERMISO_RECHAZAR = 'REM_RECHAZ';

interface ContextoUsuario {
  regionUsuario: number | null;
  puedeVerTodasLasRegiones: boolean;
  permisos: string[];
}

async function obtenerContextoUsuario(rutUsuario: number): Promise<ContextoUsuario> {
  const [usuario, permisos] = await Promise.all([
    usuarioSicapRepository.findByRut(rutUsuario),
    usuarioSicapRepository.getPermisosDeUsuario(rutUsuario),
  ]);

  return {
    regionUsuario: usuario?.reg_usu ?? null,
    puedeVerTodasLasRegiones: permisos.includes(PERMISO_VER_TODAS_REGIONES),
    permisos,
  };
}

export const reemplazoBenProyectoService = {
  // Un usuario sin permiso "ver todas las regiones" (ej. INTENDENCIA) solo ve los
  // reemplazos de proyectos de su propia región, sin importar lo que pida por query.
  async listar(filtros: ReemplazoFiltros, rutUsuario: number) {
    const contexto = await obtenerContextoUsuario(rutUsuario);
    const region = contexto.puedeVerTodasLasRegiones ? filtros.region : contexto.regionUsuario ?? -1;
    return reemplazoBenProyectoRepository.findAll({ ...filtros, region: region ?? undefined });
  },

  async listarRegiones() {
    return regionRepository.findAll();
  },

  async obtenerPorId(id: number, rutUsuario: number) {
    const reemplazo = await reemplazoBenProyectoRepository.findById(id);
    if (!reemplazo) {
      throw new AppError('Reemplazo no encontrado', 404);
    }

    const contexto = await obtenerContextoUsuario(rutUsuario);
    if (!contexto.puedeVerTodasLasRegiones && reemplazo.proyecto?.reg_pro !== contexto.regionUsuario) {
      throw new AppError('No tiene acceso a este registro', 403);
    }

    return reemplazo;
  },

  // Crea la solicitud, el beneficiario nuevo (si no existe) y los documentos, todo junto
  async crear(data: CrearReemplazoInput, archivos: Express.Multer.File[], rutUsuarioSolicitante: number) {
    const [beneficiarioActual, proyecto, contexto] = await Promise.all([
      beneficiarioRepository.findByRut(data.idBeneficiarioProyecto),
      proyectoRepository.findByFolio(data.idProyecto),
      obtenerContextoUsuario(rutUsuarioSolicitante),
    ]);

    if (!beneficiarioActual) {
      throw new AppError('El beneficiario a reemplazar no existe', 404);
    }
    if (!proyecto) {
      throw new AppError('El proyecto no existe', 404);
    }

    // Roles regionales (ej. INTENDENCIA) solo pueden solicitar reemplazos de beneficiarios de su propia región
    if (!contexto.puedeVerTodasLasRegiones && beneficiarioActual.reg_ben !== contexto.regionUsuario) {
      throw new AppError('El beneficiario no pertenece a tu zona', 403);
    }

    if (data.idsDocumentos.length !== archivos.length) {
      throw new AppError('La cantidad de documentos no coincide con los archivos recibidos', 400);
    }
    for (const idDocumento of data.idsDocumentos) {
      if (!esDocumentoReemplazoValido(idDocumento)) {
        throw new AppError('idDocumento no corresponde a un documento válido', 400);
      }
    }

    const { cuerpo: rutNuevo, dv } = parseRut(data.nuevoBeneficiario.rut);

    // Si el nuevo beneficiario aún no existe en la tabla legacy, se crea (rut sin dv es la PK)
    const beneficiarioNuevoExistente = await beneficiarioRepository.findByRut(rutNuevo);
    if (!beneficiarioNuevoExistente) {
      await beneficiarioRepository.create({
        rut_ben: rutNuevo,
        dig_ben: dv,
        nom_ben: data.nuevoBeneficiario.nombres,
        pat_ben: data.nuevoBeneficiario.apellidoPaterno,
        mat_ben: data.nuevoBeneficiario.apellidoMaterno,
          dir_ben: data.nuevoBeneficiario.direccion,
        fecnac_ben: data.nuevoBeneficiario.fechaNacimiento,
      });
    }

    const reemplazo = await reemplazoBenProyectoRepository.create({
      idBeneficiarioProyecto: data.idBeneficiarioProyecto,
      idBeneficiarioNuevo: rutNuevo,
      idProyecto: data.idProyecto,
      rutUsuarioSolicitante,
    });

    // Los 5 documentos se guardan juntos, una vez que la solicitud ya tiene id
    for (let i = 0; i < archivos.length; i += 1) {
      const archivoUrl = guardarDocumentoEnDisco(reemplazo.id, archivos[i]);
      await docReemplazoBenProyectoRepository.create({
        idReemplazoBenProyecto: reemplazo.id,
        idDocumento: data.idsDocumentos[i],
        idBeneficiario: rutNuevo,
        nombreArchivo: archivos[i].originalname,
        archivoUrl,
      });
    }

    const reemplazoCompleto = await reemplazoBenProyectoRepository.findById(reemplazo.id);
    return reemplazoCompleto;
  },

  async actualizarEstado(id: number, status: ReemplazoStatus, rutUsuario: number) {
    const contexto = await obtenerContextoUsuario(rutUsuario);
    const permisoRequerido = status === 'aprobado' ? PERMISO_APROBAR : PERMISO_RECHAZAR;
    if (!contexto.permisos.includes(permisoRequerido)) {
      throw new AppError('No tiene permisos para realizar esta acción', 403);
    }

    const actualizado = await reemplazoBenProyectoRepository.actualizarEstado(id, status);
    if (!actualizado) {
      throw new AppError('Reemplazo no encontrado', 404);
    }
    return actualizado;
  },

  async eliminar(id: number) {
    const eliminado = await reemplazoBenProyectoRepository.eliminar(id);
    if (!eliminado) {
      throw new AppError('Reemplazo no encontrado', 404);
    }
  },
};
