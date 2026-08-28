import { config, conteos } from './_lib.js';

/* Público. Devuelve sólo lo que el alumno necesita ver:
   la configuración de la convocatoria y cuántos se anotaron en cada
   competencia. Nunca nombres, mails ni teléfonos. */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const [cfg, n] = await Promise.all([config(), conteos()]);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ config: cfg, conteos: n });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No se pudo leer el estado' });
  }
}
