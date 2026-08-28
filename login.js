import { passwordValida, crearSesion, cerrarSesion } from './_lib.js';

/* La contraseña vive sólo en la variable de entorno COORD_PASSWORD.
   No viaja al navegador ni aparece en el código publicado. */
export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    cerrarSesion(res);
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const intento = String((req.body || {}).password || '');

  /* demora fija: hace lento el intento por fuerza bruta sin delatar nada */
  await new Promise(r => setTimeout(r, 600));

  if (!passwordValida(intento)) {
    return res.status(200).json({ ok: false });
  }
  crearSesion(res);
  return res.status(200).json({ ok: true });
}
