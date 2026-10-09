import { DataTypes, QueryInterface, QueryTypes } from 'sequelize';

const table = { tableName: 'documentos_auditoria', schema: 'dbo' };

export async function up(queryInterface: QueryInterface): Promise<void> {
  const columns = await queryInterface.describeTable(table);
  await queryInterface.sequelize.transaction(async (transaction) => {
    if (!columns.comuna) {
      if (!columns.idComuna) {
        throw new Error('documentos_auditoria no tiene comuna ni idComuna para convertir.');
      }
      await queryInterface.addColumn(table, 'comuna', {
        type: DataTypes.STRING(255),
        allowNull: true,
      }, { transaction });
    }

    if (columns.idComuna) {
      // Solo nombres unicos por codigo; no se sobrescribe texto ya informado.
      await queryInterface.sequelize.query(
        `UPDATE a
            SET comuna = c.nombre
           FROM dbo.documentos_auditoria a
           JOIN (
             SELECT cod_com, MAX(nom_com) AS nombre
               FROM dbo.COMUNAS
              GROUP BY cod_com
             HAVING COUNT(*) = 1
           ) c ON c.cod_com = a.idComuna
          WHERE a.comuna IS NULL OR LTRIM(RTRIM(a.comuna)) = N'';`,
        { transaction },
      );
    }

    const [resultado] = await queryInterface.sequelize.query<{ invalidos: number }>(
      `SELECT COUNT(*) AS invalidos
         FROM dbo.documentos_auditoria
        WHERE comuna IS NULL OR LTRIM(RTRIM(comuna)) = N''
           OR DATALENGTH(comuna) > 510;`,
      { type: QueryTypes.SELECT, transaction },
    );
    if (!resultado || resultado.invalidos !== 0) {
      throw new Error(
        `No se puede eliminar idComuna: ${resultado?.invalidos ?? 'cantidad desconocida'} ` +
        'fichas tienen una comuna vacia, sin correspondencia unica o mayor a 255 caracteres. ' +
        'Corrige los datos del catalogo y vuelve a ejecutar la migracion.',
      );
    }

    await queryInterface.changeColumn(table, 'comuna', {
      type: DataTypes.STRING(255),
      allowNull: false,
    }, { transaction });
    if (columns.idComuna) {
      await queryInterface.removeColumn(table, 'idComuna', { transaction });
    }
  });
}

export async function down(): Promise<void> {
  throw new Error(
    'La comuna textual no se puede convertir automaticamente a idComuna: ' +
    'puede contener nombres externos al catalogo. Restaura un respaldo si necesitas revertir.',
  );
}
