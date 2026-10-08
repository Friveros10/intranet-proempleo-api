import { QueryTypes } from 'sequelize';
import { sequelize } from '../src/database/sequelize';

/**
 * Crea dbo.USUARIOS_PROEMPLEO (directorio de personal) y carga sus datos.
 *
 * No es una migración: se ejecuta de forma directa con
 *   npx ts-node --transpile-only scripts/create-usuarios-proempleo.ts
 *
 * El id es IDENTITY(1,1), por lo que las filas quedan numeradas de 1 en adelante
 * siguiendo el mismo orden en que están definidas más abajo.
 */
const TABLA = 'dbo.USUARIOS_PROEMPLEO';

interface Funcionario {
  nombre: string;
  cargo: string;
  id_equipo: number;
  nom_equipo: string;
  tel: string;
  email: string;
}

const FUNCIONARIOS: Funcionario[] = [
  { nombre: 'Juan Daza Lizana', cargo: 'Director Ejecutivo', id_equipo: 1, nom_equipo: 'Direccion', tel: '27530527', email: 'jdaza@mintrab.gob.cl' },
  { nombre: 'Maria Paz Salvo', cargo: 'Sub Directora', id_equipo: 1, nom_equipo: 'Direccion', tel: '27530407', email: 'msalvo@mintrab.gob.cl' },
  { nombre: 'Fabiola Reinoso', cargo: 'Secretaria', id_equipo: 1, nom_equipo: 'Direccion', tel: '27530593', email: 'freinoso@mintrab.gob.cl' },
  { nombre: 'Milton Gonzalez', cargo: 'Auxiliar Administrativo', id_equipo: 1, nom_equipo: 'Direccion', tel: '27530528', email: 'mgonzalez@mintrab.gob.cl' },
  { nombre: 'Luis Fuentes', cargo: 'Conductor', id_equipo: 1, nom_equipo: 'Direccion', tel: '27530409', email: 'lfuentes@mintrab.gob.cl' },
  { nombre: 'Carolina Poblete Cofre', cargo: 'Jefa Departamento Programas', id_equipo: 2, nom_equipo: 'Programas', tel: '27530484', email: 'cpoblete@mintrab.gob.cl' },
  { nombre: 'Paula Ampuero Curamil', cargo: 'Analista de Proyectos', id_equipo: 2, nom_equipo: 'Programas', tel: '27530507', email: 'pampuero@mintrab.gob.cl' },
  { nombre: 'Maria Consuelo Garate', cargo: 'Analista de Proyectos', id_equipo: 2, nom_equipo: 'Programas', tel: '27530553', email: 'mgarate@mintrab.gob.cl' },
  { nombre: 'Catalina Cura Orue', cargo: 'Analista de Proyectos', id_equipo: 2, nom_equipo: 'Programas', tel: '27530507', email: 'ccura@mintrab.gob.cl' },
  { nombre: 'Pablo Rodriguez Elgueta', cargo: 'Analista de Proyectos', id_equipo: 2, nom_equipo: 'Programas', tel: '27530553', email: 'prodriguez@mintrab.gob.cl' },
  { nombre: 'Lorena Iracabal', cargo: 'Encargada de Inversión a la Comunidad', id_equipo: 2, nom_equipo: 'Programas', tel: '27530498', email: 'liracabal@mintrab.gob.cl' },
  { nombre: 'Gabriel Zuñiga', cargo: 'Analista de Inversión a la Comunidad', id_equipo: 2, nom_equipo: 'Programas', tel: '27530548', email: 'gzuniga@mintrab.gob.cl' },
  { nombre: 'Hans Pinochet Newman', cargo: 'Analista de Inversión a la Comunidad', id_equipo: 2, nom_equipo: 'Programas', tel: '27530529', email: 'hpinochet@mintrab.gob.cl' },
  { nombre: 'Octavio Aguayo Hidalgo', cargo: 'Encargado de Procesos y Sistemas', id_equipo: 3, nom_equipo: 'Análisis y Procesos', tel: '27530585', email: 'oaguayo@mintrab.gob.cl' },
  { nombre: 'Franco Arriagada Lopez', cargo: 'Analista de Datos', id_equipo: 3, nom_equipo: 'Análisis y Procesos', tel: '27530430', email: 'farriagada@mintrab.gob.cl' },
  { nombre: 'Germán Magaña Silva', cargo: 'Analista de Informática', id_equipo: 3, nom_equipo: 'Análisis y Procesos', tel: '27530506', email: 'gmagana@mintrab.gob.cl' },
  { nombre: 'Bernardita Lincoñir Huaiquil', cargo: 'Analista de Sistemas', id_equipo: 3, nom_equipo: 'Análisis y Procesos', tel: '27530542', email: 'blinconir@mintrab.gob.cl' },
  { nombre: 'Maria Jose Jimenez', cargo: 'Administrativo', id_equipo: 3, nom_equipo: 'Análisis y Procesos', tel: '27530517', email: 'mjimenez@mintrab.gob.cl' },
  { nombre: 'Hugo Sanhueza', cargo: 'Administrativo', id_equipo: 3, nom_equipo: 'Análisis y Procesos', tel: '27530591', email: 'hsanhueza@mintrab.gob.cl' },
  { nombre: 'Cecilia Garrido Rubio', cargo: 'Jefa Departamento de Finanzas y Ppto', id_equipo: 4, nom_equipo: 'Finanzas', tel: '27530573', email: 'cgarrido@mintrab.gob.cl' },
  { nombre: 'Maria Jesus Esparza Munita', cargo: 'Analista Financiero', id_equipo: 4, nom_equipo: 'Finanzas', tel: '27530482', email: 'mesparza@mintrab.gob.cl' },
  { nombre: 'Daniel Aravena', cargo: 'Analista Financiero', id_equipo: 4, nom_equipo: 'Finanzas', tel: '27530582', email: 'daravena@mintrab.gob.cl' },
  { nombre: 'Carlos Cancino', cargo: 'Analista Financiero', id_equipo: 4, nom_equipo: 'Finanzas', tel: '27530455', email: 'ccancino@mintrab.gob.cl' },
  { nombre: 'Fabian Dinamarca', cargo: 'Analista Financiero', id_equipo: 4, nom_equipo: 'Finanzas', tel: '27530482', email: 'fdinamarca@mintrab.gob.cl' },
  { nombre: 'Lorna Pedreros Medel', cargo: 'Analista Financiero', id_equipo: 4, nom_equipo: 'Finanzas', tel: '27530580', email: 'lpedreros@mintrab.gob.cl' },
  { nombre: 'Nelson Jimenez', cargo: 'Analista Financiero', id_equipo: 4, nom_equipo: 'Finanzas', tel: '27530402', email: 'njimenez@mintrab.gob.cl' },
  { nombre: 'Tiare Muñoz Allende', cargo: 'Otro', id_equipo: 5, nom_equipo: 'Otros', tel: '27530402', email: 'tmunoz@mintrab.gob.cl' },
];

async function crearTabla(): Promise<void> {
  await sequelize.query(`
    IF OBJECT_ID('${TABLA}', 'U') IS NULL
    CREATE TABLE ${TABLA} (
      id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_USUARIOS_PROEMPLEO PRIMARY KEY,
      nombre     NVARCHAR(100) NOT NULL,
      cargo      NVARCHAR(100) NOT NULL,
      id_equipo  INT           NOT NULL,
      nom_equipo NVARCHAR(50)  NOT NULL,
      tel        NVARCHAR(20)  NULL,
      email      NVARCHAR(100) NULL
    )
  `);
}

async function contarRegistros(): Promise<number> {
  const [row] = await sequelize.query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${TABLA}`,
    { type: QueryTypes.SELECT },
  );
  return row.total;
}

async function insertarDatos(): Promise<void> {
  // Se insertan dentro de una transacción y en orden, para que IDENTITY asigne
  // los correlativos 1..N respetando la secuencia de FUNCIONARIOS.
  await sequelize.transaction(async (transaction) => {
    for (const funcionario of FUNCIONARIOS) {
      await sequelize.query(
        `INSERT INTO ${TABLA} (nombre, cargo, id_equipo, nom_equipo, tel, email)
         VALUES (:nombre, :cargo, :id_equipo, :nom_equipo, :tel, :email)`,
        { replacements: { ...funcionario }, type: QueryTypes.INSERT, transaction },
      );
    }
  });
}

async function main(): Promise<void> {
  await sequelize.authenticate();
  await crearTabla();

  const existentes = await contarRegistros();
  if (existentes > 0) {
    console.log(`${TABLA} ya tiene ${existentes} registros; no se insertó nada.`);
    return;
  }

  await insertarDatos();
  console.log(`${TABLA} creada y poblada con ${await contarRegistros()} registros.`);
}

main()
  .catch((error) => {
    console.error('Error creando USUARIOS_PROEMPLEO:', error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
