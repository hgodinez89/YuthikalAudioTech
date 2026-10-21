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
| `CRON_SECRET` | Secreto del cron de keepalive: Vercel lo envía como `Authorization: Bearer …` y `/api/keepalive` rechaza cualquier otra llamada (sin la variable responde 503). Solo servidor | Valor aleatorio propio (Vercel → Environment Variables) |

⚠️ **Nunca** usar la clave `service_role`/Secret en este proyecto: todo el acceso a datos pasa por la anon key + RLS. `.env*` está en `.gitignore`.

## 3. Base de datos

### 3.1 Esquema

| Tabla | Contenido | Acceso |
|---|---|---|
| `keepalive` | 1 fila; objetivo del ping del cron | Lectura pública |
| `chords` / `chord_positions` | Catálogo por instrumento (`chords.instrument`): guitarra 481 acordes / 1,924 posiciones, ukelele 552 / 2,114 (generado de `@tombatossals/chords-db`) | Lectura pública |
| `playlists` | Playlists del usuario (género, rating "Me gusta" 1–5) | RLS solo dueño |
| `custom_chords` | Acordes propios por usuario e instrumento: nombre (como en el cifrado, sin espacios, hasta 24), `base_fret` + `frets` (6 o 4 valores, −1 a 5) + `barres` (hasta 2), o `keys` (piano, 3 a 6 teclas); único por (usuario, instrumento, nombre) | RLS solo dueño |
| `songs` | Canciones: metadatos + contenido ChordPro (con directiva propia `{strum:}`); `playlist_id` opcional (lista plana); `instruments` (guitar/ukulele/piano, informativo); `playlist_position` (lugar en el setlist de su playlist; null = al final) | RLS solo dueño |
| `song_audio` | Fuente de audio por canción: YouTube (video id + título) o archivo (ruta en Storage) | RLS solo dueño |
| `song_sync` | Sincronización: granularidad (línea/palabra) + timestamps JSONB `[{i, t}]` + huella de la letra `targets` + fin opcional `end_at` | RLS solo dueño |

Storage: bucket privado **`audio`** (15 MB máx., solo `audio/mpeg`), políticas por carpeta `audio/<uid>/…`. **Subida de MP3 deshabilitada** ("Próximamente", ver §8): el bucket solo admite leer y borrar.

RLS: todas las políticas usan `(select auth.uid())` (se evalúa una vez por consulta). Insertar o actualizar audio y sincronización exige que la canción sea del usuario. Límites también en la BD: `stamps` es un arreglo de ≤ 10 000 marcas, `end_at` ≤ 24 h y `file_path` dentro de `<uid>/`.

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
10. `supabase/migrations/00000000000009_hardening.sql` (RLS con `(select auth.uid())`, audio/sincronización atados a canciones propias, límites en la BD, columna `song_sync.targets` y subida de MP3 bloqueada en Storage; ejecutar **antes** de desplegar el código que guarda `targets`)
11. `supabase/migrations/00000000000010_drop_unused.sql` (borra `chords.popularity`, `chord_positions.popularity` y `keepalive.last_seen_at`, sin uso; ejecutar **después** de desplegar el código que ya no las lee)
12. `supabase/migrations/00000000000011_list_perf.sql` (columna generada `song_sync.stamp_count` e índice trigram sobre `chords.search_text`; ejecutar **antes** de desplegar el código que lee `stamp_count`)
13. `supabase/migrations/00000000000012_setlist.sql` (`songs.playlist_position` y la función `reorder_playlist`, con permisos del usuario; ejecutar **antes** de desplegar el código del setlist)
14. `supabase/migrations/00000000000013_custom_chords.sql` (tabla `custom_chords`, la biblioteca personal de acordes, con RLS solo dueño; ejecutar **antes** de desplegar el código que la lee)

### 3.3 Seed del catálogo de acordes

```bash
node scripts/generate-chords-sql.mjs   # regenera supabase/seed_chords_{guitar,ukulele}.sql (~280/316 KB)
```

Luego pegar y ejecutar `supabase/seed_chords_guitar.sql` y `supabase/seed_chords_ukulele.sql` en el SQL Editor (después de las migraciones 1 y 5). Cada seed borra e inserta solo su instrumento, así que se pueden correr por separado. **En una BD existente** basta con ejecutar la migración 5 y luego `seed_chords_ukulele.sql` (las filas de guitarra quedan con `instrument = 'guitar'` por defecto). Los ids de guitarra no llevan prefijo (`a-minor`); los de ukelele sí (`ukulele-a-minor`); las URLs usan siempre el slug sin prefijo. Las raíces `Db`/`Gb` del ukelele se normalizan a `C#`/`F#`. El script excluye los acordes con bajo alterado ("/E", "m/B"…) por ser inversiones, no cualidades; calcula notas/intervalos desde los MIDI, asigna categorías paraguas y nombres en español.

## 4. Ejecución local

```bash
npm install          # instala dependencias (lockfile versionado)
npm run dev          # desarrollo en http://localhost:3000
npm test             # tests unitarios de lógica crítica (Vitest)
npm run lint         # ESLint (reglas React 19 estrictas)
npm run format       # Prettier sobre src/ y messages/
npm run build        # build de producción (incluye type-check)
npm run start        # sirve el build local
```

Tests cubren: parser de búsqueda de acordes ES/EN, parser/render ChordPro, edición visual por offsets, rasgueo, parser de URLs de YouTube y validación de timestamps.

## 5. Despliegue (Vercel)

1. Push a `main` → despliegue automático (proyecto importado desde GitHub, framework autodetectado).
2. Variables de entorno de la sección 2 configuradas en el proyecto.
3. **Cron keepalive**: `vercel.json` registra `GET /api/keepalive` diario (`0 8 * * *`); verificar en Settings → Cron Jobs. Esto evita la pausa por inactividad del free tier de Supabase. Requiere `CRON_SECRET` configurado (si falta, el endpoint responde 503 y la BD podría pausarse).
4. **Región de las funciones**: `vercel.json` fija `"regions": ["pdx1"]` (Portland), junto al proyecto de Supabase en `us-west-2` (Oregon). Cada render encadena varias idas a la BD; desde la región por defecto (`iad1`, Virginia) cada una cruzaba el país (~70 ms). Si el proyecto de Supabase cambia de región, cambiar esta también. Verificar en Deployments → Functions.
5. OAuth: la URL de producción debe estar en Google Cloud (JavaScript origins) y en Supabase (Site URL); `http://localhost:3000/**` como redirect adicional para desarrollo. Detalle en `SETUP.md` — Manual 3.

## 6. Estructura del proyecto

```
messages/                 Textos ES/EN (next-intl; ES por defecto). Al navegador solo viajan
                          los namespaces de cliente de cada sección (`src/i18n/client-messages.ts`)
public/brand/             Iconos del manifest (el logo es SVG en `components/brand-logo.tsx`)
scripts/                  generate-chords-sql.mjs (seeds del catálogo por instrumento)
supabase/migrations/      SQL de esquema + RLS (ver §3.2)
supabase/seed_chords_*.sql Datos del catálogo por instrumento (generados)
src/app/                  Rutas (App Router)
  api/keepalive/          Ping del cron
  auth/callback/          Canje del código OAuth (valida redirects internos)
  robots.ts / sitemap.ts  robots.txt y sitemap (secciones públicas en ambos idiomas, con hreflang)
  manifest.ts, apple-icon.png  Acceso directo en la pantalla de inicio (Android/iOS)
  layout.tsx, not-found   Raíz mínima (solo para la 404 de rutas sin idioma)
  [locale]/               es | en: layout raíz real (html lang, tema, header), 404, error y
                          catch-all [...rest] → 404 con el layout del idioma
  [locale]/page.tsx       Landing estática: elección de instrumento
  [locale]/[instrument]/  guitar | ukulele | piano (otro → 404); layout con barra inferior.
                          Cada sección (chords, scales, basics, songs) tiene un layout que
                          agrega sus textos de cliente
    chords/[id]           Buscador (1.ª página desde el servidor; selector nota + tipo)
                          y detalle por slug
    scales/[slug]         Escalas: selector nota + tipo, mástil/teclado, posiciones y
                          acordes de la escala (/scales → Do mayor)
    songs/[songId]        Mis canciones (lista plana, ?list= filtra por playlist) y
                          canción con ?mode=view|edit|karaoke y &step=lyrics|audio
                          (única ruta con loading.tsx)
    basics/               Cuerdas (o teclado en piano) + notas musicales
  [locale]/login/         Login con Google; ?next= (con idioma) regresa a la página de origen
src/components/           UI (fieles al handoff):
  chord-diagram           Diagrama SVG (spec del handoff; frets/barres/baseFret de chords-db)
  site-header             Logo, pastilla de instrumento, secciones y menú de cuenta
  instrument-nav          Barra inferior de secciones en móvil y tablet (< md)
  chord-visual            Diagrama de trastes o teclado mini según el instrumento
  piano-keyboard/-chord   Teclado SVG (nombres, dedos, sonido) e inversiones de piano
  fretboard               Mástil SVG (escalas: mástil completo y posiciones)
  scale-picker/-view      Selector de escalas (enlaces) y vista con Notas/Grados y Escuchar
  chord-finder/-card      Buscador con selector nota + tipo (una o varias), voz, scroll
                          infinito, FAB
  chord-sheet             Cifrado clásico: acordes sobre sílabas, popovers, leyenda. El renglón salta
                          entre palabras, no en los acordes: `wordGroups` (y `unitGroups` en el editor
                          visual) mantiene juntas las palabras con acorde en medio; el karaoke usa lo mismo
  modal / menu / button   Base del design system: `Modal` sobre `<dialog>` (velo,
                          Escape, foco atrapado y devuelto; centrado, drawer o anclado),
                          `Menu`/`MenuItem` (role="menu", flechas, Escape) y `Popover`
                          (paneles no modales), `Button`/`buttonClass` y `chipClass`
  concert-view            Modo concierto (`songs/concert?list=`): el setlist en una sola
                          pantalla con el modo libro; pasar de la última página va a la
                          canción siguiente (y de la primera a la anterior), índice para
                          saltar, F pantalla completa, Escape sale
  setlist-order           Ordenar el setlist: asa con puntero o ↑/↓ (teclado y lector)
  chord-builder           Constructor de un acorde propio: rejilla cuerdas × 5 trastes
                          (○/× sobre la cejuela), traste inicial y cejilla de cuerda a
                          cuerda; piano con el teclado; "Escuchar" con el sintetizador
  my-chords               "Mis acordes" (`songs/chords`): buscar, crear, editar, borrar
  song-chords-strip       Acordes de la canción en el editor ("Sin diagrama · Crear")
  tuner                   Afinador (Básicos → Afinador): vistas Clavijero y Aguja
  basics-tabs             Pestañas de Básicos (secciones y el afinador)
  songs-view              Lista plana de canciones con playlists como filtros; modales
                          `new-song-modal`, `move-song-modal`, `duplicate-song-modal`,
                          `playlist-form-modal` y menú ⋯ `song-menu`
  song-editor/-picker     Editor ChordPro (texto con highlight + visual por offsets).
                          Piezas: `chordpro-highlight`, `visual-editor`, `strum-builder`,
                          `paste-chords-modal` ("Pegar cifrado"), `song-meta-drawer`
                          (datos de la canción). Borrar la canción vuelve a la
                          lista con el aviso «Deshacer» (`lib/use-delete-song.ts`).
                          Lado a lado (lg+), el botón entre paneles vincula el scroll
                          de ChordPro y vista previa (por defecto sí, recordado en
                          localStorage): cada sección es un ancla (`startLine` en el
                          texto, `[data-section]` en la vista previa) y entre anclas
                          se interpola (`lib/use-linked-scroll.ts`, `lib/scroll-sync.ts`)
  audio-source-panel      Fuente de audio de Sincronizar (YouTube; MP3 en "Próximamente")
  song-calibration        Fuente de audio, granularidad, marcado con ESPACIO, transporte. Al retomar a medias, el audio arranca (pausado) en el inicio de la última línea marcada; las marcas pendientes se guardan al salir. Con todas las líneas marcadas, ESPACIO marca un fin opcional; la X lo descarta y el audio suena completo. "Sin fin" no se guarda: al volver a entrar sin fin marcado, la sincronización se muestra completa (la bandera permite agregar uno después). En modo palabra, los trozos que separa un acorde (`Re[D]demp[G]tion`) se muestran pegados según `spaceAfter`, aunque cada uno sea su propia marca
  song-karaoke            Pantalla hero: sigue el audio si hay sincronización; si no, autoscroll. Con audio, la intro queda fuera: play, "Al inicio" y los saltos empiezan 3 s antes de la primera línea sincronizada, y la barra cuenta 0:00 desde ahí. Con fin marcado, la barra termina en él y el audio se apaga con un fundido de 2 s y se pausa. **Repetir** (o la tecla B) repite la sección actual o dos líneas elegidas (A y B); al llegar a B vuelve a A con 1 s de pre-roll. **Cuenta regresiva** (No / 3 s / 5 s, recordada): al dar play desde pausa, en "Al inicio" si estaba sonando y en cada vuelta del bucle
  confirm-dialog          Confirmación destructiva estándar (no hay diálogos nativos)
  toast                   Avisos de la sección de canciones (en su layout) con «Deshacer»
                          y acciones diferidas (`defer`)
  error-screen            Pantalla de error: `db` (la base no respondió) o `generic`
  fade-row                Fila de chips con scroll horizontal y borde difuminado
  skip-link               «Saltar al contenido» (primer Tab, hacia `#main`)
  instrument-toggles      Instrumentos de una canción: selector múltiple e iconos
src/lib/                  Lógica y acceso a datos:
  chordpro.ts             Parser/edición ChordPro (+tests)
  chord-search.ts         Parser de búsqueda ES/EN, slugs y selector rápido (+tests)
  chord-query.ts          Página del buscador de acordes (servidor y cliente)
  db-error.ts             Error de consulta con digest de "base inaccesible" (+tests)
  loop.ts                 Repetir A–B: líneas de la sección y rango de tiempo del bucle (+tests)
  custom-chords.ts        Acordes propios: validación compartida cliente/servidor (+tests)
  custom-chord-actions.ts Server actions de "Mis acordes" (crear/editar/borrar, re-validan)
  pitch.ts                Detección de tono (YIN), nota ↔ frecuencia, cuerda más cercana (+tests)
  tunings.ts              Afinaciones del afinador y ajuste ♭/♯
  use-pitch.ts            Micrófono → tono (solo con el botón; se apaga al salir u ocultar)
  motion.ts               Scroll suave salvo movimiento reducido
  use-delete-song.ts      Borrar canción con «Deshacer» (acción diferida del aviso)
  chord-import.ts         Cifrado "acordes encima de la letra" → ChordPro (+tests)
  instruments.ts          Instrumentos activos/próximos, afinaciones, ids y rutas (+tests)
  piano.ts                Acordes de piano calculados: voicings, inversiones, dedos (+tests)
  scales.ts               Escalas calculadas: ortografía, mástil, posiciones, acordes (+tests)
  key-detect.ts           Tonalidad probable a partir de los acordes del cifrado (+tests)
  chord-data.ts           Diagramas de acordes por nombre (canción, escala) según instrumento
  use-piano-synth.ts      Sintetizador Web Audio (piano, escalas)
  youtube.ts / audio.ts   Validaciones de audio (+tests)
  use-audio-engine.ts     Reloj unificado YouTube IFrame API / <audio>
  use-autosave.ts         Autoguardado (debounce, en fila, al salir, aviso al cerrar, reintentar)
  sync-lines.ts           Filas de Sincronizar y líneas del karaoke desde `syncPlan` (+tests)
  use-signed-audio-url.ts URL firmada del MP3, renovada antes de vencer (el motor la cambia en caliente)
  use-section-title.ts    Título traducido de una sección (`sectionTitle` en chordpro.ts)
  use-at-bottom.ts        Fin de la página por IntersectionObserver (FAB ir arriba/abajo)
  use-stored-flag.ts      Preferencias del dispositivo: `useStoredValue`/`useStoredFlag`
  ids.ts                  `isUuid` para ids de URL y server actions (+tests)
  *-actions.ts            Server actions (re-validación en servidor)
  supabase(-server).ts    Clientes anon (público) y con sesión (cookies)
  site.ts                 URL pública (VERCEL_PROJECT_PRODUCTION_URL) para metadata y sitemap
src/proxy.ts              Rutas sin idioma → /es o /en (cookie `yk-locale`); "/" → último
                          instrumento; sesión de Supabase (getClaims) solo en canciones y login;
                          recuerda idioma e instrumento
src/i18n/                 next-intl con el idioma en la URL: `routing.ts`, `navigation.ts`
                          (Link/useRouter/usePathname/redirect con idioma), `request.ts`
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

**Límites de los free tiers**: Supabase 500 MB de BD + 1 GB de Storage (~60 MP3 de 15 MB) + 5 GB/mes de transferencia + pausa por inactividad; Vercel Hobby: 1 cron diario, funciones con timeout estándar.

**MP3 en "Próximamente"**: es lo que más consume del plan gratuito (almacenamiento y transferencia), así que la subida está deshabilitada para todos: `MP3_ENABLED = false` en `src/lib/audio.ts` (UI y server action) y sin políticas de insert/update en el bucket `audio` (migración 9). Las canciones que ya tienen MP3 siguen sonando; pasar a YouTube o borrar la canción elimina el archivo. Para reactivarlo (idealmente junto con cuotas por usuario): poner `MP3_ENABLED = true` y ejecutar:

```sql
create policy "audio_insert_own" on storage.objects
  for insert with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "audio_update_own" on storage.objects
  for update using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

**MP3 huérfanos** (archivos sin canción, de antes de que borrar los eliminara): listarlos en el SQL Editor y borrarlos desde **Storage → audio** en el dashboard (no con `delete` sobre `storage.objects`):

```sql
select o.name, o.created_at
from storage.objects o
where o.bucket_id = 'audio'
  and not exists (select 1 from public.song_audio a where a.file_path = o.name);
```

**Decisiones registradas**:
- *Navegación "instrumento primero"* (desviación consciente del handoff, solo en estructura; colores, tokens y componentes visuales se mantienen): `/` elige instrumento; cada instrumento tiene 4 secciones (Básicos · Acordes · Escalas · Canciones) en el header y en una barra inferior en móvil y tablet; una pastilla cambia de instrumento conservando la sección (dentro de una canción o una escala conserva la ruta y cambian los diagramas). Bajo se muestra atenuado como "Próximamente". Las URLs anteriores (`/guitar/strings`, `/guitar/notes`, `/playlists/...`) redirigen a las nuevas.
- *Piano y escalas sin BD*: los acordes de piano (voicing, inversiones, digitación) y todas las escalas (notas bien escritas, mástil, posiciones de 4 trastes, acordes de la escala) se calculan en `piano.ts` / `scales.ts`. El piano toma la identidad de los acordes (nombres, categoría, búsqueda) del catálogo de guitarra.
- *Canciones independientes del instrumento*: el ChordPro solo nombra acordes, así que la misma canción sirve en guitarra, ukelele y piano; el instrumento activo decide qué diagramas se muestran.
- *Instrumentos de la canción*: dato informativo ("Preparada para"), no filtra la lista; se copia al duplicar y una canción nueva nace marcada con el instrumento desde el que se creó. *Autodetectar tonalidad* puntúa las 24 tonalidades por encaje diatónico (menor con V mayor armónica) y desempata por la tónica (frecuencia, primer y último acorde); usa los acordes escritos, sin transponer por cejilla, y solo rellena el campo (guardar sigue siendo manual).
- *Orden de "Mis canciones"*: en el cliente sobre la lista ya cargada (Fecha, Nombre, Instrumento, Playlist; asc/desc) y recordado por navegador en localStorage (`yk-song-sort`). "Instrumento" pone primero las preparadas para el instrumento actual, luego las de otros y al final las sin definir; las canciones sin playlist van siempre al final. Con una playlist filtrada, "Playlist" se oculta y se ordena por nombre.
- *Lista plana de canciones*: las playlists son filtros opcionales; borrar una playlist conserva sus canciones. Las playlists mantienen género y doble calificación.
- *Canción*: Ver (con **Tocar** como acción principal) y Editar en dos pasos, **Letra → Audio** (la antigua "Calibración", ahora "Sincronizar audio"; `?mode=calibrate` sigue funcionando).
- *Sin pantalla de carga global* (rendimiento/Lighthouse): el título y el contenido se pintan en el primer render, sin el cambio desde "Afinando tu sesión…". Solo `[locale]/[instrument]/songs` tiene `loading.tsx` (sesión + BD). Por eso las URLs inexistentes responden 404 real; bajo `/songs`, por el streaming, siguen respondiendo HTTP 200 con la UI correcta (404 visual / redirect a login). Los datos jamás se filtran (los guards corren antes de cualquier query).
- *Autoguardado* (`lib/use-autosave.ts`, editor y sincronización): debounce, guardados en fila (uno lento nunca pisa a uno más nuevo), lo pendiente se guarda al salir de la pantalla, el navegador avisa al cerrar o recargar con cambios sin guardar y un fallo de red o BD queda en error con **Reintentar**. El editor muestra un contador al acercarse a los 20 000 caracteres. Las server actions de actualizar/borrar confirman que se modificó una fila (si no, error `missing`) y los diálogos de borrar muestran el error sin cerrarse.
- *Componentes base* (`modal`, `menu`, `button`): todos los modales usan `<dialog>` con `showModal()` (el resto de la página queda inerte, Escape y clic fuera cierran, el foco inicial va a `data-autofocus` y vuelve a quien abrió el modal); los menús de acciones (canción, instrumento, velocidad) son `role="menu"` con flechas, Inicio/Fin y Escape; los paneles con controles (cuenta, atajos) son `Popover`. Botones y chips comparten radio y relleno por tamaño (`buttonClass`, `chipClass`).
- *MP3 en reproducción*: la URL firmada dura 1 h y se renueva 5 min antes; el motor de audio identifica el MP3 por su ruta y cambia la URL sin cortar (conserva posición, velocidad y estado). Si no se puede obtener, Sincronizar y el karaoke lo avisan.
- *Huella de la sincronización*: al guardar, `saveSync` lee la letra de la BD, valida las marcas contra sus objetivos reales (`syncTargets`, mismo orden que `syncPlan`) y guarda el texto de cada objetivo en `song_sync.targets`. Si la letra cambia después, la página reubica las marcas (`reconcileSync`): con la misma cantidad de objetivos (una errata) todo sigue igual; si se agregaron o quitaron, se conservan las del tramo común del inicio y del final y lo del medio queda por marcar, con aviso en karaoke y en Sincronizar. La reubicación no se persiste hasta que se vuelve a guardar la sincronización. Al marcar, el cursor salta al siguiente objetivo libre (re-marcar o completar huecos no pisa lo marcado). Conectar otro audio borra la sincronización anterior (con confirmación si tenía marcas) y el MP3 previo.
- *Selector rápido del buscador*: con **una opción** (por defecto) los botones escriben la búsqueda ("Dom7") y su estado se deriva del texto. Con **Selección múltiple** (interruptor recordado por navegador en localStorage, `yk-finder-multi`) los botones tienen estado propio: varias notas y varios tipos, que se suman dentro de cada fila y se combinan entre filas ((Do o Re) y (m o m7)); la fila de tipos se muestra siempre y un resumen lista lo elegido con "Limpiar". La selección y la búsqueda escrita/dictada se reemplazan entre sí, para que nunca se contradigan. Al activar, lo elegido pasa a la selección; al desactivar se limpia. `fetchChords` solo acepta valores de las listas del selector (`DB_KEYS`, `QUICK_TYPES`).
- *Idioma en la URL* (`/es`, `/en`): next-intl con `localePrefix: "always"` y sin detección automática; el proxy decide a qué idioma ir desde rutas sin prefijo (cookie `yk-locale`, si no español) y guarda la cookie al visitar un idioma. El selector ES/EN navega a la misma página (con su búsqueda). Cada layout y página llama `setRequestLocale` (requisito para generarlas estáticas) y los proveedores de textos reciben el idioma explícito: en rutas dinámicas con `loading.tsx` (canciones) el de `setRequestLocale` no llega a todos los componentes, por eso la página usa `getTranslations({ locale })` y el 404, la pantalla de carga y los iconos de instrumentos son de cliente.
- *Catálogo estático*: landing, básicos y buscador se generan en el build para cada idioma e instrumento; el detalle de acorde y las escalas se generan en su primera visita y quedan en caché (`generateStaticParams` vacío). No leen cookies ni sesión (catálogo con la anon key). Solo canciones y login son dinámicos.
- *Rendimiento*: el proxy no consulta Supabase Auth en páginas públicas; la canción pide canción, audio, sincronización y playlists en paralelo; la lista trae `stamp_count` en lugar de las marcas; los 4 modos de la canción se cargan aparte (`components/song-modes.tsx`, `next/dynamic` desde un módulo de cliente); supabase-js se descarga solo al usarlo (login, selector de acordes, URL firmada del MP3); el karaoke y Sincronizar memorizan cada línea (el reloj del audio solo redibuja la actual) y el motor de audio devuelve acciones estables; la vista previa del editor usa `useDeferredValue`; Tailwind solo escanea `src/`.
- *Rendimiento del buscador*: la primera página de acordes se consulta en el servidor (catálogo público, anon key) y viaja en el HTML; supabase-js se carga de forma diferida (al buscar/paginar y tras hidratar el menú de cuenta, que lee la sesión con `onAuthStateChange` sin ir a la red). Las tarjetas no se prefetchean al entrar en pantalla (solo al pasar el ratón); los logos por tema no se precargan (solo baja el visible); JetBrains Mono no se precarga.
- *SEO*: el sitio es indexable; cada página pública declara canónica y alternativas por idioma (`localeAlternates` en `lib/site.ts`, con `x-default` en español); `robots.txt` excluye login, canciones, auth y api (además llevan `noindex`); el sitemap lista cada página en ambos idiomas con sus `hreflang` (básicos, buscador, escalas y detalle de acordes por instrumento; las canciones son de cada usuario). Medir Lighthouse en incógnito: la Vercel Toolbar (sesión de Vercel) inyecta un script que la CSP bloquea a propósito.
- *Pantalla de consentimiento de Google* muestra el dominio de Supabase: comportamiento estándar sin dominio propio; se aceptó (opción A) — cambiarlo requiere el add-on Custom Domain de Supabase + verificación de Google.
- *Búsqueda por voz* solo Chrome/Edge (Web Speech API); la UI lo indica y degrada a escritura.
- *Acordes con bajo alterado* excluidos del catálogo (48); re-incluibles editando `scripts/generate-chords-sql.mjs`.
- *Tabla `profiles` omitida*: nombre/avatar salen de la sesión de Google; idioma/tema se persisten en el navegador.
- *CSP*: `script-src` incluye `'unsafe-inline'` (requisito de hidratación de Next sin nonces) y `https://www.youtube.com` (IFrame API); `connect-src` limitado a Supabase; `frame-ancestors 'none'`. `Cross-Origin-Opener-Policy: same-origin` (el login de Google es por redirección, no popup).
- *Icono en la pantalla de inicio*: iOS no usa `icon.svg`; sin `apple-icon.png` (180×180, opaco y sin esquinas) genera una letra con el título. El manifest usa `display: "browser"`: en iOS una app standalone guarda cookies aparte y el login con Google por redirección perdería la sesión.
- *Contraste AA*: `--sub`, `--tert`, `--mute`, `--accent` y `--warn` (claro) y `--mute` (oscuro) se ajustaron respecto al handoff para alcanzar ≥ 4,5:1; en claro `--tert` y `--mute` son distintos.
- *Tokens de efectos*: brillos, sombras y foco tienen variante clara y oscura en `globals.css` (`--glow`, `--chord-glow`, `--focus-ring`, `--pop-shadow`, `--card-shadow`, `--lift-shadow`, `--fab-shadow`, `--raised`, `--directive`) y se usan como utilidades (`shadow-pop`, `shadow-card`, `shadow-lift`, `shadow-fab`, `shadow-glow`, `shadow-focus`, `text-directive`) o clases (`yk-raised`, `yk-halo`, `yk-gradient-soft`, `yk-stage`). El mástil de Básicos y el de Escalas usan `--neck-*`, `--board-*`, `--stage` y `--stage-inset`: en claro, tarjeta blanca con diapasón gris muy claro y cuerdas gris oscuro; en oscuro, la vitrina original. En los componentes no quedan colores escritos a mano, salvo las teclas de piano (blancas y negras reales; la octava de «Notas» va en una tarjeta del tema), las tarjetas de notas alteradas (gris pizarra en claro y negras en oscuro, con `--altered-*`, definidas solo en `<html>` porque la tarjeta lleva `.dark`), los colores de dedos del piano y el botón de Google (colores de su marca).
- *Karaoke siempre oscuro*: es la "pantalla hero" del diseño (único brillo cian de la app) y se lee mejor de lejos; la clase `.dark` en su raíz le aplica los tokens oscuros aunque el sitio esté en claro, sin botón para cambiarlo. Sincronizar sigue el tema del sitio.
- *Setlist y modo concierto*: cada canción sigue en una sola playlist; `playlist_position` da su orden (sin posición, al final por fecha; mover a otra playlist la deja sin posición). Con una playlist filtrada, la lista se ordena por "Setlist" por defecto (preferencia aparte de la de "Todas") y "Ordenar" guarda el orden con una sola llamada (`reorder_playlist`, `security invoker`: RLS limita el update a las canciones del usuario). El concierto es una sola pantalla con todo el setlist y los diagramas de todos sus acordes de una consulta, para que la pantalla completa y la pantalla siempre encendida no se corten entre canciones; con pedal Bluetooth (flechas o Av Pág/Re Pág) se pasa de página y de canción. En celular (sin modo libro) es continuo, con "Canción siguiente" al pie.
- *Repetir A–B y cuenta regresiva* (karaoke): con audio el rango sale de las marcas (de la primera de A hasta donde empieza la línea siguiente a B, o el fin); sin audio, de los tiempos del autoscroll; se combina con las velocidades lentas. Solo vuelve a A al cruzar B (saltar más allá a propósito no lo devuelve). La cuenta regresiva se ve como un número grande en degradado sobre la letra atenuada y se cancela tocando play.
- *Biblioteca personal de acordes*: privada (RLS), por instrumento. Al mostrar una canción (ver, karaoke, editor, concierto) `loadChordData` usa primero tus acordes y después el catálogo; un acorde con bajo que no está definido ("C/E") toma el diagrama del base y anota "bajo Mi". En la leyenda y el popover, los propios dicen "Mío". En el editor, los acordes de la letra sin diagrama dicen "Sin diagrama · Crear" (los que se agregan mientras se escribe solo se marcan si no son un nombre del catálogo) y el selector del editor visual tiene el grupo "Mis acordes". Se administran en `/[locale]/[instrument]/songs/chords` (borrar con «Deshacer»); el buscador público no cambia y sigue estático.
- *Afinador*: pestaña de Básicos con URL propia (`basics/tuner`, estática; en piano, 404). El micrófono solo se abre con "Activar micrófono" (gesto, requisito de iOS), sin cancelación de eco ni supresión de ruido, y se apaga al ocultar la pestaña o salir; nada se graba. YIN sobre bloques de 4096 muestras cada 50 ms, mediana de 300 ms y silencio tras 500 ms; la UI se actualiza ~12 veces por segundo y el trazo del historial se dibuja en un canvas en cada lectura (sin re-render). Afinada = ±5 cents durante medio segundo (✓ y brillo breve). Tocar la nota objetivo hace sonar la cuerda y el micrófono descansa mientras tanto. Afinaciones: guitarra Estándar, Drop D, Medio tono abajo, Open G, DADGAD; ukelele Estándar, Low G, Re (ADF#B); ♭/♯ mueven toda la afinación hasta 3 semitonos. Afinación, ajuste, AUTO y vista se recuerdan en el dispositivo. Un aviso hablado cada ~1,5 s ("Mi2, 12 cents alto, afloja") acompaña a los lectores de pantalla.
- *Deshacer en vez de confirmar*: borrar una canción no pide confirmación; desaparece al instante y el borrado real ocurre a los 6 s (o al cerrar el aviso, o al salir de la sección de canciones). Si se cierra la pestaña antes, la canción **no** se borra (el lado seguro). Mover a otra playlist también se deshace. Borrar una playlist sí se confirma (conserva sus canciones).
- *Errores*: un fallo puntual del buscador o del selector de acordes se muestra en su lugar con «Reintentar» (el selector dice «Cargando» mientras busca). En el servidor, las consultas que fallan lanzan `dbError` (`lib/db-error.ts`): si la base no respondió (sin código de PostgREST, PGRST000–003 o caída del gateway) el error lleva un digest `db-unavailable-…` y la página explica que la base está inaccesible; cualquier otro fallo muestra un error genérico. Una canción o acorde que no existe es 404, pero un fallo de la base no (en el catálogo, un 404 quedaría en caché). `[locale]/error.tsx` usa `retry()` (vuelve a pedir los datos); canciones tiene su propio `error.tsx` (conserva la barra del instrumento) y `global-error.tsx` cubre fallos del layout del idioma (descarga sus textos solo si se muestra). Si falla el canje del código de Google, el login lo indica (`?error`).
- *Accesibilidad*: un solo `<main id="main">` por pantalla (la portada deja su pie fuera) con «Saltar al contenido»; anillo `:focus-visible` global y halo en los campos; bloque `prefers-reduced-motion` y `smoothBehavior()` (`lib/motion.ts`) para el scroll suave en JS; áreas táctiles de 44 px en pantallas táctiles sin agrandar el diseño (`.yk-hit` / `.yk-hit-y`); segmentados con `aria-pressed` o `radio`; la onda de progreso es un `slider` (flechas ±5 s, Re Pág/Av Pág ±10 s, Inicio, Fin); el video flotante cerrado queda `inert`; estrellas con texto equivalente (y como radios al calificar); los acordes con diagrama son botones (el popover abre al pasar el mouse, con el foco o al tocar, cierra con Escape o al tocar afuera y no se sale de la pantalla). En karaoke, Escape sale y hay una sola salida; los atajos están en el reproductor también en tablet y celular.
