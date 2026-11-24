import type { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    IF OBJECT_ID('dbo.ordinarios_proempleo', 'U') IS NULL
      CREATE TABLE dbo.ordinarios_proempleo (
        ordinario CHAR(8) NOT NULL CONSTRAINT PK_ordinarios_proempleo PRIMARY KEY,
        fecha_documento DATE NOT NULL,
        fecha_pago DATE NOT NULL,
        ultimo_usuario VARCHAR(50) NOT NULL,
        ultima_actualizacion DATETIME NOT NULL DEFAULT GETDATE()
      );

    IF OBJECT_ID('dbo.transferencias_proempleo', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.transferencias_proempleo (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_transferencias_proempleo PRIMARY KEY,
        ordinario VARCHAR(50) NOT NULL,
        folio INT NOT NULL,
        correlativo INT NOT NULL,
        monto NUMERIC(18,0) NOT NULL CHECK (monto > 0),
        estado VARCHAR(50) NOT NULL,
        ingreso DATETIME NOT NULL,
        observaciones VARCHAR(250) NULL,
        ultimo_usuario VARCHAR(50) NOT NULL,
        ultima_actualizacion DATETIME NOT NULL,
        lisben_trans VARCHAR(50) NULL,
        lisbenfec_trans DATETIME NULL,
        lisbenord_trans VARCHAR(50) NULL,
        ren_trans VARCHAR(50) NULL,
        renfec_trans DATETIME NULL,
        renord_trans VARCHAR(50) NULL,
        ficpro_trans VARCHAR(50) NULL,
        ficprofec_trans DATETIME NULL,
        ficproord_trans VARCHAR(50) NULL,
        coming_trans VARCHAR(50) NULL,
        comingfec_trans DATETIME NULL,
        comingord_trans VARCHAR(50) NULL,
        fec_trans DATETIME NULL,
        fol_dec CHAR(8) NOT NULL
      );
      CREATE UNIQUE INDEX UX_transferencias_proempleo_negocio
        ON dbo.transferencias_proempleo(ordinario, folio, correlativo);
      CREATE INDEX IX_transferencias_proempleo_decreto
        ON dbo.transferencias_proempleo(fol_dec, folio) INCLUDE (monto, estado);
    END
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    DROP TABLE IF EXISTS dbo.transferencias_proempleo;
    DROP TABLE IF EXISTS dbo.ordinarios_proempleo;
  `);
}
