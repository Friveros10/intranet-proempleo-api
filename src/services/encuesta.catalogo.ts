// Las alternativas de presentación se definen exclusivamente en el frontend.
export const seccionesEncuesta = [
  { id: 1, titulo: 'Sobre usted' },
  { id: 2, titulo: 'Cómo funcionó el ejecutor en 2026' },
  { id: 3, titulo: 'Evaluación general' },
  { id: 4, titulo: 'Solo para dirigentes' },
];

export const preguntasEncuesta = [
  [1, "Región y comuna donde trabaja", "text", true, 1],
  [1, "Organismo ejecutor", "text", true, 2],
  [1, "Usted es", "radio", true, 3],
  [1, "Tiempo en el Programa", "radio", true, 4],
  [2, "Me pagaron el sueldo en la fecha que correspondía", "radio", true, 1],
  [2, "Recibí mi liquidación de sueldo todos los meses", "radio", true, 2],
  [2, "Cuando pedí un documento, me lo entregaron a tiempo", "radio", true, 3],
  [2, "Recibí la ropa de trabajo y los elementos de protección que necesito", "radio", true, 4],
  [2, "Tuve los materiales y herramientas para hacer mi trabajo", "radio", true, 5],
  [2, "Pude ir a la oficina del ejecutor sin dificultad", "radio", true, 6],
  [2, "Cuando tuve una consulta o un problema, me respondieron pronto", "radio", true, 7],
  [2, "El equipo del ejecutor me trató con respeto", "radio", true, 8],
  [2, "El supervisor del ejecutor visitó mi lugar de trabajo", "radio", true, 9],
  [3, "¿Qué nota le pone al ejecutor por su trabajo en 2026?", "radio", true, 1],
  [3, "¿Qué es lo principal que el ejecutor debería mejorar?", "textarea", false, 2],
  [4, "El ejecutor respondió los problemas que le planteé en nombre de los trabajadores", "radio", true, 1],
  [4, "El ejecutor cumplió lo que comprometió en materiales, actividades y condiciones de trabajo", "radio", true, 2],
  [4, "¿Quedan problemas sin resolver con este ejecutor?", "table_repeat", false, 3],
] as const;

