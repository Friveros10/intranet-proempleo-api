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
    const [registro] = await sequelize.query<BancoProyecto & {
      nombre_anterior: string;
      categoria_anterior: string;
      alcance_anterior: string;
    }>(
      `UPDATE ${tabla}
       SET nombre_proyecto = $nombre_proyecto, categoria = $categoria, alcance = $alcance
       OUTPUT ${salida}, DELETED.nombre_proyecto AS nombre_anterior,
         DELETED.categoria AS categoria_anterior, DELETED.alcance AS alcance_anterior
       WHERE id = $id AND eliminado = 0`,
      { bind: { id, ...datos }, type: QueryTypes.SELECT },
    );
    if (!registro) return undefined;
    const { nombre_anterior, categoria_anterior, alcance_anterior, ...actual } = registro;
    return {
      actual,
      anterior: { nombre_proyecto: nombre_anterior, categoria: categoria_anterior, alcance: alcance_anterior },
    };
  },

  async eliminar(id: number) {
    const [registro] = await sequelize.query<BancoProyecto>(
      `UPDATE ${tabla} SET eliminado = 1 OUTPUT ${salida}
       WHERE id = $id AND eliminado = 0`,
      { bind: { id }, type: QueryTypes.SELECT },
    );
    return registro;
  },
};
