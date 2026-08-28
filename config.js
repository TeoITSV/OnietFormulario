import { sql, exigirSesion } from './_lib.js';

/* Protegido: cupos, estado de la convocatoria y links a los reglamentos. */
export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Método no permitido' });
  if (!exigirSesion(req, res)) return;

  const cfg = (req.body || {}).config;
  if (!cfg || !Array.isArray(cfg.comps)) {
    return res.status(400).json({ error: 'Configuración inválida' });
  }

  /* nos quedamos sólo con los campos esperados: el cliente no decide el esquema */
  const limpio = {
    edicion: String(cfg.edicion || '').slice(0, 200),
    cierre: String(cfg.cierre || '').slice(0, 40),
    abierta: cfg.abierta !== false,
    maxPref: Math.max(0, Math.min(33, Number(cfg.maxPref) || 0)),
    comps: cfg.comps.slice(0, 100).map(c => ({
      id: String(c.id).slice(0, 60),
      n: String(c.n || '').slice(0, 120),
      cat: String(c.cat || '').slice(0, 10),
      cupo: Math.max(0, Math.min(99, Number(c.cupo) || 0)),
      modalidad: c.modalidad === 'individual' ? 'individual' : 'equipo',
      activa: c.activa !== false,
      web: /^https?:\/\//i.test(c.web || '') ? String(c.web).slice(0, 300) : '',
      pdf: /^https?:\/\//i.test(c.pdf || '') ? String(c.pdf).slice(0, 300) : ''
    }))
  };

  try {
    await sql`
      insert into configuracion (id, valor) values (1, ${JSON.stringify(limpio)}::jsonb)
      on conflict (id) do update set valor = excluded.valor, actualizado = now()`;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No se pudo guardar la configuración' });
  }
}
