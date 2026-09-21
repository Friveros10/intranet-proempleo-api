import { Request, Response } from 'express';
import { RshService } from '../services/rsh.service';

const rshService = new RshService();

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

    // Hombre >= 65 años
    // Mujer >= 60 años
    const cumpleEdadPrograma =
      (sexo === 1 && edad >= 65) ||
      (sexo === 2 && edad >= 60);

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
    });
  },
};