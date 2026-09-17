interface RegistroIntentos {
  intentos: number;
  bloqueadoHasta: number | null;
}

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

/** Control de intentos fallidos de login en memoria (dbo.Usuario no tiene columnas para esto) */
const registros = new Map<number, RegistroIntentos>();

export const loginAttemptsTracker = {
  estaBloqueado(rutUsu: number): boolean {
    const registro = registros.get(rutUsu);
    return !!registro?.bloqueadoHasta && registro.bloqueadoHasta > Date.now();
  },

  registrarFallo(rutUsu: number): void {
    const registro = registros.get(rutUsu) ?? { intentos: 0, bloqueadoHasta: null };
    registro.intentos += 1;
    if (registro.intentos >= MAX_INTENTOS) {
      registro.bloqueadoHasta = Date.now() + BLOQUEO_MS;
    }
    registros.set(rutUsu, registro);
  },

  resetear(rutUsu: number): void {
    registros.delete(rutUsu);
  },
};
