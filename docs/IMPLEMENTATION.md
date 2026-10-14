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
| `chords` / `chord_positions` | Catálogo por instrumento (`chords.instrument`): guitarra 481 acordes / 1,924 posiciones, ukelele 552 / 2,114 (generado de `@tombatossals/chords-db`) | Lectura pública |
| `playlists` | Playlists del usuario (género, rating "Me gusta" 1–5) | RLS solo dueño |
| `songs` | Canciones: metadatos + contenido ChordPro (con directiva propia `{strum:}`); `playlist_id` opcional (lista plana); `instruments` (guitar/ukulele/piano, informativo) | RLS solo dueño |
| `song_audio` | Fuente de audio por canción: YouTube (video id + título) o archivo (ruta en Storage) | RLS solo dueño |
| `song_sync` | Sincronización: granularidad (línea/palabra) + timestamps JSONB `[{i, t}]` + fin opcional `end_at` | RLS solo dueño |

Storage: bucket privado **`audio`** (15 MB máx., solo `audio/mpeg`), políticas por carpeta `audio/<uid>/…`.

### 3.2 Migraciones (ejecutar en orden en el SQL Editor de Supabase)

1. `supabase/migrations/00000000000000_keepalive.sql`
2. `supabase/migrations/00000000000001_chords.sql` (esquema del catálogo)
3. `supabase/migrations/00000000000002_playlists.sql`
4. `supabase/migrations/00000000000003_songs.sql`
5. `supabase/migrations/00000000000004_audio_sync.sql` (incluye el bucket de Storage)
6. `supabase/migrations/00000000000005_instruments_flat_songs.sql` (columna `chords.instrument`, `songs.playlist_id` opcional con `on delete set null`, RLS de inserción/actualización que valida la playlist destino)
7. `supabase/migrations/00000000000006_song_instruments.sql` (columna `songs.instruments`; ejecutar **antes** de desplegar el código que la usa)
8. `supabase/migrations/00000000000007_drop_playlist_difficulty.sql` (borra `playlists.rating_difficulty`; ejecutar **después** de desplegar el código que ya no la usa)
9. `supabase/migrations/00000000000008_sync_end.sql` (columna `song_sync.end_at`; ejecutar **antes** de desplegar el código que la usa)

### 3.3 Seed del catálogo de acordes

```bash
node scripts/generate-chords-sql.mjs   # regenera supabase/seed_chords_{guitar,ukulele}.sql (~280/316 KB)
```

Luego pegar y ejecutar `supabase/seed_chords_guitar.sql` y `supabase/seed_chords_ukulele.sql` en el SQL Editor (después de las migraciones 1 y 5). Cada seed borra e inserta solo su instrumento, así que se pueden correr por separado. **En una BD existente** basta con ejecutar la migración 5 y luego `seed_chords_ukulele.sql` (las filas de guitarra quedan con `instrument = 'guitar'` por defecto). Los ids de guitarra no llevan prefijo (`a-minor`); los de ukelele sí (`ukulele-a-minor`); las URLs usan siempre el slug sin prefijo. Las raíces `Db`/`Gb` del ukelele se normalizan a `C#`/`F#`. El script excluye los acordes con bajo alterado ("/E", "m/B"…) por ser inversiones, no cualidades; calcula notas/intervalos desde los MIDI, asigna categorías paraguas y nombres en español. El campo `popularity` queda reservado para curación manual futura.

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
public/brand/             Logos por tema (crop = oscuro, claro = claro) e iconos del manifest
scripts/                  generate-chords-sql.mjs (seeds del catálogo por instrumento)
supabase/migrations/      SQL de esquema + RLS (ver §3.2)
supabase/seed_chords_*.sql Datos del catálogo por instrumento (generados)
src/app/                  Rutas (App Router)
  api/keepalive/          Ping del cron
  auth/callback/          Canje del código OAuth (valida redirects internos)
  page.tsx                Landing: elección de instrumento (redirige al último usado)
  robots.ts / sitemap.ts  robots.txt y sitemap (secciones públicas, escalas y acordes)
  manifest.ts, apple-icon.png  Acceso directo en la pantalla de inicio (Android/iOS)
  [instrument]/           guitar | ukulele | piano (otro → 404); layout con barra inferior
    chords/[id]           Buscador (1.ª página desde el servidor; selector nota + tipo)
                          y detalle por slug
    scales/[slug]         Escalas: selector nota + tipo, mástil/teclado, posiciones y
                          acordes de la escala (/scales → Do mayor)
    songs/[songId]        Mis canciones (lista plana, ?list= filtra por playlist) y
                          canción con ?mode=view|edit|karaoke y &step=lyrics|audio
                          (única ruta con loading.tsx)
    basics/               Cuerdas (o teclado en piano) + notas musicales
  login/                  Login con Google; ?next= regresa a la página de origen
src/components/           UI (fieles al handoff):
  chord-diagram           Diagrama SVG (spec del handoff; frets/barres/baseFret de chords-db)
  site-header             Logo, pastilla de instrumento, secciones y menú de cuenta
  instrument-nav          Barra inferior de secciones en móvil y tablet (< md)
  chord-visual            Diagrama de trastes o teclado mini según el instrumento
  piano-keyboard/-chord   Teclado SVG (nombres, dedos, sonido) e inversiones de piano
  fretboard               Mástil SVG (escalas: mástil completo y posiciones)
  scale-picker/-view      Selector de escalas (enlaces) y vista con Notas/Grados y Escuchar
  chord-finder/-card      Buscador con selector nota + tipo, voz, scroll infinito, FAB
  chord-sheet             Cifrado clásico: acordes sobre sílabas, popovers, leyenda. El renglón salta
                          entre palabras, no en los acordes: `wordGroups` (y `unitGroups` en el editor
                          visual) mantiene juntas las palabras con acorde en medio; el karaoke usa lo mismo
  songs-view              Lista plana de canciones con playlists como filtros
  song-editor/-picker     Editor ChordPro (texto con highlight + visual por offsets),
                          "Pegar cifrado" y datos de la canción (incl. playlist).
                          Lado a lado (lg+), el botón entre paneles vincula el scroll
                          de ChordPro y vista previa (por defecto sí, recordado en
                          localStorage): cada sección es un ancla (`startLine` en el
                          texto, `[data-section]` en la vista previa) y entre anclas
                          se interpola (`lib/scroll-sync.ts`)
  song-calibration        Fuente de audio, granularidad, marcado con ESPACIO, transporte. Al retomar a medias, el audio arranca (pausado) en el inicio de la última línea marcada; las marcas pendientes se guardan al salir. Con todas las líneas marcadas, ESPACIO marca un fin opcional; la X lo descarta y el audio suena completo. "Sin fin" no se guarda: al volver a entrar sin fin marcado, la sincronización se muestra completa (la bandera permite agregar uno después). En modo palabra, los trozos que separa un acorde (`Re[D]demp[G]tion`) se muestran pegados según `spaceAfter`, aunque cada uno sea su propia marca
  song-karaoke            Pantalla hero: sigue el audio si hay sincronización; si no, autoscroll. Con audio, la intro queda fuera: play, "Al inicio" y los saltos empiezan 3 s antes de la primera línea sincronizada, y la barra cuenta 0:00 desde ahí. Con fin marcado, la barra termina en él y el audio se apaga con un fundido de 2 s y se pausa
  confirm-dialog          Confirmación destructiva estándar (no hay diálogos nativos)
  instrument-toggles      Instrumentos de una canción: selector múltiple e iconos
src/lib/                  Lógica y acceso a datos:
  chordpro.ts             Parser/edición ChordPro (+tests)
  chord-search.ts         Parser de búsqueda ES/EN, slugs y selector rápido (+tests)
  chord-query.ts          Página del buscador de acordes (servidor y cliente)
  chord-import.ts         Cifrado "acordes encima de la letra" → ChordPro (+tests)
  instruments.ts          Instrumentos activos/próximos, afinaciones, ids y rutas (+tests)
  piano.ts                Acordes de piano calculados: voicings, inversiones, dedos (+tests)
  scales.ts               Escalas calculadas: ortografía, mástil, posiciones, acordes (+tests)
  key-detect.ts           Tonalidad probable a partir de los acordes del cifrado (+tests)
  chord-data.ts           Diagramas de acordes por nombre (canción, escala) según instrumento
  use-piano-synth.ts      Sintetizador Web Audio (piano, escalas)
  youtube.ts / audio.ts   Validaciones de audio (+tests)
  use-audio-engine.ts     Reloj unificado YouTube IFrame API / <audio>
  *-actions.ts            Server actions (re-validación en servidor)
  supabase(-server).ts    Clientes anon (público) y con sesión (cookies)
  site.ts                 URL pública (VERCEL_PROJECT_PRODUCTION_URL) para metadata y sitemap
src/proxy.ts              Refresco de sesión de Supabase + cookie del último instrumento
src/i18n/                 Configuración next-intl por cookie (sin rutas por idioma)
```

## 7. Dependencias

| Paquete | Versión | Propósito |
|---|---|---|
| `next` | 16.4.0 | Framework (App Router, Turbopack) |
| `react` / `react-dom` | 19.2.4 | UI |
| `@supabase/supabase-js` | ^2.110 | Cliente de datos/auth/storage |
| `@supabase/ssr` | ^0.12 | Sesión por cookies para App Router |
| `next-intl` | ^4.13 | i18n ES/EN |
| `next-themes` | ^0.4 | Tema claro/oscuro/sistema |
| `lucide-react` | ^1.23 | Íconos de línea (sin marcas: YouTube/Google son SVG inline) |
| `@tombatossals/chords-db` | ^0.5 | Fuente del catálogo (solo para el script de seed) |
| dev: `tailwindcss` ^4, `typescript` ^5, `eslint`+`eslint-config-next`, `prettier` ^3.9, `vitest` ^4.1 | | Estilos, tipos, calidad y tests |

Override en `package.json`: `postcss ^8.5.10` (parchea un aviso de seguridad del postcss anidado de Next). `npm audit --omit=dev`: 0 vulnerabilidades. En dev queda un aviso de `braces` (vía `eslint-config-next` → `fast-glob`) sin versión corregida publicada; solo afecta al lint.

## 8. Operación y decisiones conocidas

**Si la base de datos se pausa** (free tier, ~7 días sin actividad): la app muestra "La base de datos se encuentra inaccesible por inactividad…". Reactivar en el dashboard de Supabase → *Restore project* (~1 min, sin pérdida de datos). Con el cron de Vercel activo esto no debería ocurrir.

**Actualizar dependencias**: `npm outdated` → actualizar → `npm audit` → `npm run lint && npm test && npm run build`. Política del proyecto: última versión estable verificada en npm.

**Límites de los free tiers**: Supabase 500 MB de BD + 1 GB de Storage (~60 MP3 de 15 MB) + pausa por inactividad; Vercel Hobby: 1 cron diario, funciones con timeout estándar.

**Decisiones registradas**:
- *Navegación "instrumento primero"* (desviación consciente del handoff, solo en estructura; colores, tokens y componentes visuales se mantienen): `/` elige instrumento; cada instrumento tiene 4 secciones (Básicos · Acordes · Escalas · Canciones) en el header y en una barra inferior en móvil y tablet; una pastilla cambia de instrumento conservando la sección (dentro de una canción o una escala conserva la ruta y cambian los diagramas). Bajo se muestra atenuado como "Próximamente". Las URLs anteriores (`/guitar/strings`, `/guitar/notes`, `/playlists/...`) redirigen a las nuevas.
- *Piano y escalas sin BD*: los acordes de piano (voicing, inversiones, digitación) y todas las escalas (notas bien escritas, mástil, posiciones de 4 trastes, acordes de la escala) se calculan en `piano.ts` / `scales.ts`. El piano toma la identidad de los acordes (nombres, categoría, búsqueda) del catálogo de guitarra.
- *Canciones independientes del instrumento*: el ChordPro solo nombra acordes, así que la misma canción sirve en guitarra, ukelele y piano; el instrumento activo decide qué diagramas se muestran.
- *Instrumentos de la canción*: dato informativo ("Preparada para"), no filtra la lista; se copia al duplicar y una canción nueva nace marcada con el instrumento desde el que se creó. *Autodetectar tonalidad* puntúa las 24 tonalidades por encaje diatónico (menor con V mayor armónica) y desempata por la tónica (frecuencia, primer y último acorde); usa los acordes escritos, sin transponer por cejilla, y solo rellena el campo (guardar sigue siendo manual).
- *Orden de "Mis canciones"*: en el cliente sobre la lista ya cargada (Fecha, Nombre, Instrumento, Playlist; asc/desc) y recordado por navegador en localStorage (`yk-song-sort`). "Instrumento" pone primero las preparadas para el instrumento actual, luego las de otros y al final las sin definir; las canciones sin playlist van siempre al final. Con una playlist filtrada, "Playlist" se oculta y se ordena por nombre.
- *Lista plana de canciones*: las playlists son filtros opcionales; borrar una playlist conserva sus canciones. Las playlists mantienen género y doble calificación.
- *Canción*: Ver (con **Tocar** como acción principal) y Editar en dos pasos, **Letra → Audio** (la antigua "Calibración", ahora "Sincronizar audio"; `?mode=calibrate` sigue funcionando).
- *Sin pantalla de carga global* (rendimiento/Lighthouse): el título y el contenido se pintan en el primer render, sin el cambio desde "Afinando tu sesión…". Solo `[instrument]/songs` tiene `loading.tsx` (sesión + BD). Por eso las URLs inexistentes responden 404 real; bajo `/songs`, por el streaming, siguen respondiendo HTTP 200 con la UI correcta (404 visual / redirect a login). Los datos jamás se filtran (los guards corren antes de cualquier query).
- *Rendimiento del buscador*: la primera página de acordes se consulta en el servidor (catálogo público, anon key) y viaja en el HTML; supabase-js se carga de forma diferida (al buscar/paginar y tras hidratar el menú de cuenta, que lee la sesión con `onAuthStateChange` sin ir a la red). Las tarjetas no se prefetchean al entrar en pantalla (solo al pasar el ratón); los logos por tema no se precargan (solo baja el visible); JetBrains Mono no se precarga.
- *SEO*: el sitio es indexable; `robots.txt` excluye login, auth, api y playlists; el sitemap incluye básicos, buscador, escalas y detalle de acordes por instrumento (las canciones son de cada usuario). Medir Lighthouse en incógnito: la Vercel Toolbar (sesión de Vercel) inyecta un script que la CSP bloquea a propósito.
- *Pantalla de consentimiento de Google* muestra el dominio de Supabase: comportamiento estándar sin dominio propio; se aceptó (opción A) — cambiarlo requiere el add-on Custom Domain de Supabase + verificación de Google.
- *Búsqueda por voz* solo Chrome/Edge (Web Speech API); la UI lo indica y degrada a escritura.
- *Acordes con bajo alterado* excluidos del catálogo (48); re-incluibles editando `scripts/generate-chords-sql.mjs`.
- *Tabla `profiles` omitida*: nombre/avatar salen de la sesión de Google; idioma/tema se persisten en el navegador.
- *CSP*: `script-src` incluye `'unsafe-inline'` (requisito de hidratación de Next sin nonces) y `https://www.youtube.com` (IFrame API); `connect-src` limitado a Supabase; `frame-ancestors 'none'`. `Cross-Origin-Opener-Policy: same-origin` (el login de Google es por redirección, no popup).
- *Icono en la pantalla de inicio*: iOS no usa `icon.svg`; sin `apple-icon.png` (180×180, opaco y sin esquinas) genera una letra con el título. El manifest usa `display: "browser"`: en iOS una app standalone guarda cookies aparte y el login con Google por redirección perdería la sesión.
- *Contraste AA*: `--sub`, `--tert`, `--mute` y `--accent` (claro) y `--mute` (oscuro) se ajustaron respecto al handoff para alcanzar ≥ 4,5:1.
