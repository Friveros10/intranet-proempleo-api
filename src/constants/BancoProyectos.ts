/** Catálogo estático de documentos requeridos para un reemplazo de beneficiario en proyecto */
export const Banco_proyectos =
[
  {
    id: 1,
    nombre_proyecto: "Mantención de áreas verdes, plazas y bandejones",
    objetivo: "Limpieza, riego, desmalezado, corte de césped y poda menor a nivel de suelo en áreas verdes de uso público."
  },
  {
    id: 2,
    nombre_proyecto: "Mantención de cementerios municipales",
    objetivo: "Aseo de pasillos y áreas comunes, desmalezado, retiro de residuos y mantención menor de espacios comunes."
  },
  {
    id: 3,
    nombre_proyecto: "Recuperación y mantención de áreas verdes y espacios naturales de uso público",
    objetivo: "Plantación y arborización, recuperación de áreas degradadas, protección de especies nativas y habilitación de senderos en parques o espacios de reserva de flora y fauna."
  },
  {
    id: 4,
    nombre_proyecto: "Limpieza de borde costero, riberas y cuerpos de agua de uso público",
    objetivo: "Retiro de residuos y limpieza en playas, balnearios, paseos costeros y riberas de ríos y lagunas."
  },
  {
    id: 5,
    nombre_proyecto: "Mantención de veredas, cunetas y caminos rurales",
    objetivo: "Limpieza de veredas y cunetas, despeje de alcantarillas y pasos de agua asociados a la vía, desmalezado de bermas y reparación menor de veredas."
  },
  {
    id: 6,
    nombre_proyecto: "Apoyo a la conservación de elementos viales y peatonales (reformulada)",
    objetivo: "Limpieza de señales verticales; pintura de soleras, barandas, refugios peatonales y mobiliario vial fuera de la calzada."
  },
  {
    id: 7,
    nombre_proyecto: "Mantención y reparaciones menores en recintos públicos y comunitarios",
    objetivo: "Pintura, reparaciones no especializadas y mantención de cierres, mobiliario y áreas exteriores."
  },
  {
    id: 8,
    nombre_proyecto: "Aseo y apoyo auxiliar en recintos públicos y comunitarios",
    objetivo: "Aseo, ordenamiento y acondicionamiento de espacios; traslado de mobiliario y materiales."
  },
  {
    id: 9,
    nombre_proyecto: "Apoyo operativo en puntos limpios",
    objetivo: "Recepción, clasificación, acopio y orden de materiales reciclables; aseo del recinto."
  },
  {
    id: 10,
    nombre_proyecto: "Viveros, huertos e invernaderos comunitarios",
    objetivo: "Habilitación y mantención de viveros, huertos e invernaderos en bienes municipales o de uso público."
  },
  {
    id: 11,
    nombre_proyecto: "Erradicación de microbasurales y limpieza de sitios eriazos (nueva)",
    objetivo: "Retiro de residuos voluminosos y escombros; limpieza y acondicionamiento de sitios municipales o de uso público."
  },
  {
    id: 12,
    nombre_proyecto: "Apoyo logístico y operativo, atención y orientación de usuarios (Estafeta y adm.)",
    objetivo: "Orientación de usuarios en recintos, organización de información y distribución de correspondencia entre recintos."
  },
  {
    id: 13,
    nombre_proyecto: "Acompañamiento a personas mayores en situación de aislamiento (reformulada) — Cuidadoras",
    objetivo: "Visitas de acompañamiento, apoyo en compras y trámites simples y vinculación con redes y servicios, a personas derivadas por la unidad municipal responsable."
  },
  {
    id: 14,
    nombre_proyecto: "Confección y reparación de textiles de uso comunitario — Talleres",
    objetivo: "Confección y reparación de ropa de cama, abrigo y textiles para albergues, establecimientos y organizaciones comunitarias."
  },
  {
    id: 15,
    nombre_proyecto: "Prevención de incendios en la interfaz urbano-rural",
    objetivo: "Despeje de vegetación seca, desmalezado preventivo y habilitación y mantención de fajas cortafuegos."
  },
  {
    id: 16,
    nombre_proyecto: "Limpieza y despeje posterior a emergencias",
    objetivo: "Remoción de sedimentos, escombros y residuos; despeje de accesos y espacios públicos afectados por temporales o aluviones."
  },
  {
    id: 17,
    nombre_proyecto: "Apoyo operativo en albergues temporales",
    objetivo: "Aseo, desinfección y acondicionamiento de espacios; inventario y orden de insumos."
  },
  {
    id: 18,
    nombre_proyecto: "Apoyo en centros de acopio",
    objetivo: "Recepción, clasificación y embalaje de ayuda; apoyo a su distribución."
  },
  {
    id: 19,
    nombre_proyecto: "Apoyo logístico a la instalación de viviendas de emergencia (reformulada)",
    objetivo: "Carga, descarga y traslado de materiales; limpieza y preparación del terreno; apoyo a cuadrillas bajo dirección de un responsable técnico."
  },
  {
    id: 20,
    nombre_proyecto: "Limpieza preventiva de cauces, canales y quebradas (nueva)",
    objetivo: "Retiro de residuos y vegetación en canales, quebradas y cauces urbanos antes de la temporada de lluvias."
  }
] as const;

export type BancoProyectosID = (typeof Banco_proyectos)[number]["id"];

export function esDocumentoReemplazoValido(id: number): id is BancoProyectosID {
  return Banco_proyectos.some((d) => d.id === id);
}
