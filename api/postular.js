import { sql, config, conteos } from './_lib.js';

const MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ESPECIALIDADES = ['electromecanica', 'programacion', 'electronica', 'primer-ciclo'];

/* Público, pero validado del lado del servidor: el frontend no es de fiar.
   Volver a postularse con el mismo mail reemplaza la postulación anterior. */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const b = req.body || {};
  const nombre = String(b.nombre || '').trim().slice(0, 120);
  const curso = String(b.curso || '').trim().slice(0, 40);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 160);
  const tel = String(b.tel || '').trim().slice(0, 40);
  const especialidad = ESPECIALIDADES.includes(b.especialidad) ? b.especialidad : '';
  const exp = String(b.exp || '').trim().slice(0, 500);
  const prefs = Array.isArray(b.prefs) ? b.prefs.map(String) : [];

  if (nombre.length < 3 || !curso || !MAIL.test(email)) {
    return res.status(400).json({ error: 'Completá nombre, curso y un mail válido.' });
  }
  if (!especialidad) {
    return res.status(400).json({ error: 'Elegí tu especialidad.' });
  }
  if (!prefs.length) return res.status(400).json({ error: 'Elegí al menos una competencia.' });

  try {
    const cfg = await config();
    if (cfg && cfg.abierta === false) {
      return res.status(403).json({ error: 'La convocatoria está cerrada.' });
    }

    /* sólo aceptamos ids que existan y estén activas: nadie inventa competencias */
    const activas = new Set((cfg?.comps || []).filter(c => c.activa).map(c => c.id));
    const elegidas = prefs.filter(id => activas.has(id));
    if (!elegidas.length) return res.status(400).json({ error: 'Las competencias elegidas ya no están disponibles.' });

    const tope = Number(cfg?.maxPref || 0);
    if (tope > 0 && elegidas.length > tope) {
      return res.status(400).json({ error: `Podés elegir hasta ${tope} competencias.` });
    }

    const previas = await sql`select id from postulacion where email = ${email}`;
    const idPrevio = previas.length > 0 ? previas[0].id : null;
    const actualizado = previas.length > 0;

    /* para las competencias por equipo, el alumno elige a qué grupo se
       suma (Grupo 1, Grupo 2...); validamos cupo de grupos y que ese
       grupo puntual no esté ya completo según los integrantes cargados */
    const compMap = new Map((cfg?.comps || []).map(c => [c.id, c]));
    const gruposSel = (b.grupos && typeof b.grupos === 'object') ? b.grupos : {};
    const grupoPorCompetencia = {};
    for (const compId of elegidas) {
      const c = compMap.get(compId);
      if (!c || c.modalidad !== 'equipo') continue;
      const cupoGrupos = Number(c.cupo) || 0;
      if (cupoGrupos <= 0) continue;
      const integrantes = Math.max(1, Number(c.integrantes) || 1);
      const grupo = Number(gruposSel[compId]);
      if (!Number.isInteger(grupo) || grupo < 1 || grupo > cupoGrupos) {
        return res.status(400).json({ error: `Elegí un grupo válido para "${c.n}".` });
      }
      const ocupado = await sql`
        select count(*)::int as n from postulacion_competencia
        where competencia = ${compId} and grupo = ${grupo}
          and postulacion_id is distinct from ${idPrevio}`;
      if (ocupado[0].n >= integrantes) {
        return res.status(400).json({ error: `El grupo ${grupo} de "${c.n}" ya está completo.` });
      }
      grupoPorCompetencia[compId] = grupo;
    }

    const filas = await sql`
      insert into postulacion (nombre, curso, email, tel, especialidad, experiencia)
      values (${nombre}, ${curso}, ${email}, ${tel}, ${especialidad}, ${exp})
      on conflict (email) do update set
        nombre = excluded.nombre, curso = excluded.curso, tel = excluded.tel,
        especialidad = excluded.especialidad, experiencia = excluded.experiencia,
        creado = now()
      returning id`;
    const id = filas[0].id;

    await sql`delete from postulacion_competencia where postulacion_id = ${id}`;
    for (let i = 0; i < elegidas.length; i++) {
      await sql`
        insert into postulacion_competencia (postulacion_id, competencia, orden, grupo)
        values (${id}, ${elegidas[i]}, ${i + 1}, ${grupoPorCompetencia[elegidas[i]] ?? null})`;
    }

    return res.status(200).json({ ok: true, actualizado, conteos: await conteos() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No se pudo guardar la postulación.' });
  }
}
