/** Catálogo estático de documentos requeridos para un reemplazo de beneficiario en proyecto */
export const Banco_proyectos = [
  {
    id: 1,
    nombre_proyecto: "Mantención de áreas verdes, plazas y bandejones",
    alcance:
      "Limpieza, riego, desmalezado, corte de césped y poda menor a nivel de suelo en áreas verdes de uso público.",
    categoria: "Mantención de espacios públicos",
  },
  {
    id: 2,
    nombre_proyecto: "Mantención de cementerios municipales",
    alcance:
      "Aseo de pasillos y áreas comunes, desmalezado, retiro de residuos y mantención menor de espacios comunes.",
    categoria: "Mantención de espacios públicos",
  },
  {
    id: 3,
    nombre_proyecto:
      "Recuperación y mantención de áreas verdes y espacios naturales de uso público",
    alcance:
      "Plantación y arborización, recuperación de áreas degradadas, protección de especies nativas y habilitación de senderos en parques o espacios de reserva de flora y fauna.",
    categoria: "Mantención de espacios públicos",
  },
  {
    id: 4,
    nombre_proyecto:
      "Limpieza de borde costero, riberas y cuerpos de agua de uso público",
    alcance:
      "Retiro de residuos y limpieza en playas, balnearios, paseos costeros y riberas de ríos y lagunas.",
    categoria: "Mantención de espacios públicos",
  },
  {
    id: 5,
    nombre_proyecto: "Mantención de veredas, cunetas y caminos rurales",
    alcance:
      "Limpieza de veredas y cunetas, despeje de alcantarillas y pasos de agua asociados a la vía, desmalezado de bermas y reparación menor de veredas.",
    categoria: "Mantención de infraestuctura vial y conectividad menor",
  },
  {
    id: 6,
    nombre_proyecto:
      "Apoyo a la conservación de elementos viales y peatonales (reformulada)",
    alcance:
      "Limpieza de señales verticales; pintura de soleras, barandas, refugios peatonales y mobiliario vial fuera de la calzada.",
    categoria: "Infraestuctura social y recintos comunitarios",
  },
  {
    id: 7,
    nombre_proyecto:
      "Mantención y reparaciones menores en recintos públicos y comunitarios",
    alcance:
      "Pintura, reparaciones no especializadas y mantención de cierres, mobiliario y áreas exteriores.",
    categoria: "Infraestuctura social y recintos comunitarios",
  },
  {
    id: 8,
    nombre_proyecto:
      "Aseo y apoyo auxiliar en recintos públicos y comunitarios",
    alcance:
      "Aseo, ordenamiento y acondicionamiento de espacios; traslado de mobiliario y materiales.",
    categoria: "Infraestuctura social y recintos comunitarios",
  },
  {
    id: 9,
    nombre_proyecto: "Apoyo operativo en puntos limpios",
    alcance:
      "Recepción, clasificación, acopio y orden de materiales reciclables; aseo del recinto.",
    categoria: "Sustentabilidad y recuperación ambiental",
  },
  {
    id: 10,
    nombre_proyecto: "Viveros, huertos e invernaderos comunitarios",
    alcance:
      "Habilitación y mantención de viveros, huertos e invernaderos en bienes municipales o de uso público.",
    categoria: "Sustentabilidad y recuperación ambiental",
  },
  {
    id: 11,
    nombre_proyecto:
      "Erradicación de microbasurales y limpieza de sitios eriazos (nueva)",
    alcance:
      "Retiro de residuos voluminosos y escombros; limpieza y acondicionamiento de sitios municipales o de uso público.",
    categoria: "Sustentabilidad y recuperación ambiental",
  },
  {
    id: 12,
    nombre_proyecto:
      "Apoyo logístico y operativo, atención y orientación de usuarios (Estafeta y adm.)",
    alcance:
      "Orientación de usuarios en recintos, organización de información y distribución de correspondencia entre recintos.",
    categoria: "Apoyo social y comunitario directo",
  },
  {
    id: 13,
    nombre_proyecto:
      "Acompañamiento a personas mayores en situación de aislamiento (reformulada) — Cuidadoras",
    alcance:
      "Visitas de acompañamiento, apoyo en compras y trámites simples y vinculación con redes y servicios, a personas derivadas por la unidad municipal responsable.",
    categoria: "Apoyo social y comunitario directo",
  },
  {
    id: 14,
    nombre_proyecto:
      "Confección y reparación de textiles de uso comunitario — Talleres",
    alcance:
      "Confección y reparación de ropa de cama, abrigo y textiles para albergues, establecimientos y organizaciones comunitarias.",
    categoria: "Apoyo social y comunitario directo",
  },
  {
    id: 15,
    nombre_proyecto: "Prevención de incendios en la interfaz urbano-rural",
    alcance:
      "Despeje de vegetación seca, desmalezado preventivo y habilitación y mantención de fajas cortafuegos.",
    categoria: "Emergencia y mitigación de riesgos",
  },
  {
    id: 16,
    nombre_proyecto: "Limpieza y despeje posterior a emergencias",
    alcance:
      "Remoción de sedimentos, escombros y residuos; despeje de accesos y espacios públicos afectados por temporales o aluviones.",
    categoria: "Emergencia y mitigación de riesgos",
  },
  {
    id: 17,
    nombre_proyecto: "Apoyo operativo en albergues temporales",
    alcance:
      "Aseo, desinfección y acondicionamiento de espacios; inventario y orden de insumos.",
    categoria: "Emergencia y mitigación de riesgos",
  },
  {
    id: 18,
    nombre_proyecto: "Apoyo en centros de acopio",
    alcance:
      "Recepción, clasificación y embalaje de ayuda; apoyo a su distribución.",
    categoria: "Emergencia y mitigación de riesgos",
  },
  {
    id: 19,
    nombre_proyecto:
      "Apoyo logístico a la instalación de viviendas de emergencia (reformulada)",
    alcance:
      "Carga, descarga y traslado de materiales; limpieza y preparación del terreno; apoyo a cuadrillas bajo dirección de un responsable técnico.",
    categoria: "Emergencia y mitigación de riesgos",
  },
  {
    id: 20,
    nombre_proyecto:
      "Limpieza preventiva de cauces, canales y quebradas (nueva)",
    alcance:
      "Retiro de residuos y vegetación en canales, quebradas y cauces urbanos antes de la temporada de lluvias.",
    categoria: "Emergencia y mitigación de riesgos",
  },
] as const;

export type BancoProyectosID = (typeof Banco_proyectos)[number]["id"];

export function esDocumentoReemplazoValido(id: number): id is BancoProyectosID {
  return Banco_proyectos.some((d) => d.id === id);
}
