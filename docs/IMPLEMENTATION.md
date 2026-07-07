# IMPLEMENTATION.md — Yuthikal AudioTech

Guía completa para implementar, desplegar y operar la aplicación.
Documentos relacionados: [`PLAN.md`](./PLAN.md) (plan por fases y decisiones), [`SETUP.md`](./SETUP.md) (manuales paso a paso de los servicios externos), [`design_handoff_yuthikal_audiotech/`](../design_handoff_yuthikal_audiotech/README.md) (fuente de verdad de UI).

---

## 1. Prerequisitos y cuentas

| Servicio | Para qué | Plan | Manual detallado |
|---|---|---|---|
| **Supabase** | Base de datos Postgres, Google OAuth, Storage de MP3, RLS | Free | `SETUP.md` — Manual 1 |
| **GitHub** | Repositorio y despliegue continuo | Free | `SETUP.md` — Manual 2 |
| **Vercel** | Hosting de Next.js + cron de keepalive | Hobby (free) | `SETUP.md` — Manual 2 |
| **Google Cloud Console** | Credenciales OAuth para "Continuar con Google" | Free | `SETUP.md` — Manual 3 |

Local: **Node.js ≥ 20** (probado con 24), npm ≥ 10, git.

## 2. Variables de entorno

Copiar `.env.example` a `.env.local` (local) y configurar las mismas en Vercel (Project → Settings → Environment Variables):

| Variable | Qué es | Dónde se obtiene |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave **pública** (anon/publishable). La seguridad real la dan las políticas RLS | Ídem |
| `NEXT_PUBLIC_ADMIN_EMAIL` | (Opcional) correo del botón "Contactar al administrador" en la página de error | — |

⚠️ **Nunca** usar la clave `service_role`/Secret en este proyecto: todo el acceso a datos pasa por la anon key + RLS. `.env*` está en `.gitignore`.

## 3. Base de datos

### 3.1 Esquema

| Tabla | Contenido | Acceso |
|---|---|---|
| `keepalive` | 1 fila; objetivo del ping del cron | Lectura pública |
| `chords` / `chord_positions` | Catálogo: 481 acordes / 1,924 posiciones (generado de `@tombatossals/chords-db`) | Lectura pública |
| `playlists` | Playlists del usuario (género, doble rating 1–5) | RLS solo dueño |
| `songs` | Canciones: metadatos + contenido ChordPro (con directiva propia `{strum:}`) | RLS solo dueño |
| `song_audio` | Fuente de audio por canción: YouTube (video id + título) o archivo (ruta en Storage) | RLS solo dueño |
| `song_sync` | Sincronización: granularidad (línea/palabra) + timestamps JSONB `[{i, t}]` | RLS solo dueño |

Storage: bucket privado **`audio`** (15 MB máx., solo `audio/mpeg`), políticas por carpeta `audio/<uid>/…`.

### 3.2 Migraciones (ejecutar en orden en el SQL Editor de Supabase)

1. `supabase/migrations/00000000000000_keepalive.sql`
2. `supabase/migrations/00000000000001_chords.sql` (esquema del catálogo)
3. `supabase/migrations/00000000000002_playlists.sql`
4. `supabase/migrations/00000000000003_songs.sql`
5. `supabase/migrations/00000000000004_audio_sync.sql` (incluye el bucket de Storage)

### 3.3 Seed del catálogo de acordes

```bash
node scripts/generate-chords-sql.mjs   # regenera supabase/seed_chords.sql (~277 KB)
```

Luego pegar y ejecutar `supabase/seed_chords.sql` en el SQL Editor (después de la migración 1). El script excluye los acordes con bajo alterado ("/E", "m/B"…) por ser inversiones, no cualidades; calcula notas/intervalos desde los MIDI, asigna categorías paraguas y nombres en español. El campo `popularity` queda reservado para curación manual futura.

## 4. Ejecución local

```bash
npm install          # instala dependencias (lockfile versionado)
npm run dev          # desarrollo en http://localhost:3000
npm test             # 51 tests unitarios de lógica crítica (Vitest)
npm run lint         # ESLint (reglas React 19 estrictas)
npm run format       # Prettier sobre src/ y messages/
npm run build        # build de producción (incluye type-check)
npm run start        # sirve el build local
```

Tests cubren: parser de búsqueda de acordes ES/EN, parser/render ChordPro, edición visual por offsets, rasgueo, parser de URLs de YouTube y validación de timestamps.

## 5. Despliegue (Vercel)

1. Push a `main` → despliegue automático (proyecto importado desde GitHub, framework autodetectado).
2. Variables de entorno de la sección 2 configuradas en el proyecto.
3. **Cron keepalive**: `vercel.json` registra `GET /api/keepalive` diario (`0 8 * * *`); verificar en Settings → Cron Jobs. Esto evita la pausa por inactividad del free tier de Supabase.
4. OAuth: la URL de producción debe estar en Google Cloud (JavaScript origins) y en Supabase (Site URL); `http://localhost:3000/**` como redirect adicional para desarrollo. Detalle en `SETUP.md` — Manual 3.

## 6. Estructura del proyecto

```
messages/                 Textos ES/EN (next-intl; ES por defecto)
public/brand/             Logos por tema (crop = oscuro, claro = claro)
scripts/                  generate-chords-sql.mjs (seed del catálogo)
supabase/migrations/      SQL de esquema + RLS (ver §3.2)
supabase/seed_chords.sql  Datos del catálogo (generado)
src/app/                  Rutas (App Router)
  api/keepalive/          Ping del cron
  auth/callback/          Canje del código OAuth (valida redirects internos)
  guitar/                 Instrumentos, cuerdas, notas, buscador y detalle de acordes
  login/  playlists/      Auth y área privada; canción en /playlists/[id]/songs/[songId]
                          con ?mode=view|edit|calibrate|karaoke
src/components/           UI (fieles al handoff):
  chord-diagram           Diagrama SVG (spec del handoff; frets/barres/baseFret de chords-db)
  chord-finder/-card      Buscador con voz, scroll infinito, FAB
  chord-sheet             Cifrado clásico: acordes sobre sílabas, popovers, leyenda
  song-editor/-picker     Editor ChordPro (texto con highlight + visual por offsets)
  song-calibration        Fuente de audio, granularidad, marcado con ESPACIO, transporte
  song-karaoke            Pantalla hero: sincronizada + fallback autoscroll
  confirm-dialog          Confirmación destructiva estándar (no hay diálogos nativos)
src/lib/                  Lógica y acceso a datos:
  chordpro.ts             Parser/edición ChordPro (+tests)
  chord-search.ts         Parser de búsqueda ES/EN y slugs (+tests)
  youtube.ts / audio.ts   Validaciones de audio (+tests)
  use-audio-engine.ts     Reloj unificado YouTube IFrame API / <audio>
  *-actions.ts            Server actions (re-validación en servidor)
  supabase(-server).ts    Clientes anon (público) y con sesión (cookies)
src/proxy.ts              Refresco de sesión de Supabase (convención proxy de Next 16)
src/i18n/                 Configuración next-intl por cookie (sin rutas por idioma)
```

## 7. Dependencias

| Paquete | Versión | Propósito |
|---|---|---|
| `next` | 16.2.10 | Framework (App Router, Turbopack) |
| `react` / `react-dom` | 19.2.4 | UI |
| `@supabase/supabase-js` | ^2.110 | Cliente de datos/auth/storage |
| `@supabase/ssr` | ^0.12 | Sesión por cookies para App Router |
| `next-intl` | ^4.13 | i18n ES/EN |
| `next-themes` | ^0.4 | Tema claro/oscuro/sistema |
| `lucide-react` | ^1.23 | Íconos de línea (sin marcas: YouTube/Google son SVG inline) |
| `@tombatossals/chords-db` | ^0.5 | Fuente del catálogo (solo para el script de seed) |
| dev: `tailwindcss` ^4, `typescript` ^5, `eslint`+`eslint-config-next`, `prettier` ^3.9, `vitest` ^4.1 | | Estilos, tipos, calidad y tests |

Override en `package.json`: `postcss ^8.5.10` (parchea un aviso de seguridad del postcss anidado de Next). `npm audit`: 0 vulnerabilidades.

## 8. Operación y decisiones conocidas

**Si la base de datos se pausa** (free tier, ~7 días sin actividad): la app muestra "La base de datos se encuentra inaccesible por inactividad…". Reactivar en el dashboard de Supabase → *Restore project* (~1 min, sin pérdida de datos). Con el cron de Vercel activo esto no debería ocurrir.

**Actualizar dependencias**: `npm outdated` → actualizar → `npm audit` → `npm run lint && npm test && npm run build`. Política del proyecto: última versión estable verificada en npm.

**Límites de los free tiers**: Supabase 500 MB de BD + 1 GB de Storage (~60 MP3 de 15 MB) + pausa por inactividad; Vercel Hobby: 1 cron diario, funciones con timeout estándar.

**Decisiones registradas**:
- *Rutas 200 con UI de error/redirect*: por el streaming de Next 16 + la pantalla Loading global, páginas inexistentes o protegidas responden HTTP 200 con la UI correcta (404 visual / redirect a login). Sin impacto para una app personal sin SEO; los datos jamás se filtran (los guards corren antes de cualquier query).
- *Pantalla de consentimiento de Google* muestra el dominio de Supabase: comportamiento estándar sin dominio propio; se aceptó (opción A) — cambiarlo requiere el add-on Custom Domain de Supabase + verificación de Google.
- *Búsqueda por voz* solo Chrome/Edge (Web Speech API); la UI lo indica y degrada a escritura.
- *Acordes con bajo alterado* excluidos del catálogo (48); re-incluibles editando `scripts/generate-chords-sql.mjs`.
- *Tabla `profiles` omitida*: nombre/avatar salen de la sesión de Google; idioma/tema se persisten en el navegador.
- *CSP*: `script-src` incluye `'unsafe-inline'` (requisito de hidratación de Next sin nonces) y `https://www.youtube.com` (IFrame API); `connect-src` limitado a Supabase; `frame-ancestors 'none'`.
