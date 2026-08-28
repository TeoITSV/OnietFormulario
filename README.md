# Convocatoria ONIET 2026 — Instituto Técnico Salesiano Villada

App para que los alumnos se postulen a las competencias de ONIET y la coordinación
arme la delegación viendo la demanda real por competencia.

## Cómo está armado

```
public/index.html   toda la interfaz (alumno + panel de coordinación)
api/estado.js       PÚBLICO   config + cuántos se anotaron en cada competencia
api/postular.js     PÚBLICO   alta / actualización de una postulación
api/login.js        PÚBLICO   valida la contraseña y abre la sesión
api/postulaciones.js PROTEGIDO listado completo, cambio de estado, baja
api/config.js       PROTEGIDO cupos, cierre, links a reglamentos
schema.sql          las tres tablas
```

Es HTML estático más funciones serverless. No hay build ni framework.

## Por qué la contraseña queda segura

La contraseña vive en la variable de entorno `COORD_PASSWORD`, que sólo existe
del lado del servidor. El navegador nunca la recibe: manda el intento a
`/api/login`, el servidor compara y devuelve una cookie `httpOnly` firmada con
HMAC. Un alumno que abra el código fuente ve el HTML y el JavaScript, pero
ninguna credencial.

Lo importante es que la protección no está en esconder el panel, sino en que
`/api/postulaciones` y `/api/config` rechazan con 401 cualquier pedido sin
cookie válida. El endpoint público sólo devuelve conteos: cuántos se anotaron
en cada competencia, nunca quiénes.

## Puesta en marcha

1. **Subí la carpeta a un repo de GitHub.**

2. **Importá el repo en Vercel** (Add New → Project). Framework preset: *Other*.
   No hace falta configurar build.

3. **Creá la base**: en el proyecto, pestaña Storage → Marketplace → Neon →
   plan gratuito. Vercel inyecta `DATABASE_URL` solo.

4. **Creá las tablas**: abrí la base en Neon → SQL Editor → pegá `schema.sql` → Run.

5. **Cargá las dos variables** en Settings → Environment Variables:

   | Variable | Valor |
   |---|---|
   | `COORD_PASSWORD` | `OnietITSVillada2026` (cambiala por una larga y única) |
   | `SESSION_SECRET` | 40+ caracteres al azar, ver abajo |

   Para generar el secreto: `openssl rand -base64 48`

6. **Redeploy** (las variables nuevas no aplican al deploy anterior).

7. Entrá a la URL, andá a *Coordinación*, cargá los cupos y guardá. Esa primera
   vez se crea la configuración en la base.

## Después

- **Cambiar la contraseña**: editás `COORD_PASSWORD` en Vercel y redeploy.
  No se cambia desde la app, justamente para que no viva en la base.
- **Cerrar la convocatoria**: Coordinación → Configuración → Estado: Cerrada.
  El servidor rechaza altas nuevas aunque alguien fuerce el pedido.
- **Sacar los datos**: los dos botones de CSV del panel.

## Límites conocidos

El alumno no puede consultar ni borrar su postulación por mail: cualquiera que
supiera el mail de un compañero podría hacerlo. Si se equivoca, se vuelve a
anotar con el mismo mail y la postulación se reemplaza. Las bajas las hacés vos
desde el panel.

La base de Neon en plan gratuito se duerme cuando no hay tráfico; el primer
pedido después de un rato tarda medio segundo más. Para esta escala no importa.
