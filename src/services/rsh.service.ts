// services/rsh.service.ts

import jwt from "jsonwebtoken";
import axios from "axios";
import { formatearRut } from "../utils/wsFunctions";

export class RshService {
  private readonly secret = process.env.RSH_SECRET!;
  private readonly key = process.env.WS_KEY!;

  private generateToken(): string {
    return jwt.sign(
      {
        iss: "restrshInstituciones-QA",
      },
      this.secret,
      {
        algorithm: "HS256",
        expiresIn: 1200,
      },
    );
  }

  async consultar(rutFormateado: string) {
    const token = this.generateToken();
    const { cuerpo: rut, dv } = formatearRut(rutFormateado);

    const { data } = await axios.post(
      "https://api.ministeriodesarrollosocial.gob.cl/qa/restRSHInstitucionesQA",
      {
        run: rut,
        dv: dv,
        clave: this.key,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return data;
  }
}
