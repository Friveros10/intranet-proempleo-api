import { QueryInterface, QueryTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (transaction) => {
    const fks = await queryInterface.sequelize.query<{ constraintName: string }>(
      `SELECT DISTINCT fk.name AS constraintName
       FROM sys.foreign_keys fk
       JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
       JOIN sys.tables tp ON tp.object_id = fk.parent_object_id
       JOIN sys.columns pc ON pc.object_id = tp.object_id AND pc.column_id = fkc.parent_column_id
       JOIN sys.tables tr ON tr.object_id = fk.referenced_object_id
       JOIN sys.columns cr ON cr.object_id = tr.object_id AND cr.column_id = fkc.referenced_column_id
       WHERE SCHEMA_NAME(tp.schema_id) = 'dbo' AND tp.name = 'Reemplazo_benpro'
         AND pc.name = 'rutUsuarioSolicitante'
         AND SCHEMA_NAME(tr.schema_id) = 'dbo' AND tr.name = 'Usuario'
         AND cr.name = 'rut_usu'`,
      { type: QueryTypes.SELECT, transaction },
    );
    for (const fk of fks) {
      await queryInterface.removeConstraint(
        { tableName: 'Reemplazo_benpro', schema: 'dbo' },
        fk.constraintName,
        { transaction },
      );
    }
  });
}

// Falla si hay solicitantes que no existen en la tabla legacy.
export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addConstraint(
    { tableName: 'Reemplazo_benpro', schema: 'dbo' },
    {
      fields: ['rutUsuarioSolicitante'],
      type: 'foreign key',
      name: 'FK_Reemplazo_benpro_UsuarioSolicitante',
      references: { table: { tableName: 'Usuario', schema: 'dbo' }, field: 'rut_usu' },
      onUpdate: 'NO ACTION',
      onDelete: 'NO ACTION',
    },
  );
}
