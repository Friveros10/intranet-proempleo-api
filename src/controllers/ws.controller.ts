import { Request, Response } from "express";
import { RshService } from "../services/rsh.service";
import {
  PER_FIC_TIPOEDUCACION_ID,
  etnia,
} from "../constants/paramsRSH.constants";

const rshService = new RshService();

/**
 * Función auxiliar para transformar códigos numéricos o string de la RSH
 * en sus descripciones legibles según los catálogos definidos.
 */
function evaluarEducacionYEtnia(rshData: {
  E3?: number | string;
  E4?: number | string;
  etnia_original?: number | string;
}) {
  const cursoId = Number(rshData.E3);
  const tipoEducacionId = Number(rshData.E4);
  const etniaId = Number(rshData.etnia_original);

  const tipoEducacionDesc =
    PER_FIC_TIPOEDUCACION_ID.find((item) => item.codigo === tipoEducacionId)
      ?.desc || "No registrado";

  const etniaDesc =
    etnia.find((item) => item.codigo === etniaId)?.desc || "No registrado";
  let educacion;
  if (
    cursoId === 4 &&
    (tipoEducacionDesc === "Educación Media Científico-Humanista" ||
      tipoEducacionDesc === "Educación Media Técnico- Profesional")
  ) {
    educacion = "Educación Media Completa";
  } else if (cursoId === 12) {
    educacion = "Educación Media Completa";
  } else if (cursoId === 11 || cursoId === 10 || cursoId === 9) {
    educacion = "Educación Media Incompleta";
  } else if (
    cursoId < 8 &&
    tipoEducacionDesc !== "Educación Media Científico-Humanista" &&
    tipoEducacionDesc !== "Educación Media Técnico- Profesional"
  ) {
    educacion = "Educación Básica incompleta";
  }
  return {
    educacion: educacion || tipoEducacionDesc,
    etnia: etniaDesc,
  };
}

export const wsController = {
  async consultarRsh(req: Request, res: Response): Promise<void> {
    const data = await rshService.consultar(req.params.rut);

    const sexo = Number(data.rshmintrab.sexo);
    const fechaNacimiento = data.rshmintrab.fecha_nacimiento?.toString();

    let edad = 0;

    if (fechaNacimiento && fechaNacimiento.length === 8) {
      const anio = Number(fechaNacimiento.substring(0, 4));
      const mes = Number(fechaNacimiento.substring(4, 6));
      const dia = Number(fechaNacimiento.substring(6, 8));

      const hoy = new Date();

      edad = hoy.getFullYear() - anio;

      const yaCumplioAnio =
        hoy.getMonth() + 1 > mes ||
        (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);

      if (!yaCumplioAnio) {
        edad--;
      }
    }

    // Hombre >= 65 años | Mujer >= 60 años
    const cumpleEdadPrograma =
      (sexo === 1 && edad >= 65) || (sexo === 2 && edad >= 60);

    const genero = sexo === 1 ? "M" : sexo === 2 ? "F" : "Desconocido";

    // Evaluamos los datos de educación (E3, E4) y etnia (etnia_original)
    // Además incluimos E1 y E2 para abarcar todo el contexto educacional
    const evaluacionRsh = evaluarEducacionYEtnia({
      E3: data.rshmintrab.E3,
      E4: data.rshmintrab.E4,
      etnia_original: data.rshmintrab.etnia_original,
    });

    res.status(200).json({
      detalle: data.detalle,
      apellidoPaterno: data.rshmintrab.ape1,
      apellidoMaterno: data.rshmintrab.ape2,
      nombres: data.rshmintrab.nombres,
      puntaje: data.rshmintrab.puntaje,
      sexo,
      fecha: fechaNacimiento,
      edad,
      cumpleEdadPrograma,
      genero,
      educacion: evaluacionRsh.educacion,
      etnia: evaluacionRsh.etnia,
    });
  },
};
