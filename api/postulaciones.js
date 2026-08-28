import { sql, exigirSesion } from './_lib.js';

const ESTADOS = ['postulado', 'seleccionado', 'suplente', 'descartado'];

/* Protegido. Es el único lugar donde salen nombres, mails y teléfonos. */
export default async function handler(req, res) {
  if (!exigirSesion(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const filas = await sql`
        select p.id, p.nombre, p.curso, p.email, p.tel, p.especialidad,
               p.experiencia, p.estado, p.creado,
               coalesce(
                 array_agg(pc.competencia order by pc.orden)
                 filter (where pc.competencia is not null), '{}') as prefs
        from postulacion p
        left join postulacion_competencia pc on pc.postulacion_id = p.id
        group by p.id
        order by p.creado`;

      return res.status(200).json({
        postulaciones: filas.map(f => ({
          id: f.id, nombre: f.nombre, curso: f.curso, email: f.email,
          tel: f.tel, especialidad: f.especialidad, exp: f.experiencia,
          estado: f.estado, ts: f.creado, prefs: f.prefs
        }))
      });
    }

    if (req.method === 'PATCH') {
      const { email, estado } = req.body || {};
      if (!email || !ESTADOS.includes(estado)) {
        return res.status(400).json({ error: 'Datos inválidos' });
      }
      await sql`update postulacion set estado = ${estado} where email = ${String(email).toLowerCase()}`;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Falta el mail' });
      await sql`delete from postulacion where email = ${String(email).toLowerCase()}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error de base de datos' });
  }
}
