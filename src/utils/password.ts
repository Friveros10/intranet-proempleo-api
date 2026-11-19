import bcrypt from 'bcryptjs';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

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

const formatoClaveUsuario = /^\$s1\$([A-Za-z0-9_-]{22})([A-Za-z0-9_-]{22})$/;

function derivarClaveUsuario(clave: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(clave, sal, 16, { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }, (error, claveDerivada) => {
      if (error) reject(error);
      else resolve(claveDerivada);
    });
  });
}

export async function hashClaveUsuario(clave: string): Promise<string> {
  // El prefijo, la sal y el hash ocupan 48 caracteres en cla_usu (VARCHAR(50)).
  const sal = randomBytes(16);
  const hash = await derivarClaveUsuario(clave, sal);
  return `$s1$${sal.toString('base64url')}${hash.toString('base64url')}`;
}

export async function compararClaveUsuario(clave: string, almacenada: string | null): Promise<boolean> {
  const partes = almacenada?.match(formatoClaveUsuario);
  if (!partes) return compararPasswordLegacy(clave, almacenada);
  const hash = await derivarClaveUsuario(clave, Buffer.from(partes[1], 'base64url'));
  return timingSafeEqual(hash, Buffer.from(partes[2], 'base64url'));
}
