import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL);

/* ---------------- sesión de coordinación ----------------
   Cookie httpOnly firmada con HMAC: el navegador no puede fabricarla
   ni leerla desde JavaScript, y la contraseña nunca sale del servidor. */

const COOKIE = 'oniet_sesion';
const DURACION_HS = 12;

function secreto() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('Falta SESSION_SECRET (mínimo 32 caracteres)');
  return s;
}

function firmar(payload) {
  return crypto.createHmac('sha256', secreto()).update(payload).digest('base64url');
}

export function crearSesion(res) {
  const vence = Date.now() + DURACION_HS * 3600 * 1000;
  const payload = String(vence);
  const token = `${payload}.${firmar(payload)}`;
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${DURACION_HS * 3600}`);
}

export function cerrarSesion(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
}

export function haySesion(req) {
  const raw = (req.headers.cookie || '')
    .split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const token = raw.slice(COOKIE.length + 1);
  const [payload, firma] = token.split('.');
  if (!payload || !firma) return false;

  const esperada = firmar(payload);
  const a = Buffer.from(firma), b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  return Number(payload) > Date.now();
}

export function exigirSesion(req, res) {
  if (haySesion(req)) return true;
  res.status(401).json({ error: 'No autorizado' });
  return false;
}

/* comparación en tiempo constante, para no filtrar la contraseña por timing */
export function passwordValida(intento) {
  const real = process.env.COORD_PASSWORD || '';
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(intento)).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ---------------- datos ---------------- */

export async function conteos() {
  const filas = await sql`
    select competencia, count(*)::int as n
    from postulacion_competencia
    group by competencia`;
  return Object.fromEntries(filas.map(f => [f.competencia, f.n]));
}

export async function config() {
  const filas = await sql`select valor from configuracion where id = 1`;
  return filas.length ? filas[0].valor : null;
}
