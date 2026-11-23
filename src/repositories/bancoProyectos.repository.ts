import { QueryTypes, type Transaction } from "sequelize";
import { sequelize } from "../database/sequelize";

export type DatosBancoProyecto = {
  nombre_proyecto: string;
  categoria: string;
  alcance: string;
};

type BancoProyecto = DatosBancoProyecto & { id: number };

const tabla = "dbo.banco_proyectos_proempleo";
const columnas = "id, nombre_proyecto, categoria, alcance";
const salida =
  "INSERTED.id, INSERTED.nombre_proyecto, INSERTED.categoria, INSERTED.alcance";

export const bancoProyectosRepository = {
  listar(incluirEliminados = false) {
    return sequelize.query<BancoProyecto>(
      `SELECT ${columnas} FROM ${tabla}
       WHERE eliminado = 0 OR $incluirEliminados = 1 ORDER BY id`,
      {
        bind: { incluirEliminados: Number(incluirEliminados) },
        type: QueryTypes.SELECT,
      },
    );
  },

  async obtenerActivo(id: number, transaction: Transaction) {
    const [registro] = await sequelize.query<BancoProyecto>(
      `SELECT ${columnas} FROM ${tabla} WITH (HOLDLOCK)
       WHERE id = $id AND eliminado = 0`,
      { bind: { id }, type: QueryTypes.SELECT, transaction },
    );
    return registro;
  },

  async crear(datos: DatosBancoProyecto) {
    const [registro] = await sequelize.query<BancoProyecto>(
      `INSERT INTO ${tabla} (nombre_proyecto, categoria, alcance)
       OUTPUT ${salida}
       VALUES ($nombre_proyecto, $categoria, $alcance)`,
      { bind: datos, type: QueryTypes.SELECT },
    );
    return registro;
  },

  async actualizar(id: number, datos: DatosBancoProyecto) {
    const [registro] = await sequelize.query<BancoProyecto>(
      `UPDATE ${tabla}
       SET nombre_proyecto = $nombre_proyecto, categoria = $categoria, alcance = $alcance
       OUTPUT ${salida}
       WHERE id = $id AND eliminado = 0`,
      { bind: { id, ...datos }, type: QueryTypes.SELECT },
    );
    return registro;
  },

  async eliminar(id: number) {
    const [registro] = await sequelize.query<{ id: number }>(
      `UPDATE ${tabla} SET eliminado = 1 OUTPUT INSERTED.id
       WHERE id = $id AND eliminado = 0`,
      { bind: { id }, type: QueryTypes.SELECT },
    );
    return registro;
  },
};
