import type { Transaction } from "sequelize";
import { coberturaProyectoRepository as repository } from "../repositories/coberturaProyecto.repository";
import type { GuardarProyectoInput } from "../validations/proyectos.validation";
import { AppError } from "../utils/AppError";

export const coberturaProyectoService = {
  async validar(data: GuardarProyectoInput, transaction: Transaction) {
    const coberturas = await repository.disponibles(data, transaction);
    let [anio, mes] = data.fecini_pro.split("-").map(Number);
    const [finAnio, finMes] = data.fecter_pro.split("-").map(Number);
    for (
      ;
      anio * 100 + mes <= finAnio * 100 + finMes;
      mes === 12 ? (anio++, (mes = 1)) : mes++
    ) {
      const periodo = `${anio}-${String(mes).padStart(2, "0")}`;
      const filas = coberturas.filter(
        (c) => c.ano_ofi === anio && c.Mes_ofi === mes,
      );
      if (!filas.length) {
        const comuna = await repository.nombreComuna(data.com_pro, data.ciu_pro, transaction);
        throw new AppError(
          `No existe un oficio de cobertura vigente para la región ${data.reg_pro}, comuna ${comuna}, en el período ${periodo}`,
          400,
        );
      }
      const maximo = filas.reduce((total, c) => total + (c.ben_ofi ?? 0), 0);
      const proyectos = await repository.proyectosEnPeriodo(data, transaction, filas);
      const periodoNumerico = anio * 100 + mes;
      const comprometidos = proyectos
        .filter((p) => p.desde <= periodoNumerico && p.hasta >= periodoNumerico)
        .reduce((total, p) => total + p.beneficiarios, 0);
      const disponibles = Math.max(0, maximo - comprometidos);
      if (comprometidos + data.emp_pro > maximo) {
        const comuna = await repository.nombreComuna(data.com_pro, data.ciu_pro, transaction);
        throw new AppError(
          `El proyecto excede a la cobertura ${filas[0].ord_ofi.trim()} vigente para la comuna ${comuna} en el período ${periodo}. La cantidad máxima de cupos establecidos por el oficio de cobertura para esta comuna y período es ${maximo}; otros proyectos ya tienen ${comprometidos} cupos comprometidos y quedan ${disponibles} cupos disponibles. El proyecto solicita ${data.emp_pro} beneficiarios`,
          400,
        );
      }
    }
    return coberturas;
  },
};
