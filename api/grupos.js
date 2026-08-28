import { sql, config } from './_lib.js';

/* Público, pero acotado: sólo para las competencias por equipo, el alumno ve
   quién más ya se anotó (para armar el equipo), y sólo nombre, apellido
   y curso — nunca mail ni teléfono. */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const cfg = await config();
    const equipos = new Set((cfg?.comps || []).filter(c => c.modalidad === 'equipo').map(c => c.id));

    const filas = await sql`
      select pc.competencia, pc.grupo, p.nombre, p.curso
      from postulacion_competencia pc
      join postulacion p on p.id = pc.postulacion_id
      order by pc.competencia, pc.grupo nulls last, p.nombre`;

    const grupos = {};
    for (const f of filas) {
      if (!equipos.has(f.competencia)) continue;
      if (!grupos[f.competencia]) grupos[f.competencia] = [];
      grupos[f.competencia].push({ nombre: f.nombre, curso: f.curso, grupo: f.grupo });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ grupos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No se pudieron leer los grupos' });
  }
}
