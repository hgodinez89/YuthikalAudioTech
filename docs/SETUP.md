# Manuales de configuración — Yuthikal AudioTech

Pasos manuales que debe ejecutar el administrador del proyecto en los servicios externos.
Orden recomendado: **1) Supabase → 2) GitHub + Vercel → 3) Google OAuth**.

---

## Manual 1 — Supabase (requerido para la Fase 3)

> Resultado: proyecto de base de datos creado, credenciales en `.env.local` y tabla de keepalive migrada.

### 1.1 Crear la cuenta y el proyecto

1. Entra a **https://supabase.com** y pulsa **Start your project** / **Sign in**. Puedes registrarte con tu cuenta de GitHub o Google.
2. Ya dentro del dashboard, pulsa **New project**.
3. Completa el formulario:
   - **Organization**: la que te crea por defecto (o crea una llamada `yuthikal`).
   - **Project name**: `yuthikal-audiotech`.
   - **Database password**: genera una contraseña fuerte y **guárdala en un lugar seguro** (es la contraseña de Postgres; no la necesitas a diario, pero sí para conexiones directas).
   - **Region**: elige la más cercana a ti. Para Centroamérica la mejor opción suele ser **East US (North Virginia)**.
   - **Plan**: Free.
4. Pulsa **Create new project** y espera 1–2 minutos mientras aprovisiona.

### 1.2 Obtener las credenciales

1. En el menú lateral: **Project Settings** (ícono de engranaje) → **API** (o **API Keys** según la versión del dashboard).
2. Copia dos valores:
   - **Project URL** — algo como `https://abcdefgh.supabase.co`
   - **Clave pública** — según la versión del dashboard se llama **anon public** o **Publishable key**. Es la clave *pública* diseñada para el navegador (la seguridad real la dan las políticas RLS).
   - ⚠️ **Nunca** copies ni uses en el frontend la clave `service_role` / **Secret key**.

### 1.3 Configurar el proyecto local

1. En la raíz del repo (`C:\RepositoriosGit\YuthikalMusic`), crea el archivo **`.env.local`** copiando `.env.example`.
2. Rellénalo:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=la-clave-publica-que-copiaste
NEXT_PUBLIC_ADMIN_EMAIL=tu-correo@ejemplo.com   # opcional, para el botón "Contactar al administrador"
```

3. `.env.local` ya está en `.gitignore` — no se sube nunca al repositorio.

### 1.4 Ejecutar la migración de keepalive

1. En el dashboard de Supabase: menú lateral → **SQL Editor** → **New query**.
2. Abre en tu editor el archivo del repo `supabase/migrations/00000000000000_keepalive.sql`, copia todo su contenido y pégalo en el editor SQL.
3. Pulsa **Run** (o Ctrl+Enter). Debe decir "Success. No rows returned".
4. Verifica: menú lateral → **Table Editor** → debe existir la tabla **keepalive** con 1 fila.

### 1.5 Avísame

Cuando termines, dime "Supabase listo" y yo verifico el keepalive local (con `CRON_SECRET` en `.env.local`, `curl -H "Authorization: Bearer …" http://localhost:3000/api/keepalive` debe responder `{"ok":true}`) y continúo con la importación de acordes de la Fase 3.

> **Nota del free tier**: el proyecto se pausa tras ~7 días sin actividad de base de datos. Una vez desplegado en Vercel, el cron diario lo mantiene despierto solo. Mientras tanto, usar la app en desarrollo ya cuenta como actividad. Si algún día lo encuentras pausado: dashboard → botón **Restore project** (~1 minuto, no se pierden datos).

---

## Manual 2 — GitHub + Vercel (cierra el deploy de la Fase 0)

> Resultado: código en GitHub, app desplegada en Vercel con el cron de keepalive activo.

### 2.1 Crear el repositorio en GitHub

1. Entra a **https://github.com/new** (crea cuenta si no tienes).
2. **Repository name**: `YuthikalMusic` (o el nombre que prefieras).
3. **Visibility**: Private (recomendado para proyecto personal) o Public.
4. **NO** marques "Add a README" ni .gitignore ni licencia (el repo local ya los tiene).
5. Pulsa **Create repository** y copia la URL que te muestra (ej. `https://github.com/TU-USUARIO/YuthikalMusic.git`).

### 2.2 Subir el código

Opción A — me pasas la URL del repo y yo hago el commit inicial y el push desde la sesión.

Opción B — tú mismo en una terminal en `C:\RepositoriosGit\YuthikalMusic`:

```bash
git add -A
git commit -m "Fases 0-2: fundaciones, landing, instrumentos y referencia musical"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/YuthikalMusic.git
git push -u origin main
```

(Si git te pide identidad: `git config user.name "Tu Nombre"` y `git config user.email "tu-correo"`.)

### 2.3 Desplegar en Vercel

1. Entra a **https://vercel.com** → **Sign Up** → **Continue with GitHub** (así queda conectado al repo).
2. En el dashboard: **Add New…** → **Project**.
3. En la lista "Import Git Repository" busca `YuthikalMusic` y pulsa **Import**. (Si no aparece, pulsa "Adjust GitHub App Permissions" y dale acceso al repo.)
4. En la pantalla de configuración:
   - **Framework Preset**: detecta Next.js automáticamente — no toques nada.
   - Despliega **Environment Variables** y agrega una por una (las mismas de `.env.local`):
     | Name | Value |
     |---|---|
     | `NEXT_PUBLIC_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu clave pública |
     | `NEXT_PUBLIC_ADMIN_EMAIL` | tu correo (opcional) |
     | `CRON_SECRET` | un valor largo y aleatorio (p. ej. `node -e "console.log(crypto.randomUUID())"`); **sin** `NEXT_PUBLIC_` |
5. Pulsa **Deploy** y espera ~2 minutos.
6. Te dará una URL tipo `https://yuthikal-music-xxxx.vercel.app`. **Guárdala** — la necesitas para el Manual 3.

### 2.4 Verificar el cron de keepalive

1. En el proyecto de Vercel: **Settings** → **Cron Jobs**. Debe aparecer `/api/keepalive` con schedule `0 8 * * *` (viene de `vercel.json`; se registra en el primer deploy).
2. Prueba manual: el endpoint solo responde al cron (pide `CRON_SECRET`). Abrirlo en el navegador da `401`, que es lo esperado. Para probarlo: `curl -H "Authorization: Bearer TU_CRON_SECRET" https://TU-APP.vercel.app/api/keepalive` → `{"ok":true}`. También puedes lanzarlo desde **Settings → Cron Jobs → Run**. Sin la variable configurada responde `503` y la BD podría pausarse: créala antes de desplegar.
3. Con esto, el proyecto de Supabase ya no se pausará por inactividad.

> A partir de aquí, cada `git push` a `main` despliega automáticamente.

---

## Manual 3 — Google OAuth (necesario para la Fase 4, puede esperar)

> Resultado: botón "Continuar con Google" funcional vía Supabase Auth.

### 3.1 Crear el proyecto en Google Cloud

1. Entra a **https://console.cloud.google.com** con tu cuenta de Google.
2. Barra superior → selector de proyectos → **New Project** → nombre `Yuthikal AudioTech` → **Create** → selecciónalo.

### 3.2 Pantalla de consentimiento

1. Menú ☰ → **APIs & Services** → **OAuth consent screen**.
2. Si te pide configurar por primera vez (Get started):
   - **App name**: `Yuthikal AudioTech` · **User support email**: tu correo.
   - **Audience**: **External**.
   - **Contact information**: tu correo. → **Create**.
3. Como la app queda en modo *Testing*, agrega tu propio correo como **Test user** (sección **Audience** → **Test users** → **Add users**). Solo los test users pueden iniciar sesión, lo cual es perfecto para una app personal.

### 3.3 Obtener el callback de Supabase

1. En el dashboard de **Supabase**: **Authentication** → **Sign In / Providers** → **Google**.
2. Ahí verás el campo **Callback URL (for OAuth)**, algo como:
   `https://TU-PROYECTO.supabase.co/auth/v1/callback`
3. Cópialo — lo usarás en el paso siguiente. Deja esta pestaña abierta.

### 3.4 Crear las credenciales OAuth

1. De vuelta en Google Cloud: **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
2. **Application type**: Web application. **Name**: `yuthikal-web`.
3. **Authorized JavaScript origins** — agrega ambos:
   - `http://localhost:3000`
   - `https://TU-APP.vercel.app`
4. **Authorized redirect URIs** — agrega el callback de Supabase copiado en 3.3.
5. **Create** → te muestra el **Client ID** y el **Client Secret**. Cópialos.

### 3.5 Activar Google en Supabase

1. En la pestaña de Supabase (**Authentication → Sign In / Providers → Google**):
   - Activa **Enable Sign in with Google**.
   - Pega **Client ID** y **Client Secret**.
   - **Save**.
2. Luego en **Authentication** → **URL Configuration**:
   - **Site URL**: `https://TU-APP.vercel.app`
   - **Additional Redirect URLs**: `http://localhost:3000/**`
   - **Save**.

### 3.6 Avísame

Dime "Google OAuth listo" y en la Fase 4 conecto el flujo de login de la app contra esta configuración.

---

## Checklist rápido

- [ ] Supabase: proyecto creado, `.env.local` con URL + clave pública, migración keepalive ejecutada → **desbloquea Fase 3**
- [ ] GitHub: repo creado y código subido
- [ ] Vercel: proyecto importado, 2–3 variables de entorno, deploy OK, cron visible → **cierra Fase 0**
- [ ] Google Cloud: OAuth client creado con el callback de Supabase, provider activado en Supabase → **desbloquea Fase 4**
