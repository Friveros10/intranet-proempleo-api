import { QueryTypes, type Transaction } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { OrdinariosModel, type Ordinario } from '../models/Ordinarios.model';
import { OrdinariosProempleoModel } from '../models/OrdinariosProempleo.model';
import type { CrearOrdinarioInput, ListarOrdinariosQuery } from '../validations/ordinarios.validation';

const tablaNueva = `dbo.${OrdinariosProempleoModel.tableName}`;
export const ordinariosUnificados = `
  SELECT ordinario, fecha_documento, fecha_pago FROM dbo.${OrdinariosModel.tableName}
  UNION ALL SELECT ordinario, fecha_documento, fecha_pago FROM ${tablaNueva}
`;
const fechas = `RTRIM(ordinario) ordinario, CONVERT(CHAR(10), fecha_documento, 23) fecha_documento,
  CONVERT(CHAR(10), fecha_pago, 23) fecha_pago`;

type OrdinarioResumen = Pick<Ordinario, 'ordinario' | 'fecha_documento' | 'fecha_pago'>;

export const ordinariosRepository = {
  async listar({ page, folio }: ListarOrdinariosQuery) {
    const limit = 20;
    const filtro = folio ? 'WHERE ordinario LIKE :folio' : '';
    const replacements = { folio: `%${folio.replace(/[%_[\]]/g, '[$&]')}%` };
    const [meta] = await sequelize.query<{ total: number }>(`
      WITH ordinarios AS (${ordinariosUnificados}) SELECT COUNT(*) total FROM ordinarios ${filtro}
    `, { replacements, type: QueryTypes.SELECT });
    const totalPages = Math.max(1, Math.ceil(meta.total / limit));
    const pagina = Math.min(page, totalPages);
    const data = await sequelize.query<OrdinarioResumen>(`
      WITH ordinarios AS (${ordinariosUnificados})
      SELECT ${fechas} FROM ordinarios ${filtro} ORDER BY fecha_documento DESC, ordinario DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, { replacements: { ...replacements, offset: (pagina - 1) * limit, limit }, type: QueryTypes.SELECT });
    return { data, pagination: { page: pagina, limit, total: meta.total, totalPages } };
  },

  async obtener(ordinario: string, transaction?: Transaction) {
    const [fila] = await sequelize.query<OrdinarioResumen>(`
      WITH ordinarios AS (${ordinariosUnificados})
      SELECT ${fechas} FROM ordinarios WHERE ordinario = :ordinario
    `, { replacements: { ordinario }, type: QueryTypes.SELECT, transaction });
    return fila ?? null;
  },

  async existeFolio(ordinario: string, transaction: Transaction) {
    const [existente] = await sequelize.query(`
      SELECT ordinario FROM ${tablaNueva} WITH (UPDLOCK, HOLDLOCK) WHERE ordinario = :ordinario
    `, { replacements: { ordinario }, type: QueryTypes.SELECT, transaction });
    return Boolean(existente || await this.obtener(ordinario, transaction));
  },

  async crear(data: CrearOrdinarioInput, usuario: string, transaction: Transaction) {
    await sequelize.query(`
      INSERT INTO ${tablaNueva} (ordinario, fecha_documento, fecha_pago, ultimo_usuario)
      VALUES (:ordinario, CONVERT(DATE, :fecha_documento, 23), CONVERT(DATE, :fecha_pago, 23), :usuario)
    `, { replacements: { ...data, usuario }, transaction });
  },
};
