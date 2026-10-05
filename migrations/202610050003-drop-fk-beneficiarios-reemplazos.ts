import { QueryInterface, QueryTypes } from 'sequelize';

// Quita las FK que apuntan a BENEFICIARIOS.rut_ben desde Reemplazo_benpro y
// Doc_reemplazo_benpro, para habilitar reemplazos con beneficiarios que solo
// existen en la tabla nueva dbo.beneficiarios_proempleo. La existencia del
// beneficiario se sigue validando a nivel de aplicación: el servicio busca en
// ambas tablas (UNION) antes de crear el reemplazo o cargar documentos.
interface FkRow {
  constraintName: string;
  tableName: string;
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  const fks = await queryInterface.sequelize.query<FkRow>(
    `SELECT fk.name AS constraintName, tp.name AS tableName
     FROM sys.foreign_keys fk
     JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
     JOIN sys.tables tp ON tp.object_id = fk.parent_object_id
     JOIN sys.columns pc ON pc.object_id = fk.parent_object_id AND pc.column_id = fkc.parent_column_id
     JOIN sys.tables tr ON tr.object_id = fk.referenced_object_id
     JOIN sys.columns cr ON cr.object_id = fk.referenced_object_id AND cr.column_id = fkc.referenced_column_id
     WHERE SCHEMA_NAME(tp.schema_id) = 'dbo'
       AND tr.name = 'BENEFICIARIOS'
       AND cr.name = 'rut_ben'
       AND (
         (tp.name = 'Reemplazo_benpro' AND pc.name IN ('idBeneficiarioProyecto', 'idBeneficiarioNuevo'))
         OR (tp.name = 'Doc_reemplazo_benpro' AND pc.name = 'idBeneficiario')
       )`,
    { type: QueryTypes.SELECT },
  );
  for (const { constraintName, tableName } of fks) {
    await queryInterface.sequelize.query(
      `ALTER TABLE [dbo].[${tableName}] DROP CONSTRAINT [${constraintName}]`,
    );
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Nota: falla si ya existen reemplazos/documentos que apunten a beneficiarios
  // que solo están en beneficiarios_proempleo; hay que limpiarlos antes de revertir.
  await queryInterface.addConstraint({ tableName: 'Reemplazo_benpro', schema: 'dbo' }, {
    fields: ['idBeneficiarioProyecto'],
    type: 'foreign key',
    name: 'FK_Reemplazo_benpro_BeneficiarioProyecto',
    references: { table: { tableName: 'BENEFICIARIOS', schema: 'dbo' }, field: 'rut_ben' },
    onUpdate: 'NO ACTION',
    onDelete: 'NO ACTION',
  });
  await queryInterface.addConstraint({ tableName: 'Reemplazo_benpro', schema: 'dbo' }, {
    fields: ['idBeneficiarioNuevo'],
    type: 'foreign key',
    name: 'FK_Reemplazo_benpro_BeneficiarioNuevo',
    references: { table: { tableName: 'BENEFICIARIOS', schema: 'dbo' }, field: 'rut_ben' },
    onUpdate: 'NO ACTION',
    onDelete: 'NO ACTION',
  });
  await queryInterface.addConstraint({ tableName: 'Doc_reemplazo_benpro', schema: 'dbo' }, {
    fields: ['idBeneficiario'],
    type: 'foreign key',
    name: 'FK_Doc_reemplazo_benpro_Beneficiario',
    references: { table: { tableName: 'BENEFICIARIOS', schema: 'dbo' }, field: 'rut_ben' },
    onUpdate: 'NO ACTION',
    onDelete: 'NO ACTION',
  });
}
