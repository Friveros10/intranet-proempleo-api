import bcrypt from 'bcryptjs';

export async function compararPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** dbo.Usuario (legacy) almacena la clave en texto plano; se compara directamente */
export function compararPasswordLegacy(password: string, claTexto: string | null): boolean {
  return !!claTexto && password === claTexto;
}
