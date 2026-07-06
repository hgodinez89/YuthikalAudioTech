# Plan por fases — Yuthikal AudioTech

App web responsive para guitarristas: referencia de acordes, canciones con letra + cifrado (ChordPro) y modo karaoke con audio real sincronizado. "Tu atril digital para guitarra".

## Principios de ingeniería (transversales)

1. **Sin sobreingeniería:** la solución más simple que cumpla el requisito. Sin abstracciones especulativas ni librerías donde baste la plataforma. Cada dependencia nueva debe justificarse.
2. **Código limpio y buenas prácticas:** TypeScript `strict`, ESLint + Prettier, componentes pequeños de una responsabilidad, nombres descriptivos, sin código muerto.
3. **Seguridad y mitigación de vulnerabilidades:**
   - RLS de Supabase como defensa principal: la privacidad se garantiza en la base de datos.
   - Nunca exponer la service-role key en el cliente; solo anon key + RLS.
   - XSS: el ChordPro del usuario se renderiza siempre como nodos de texto React, jamás `dangerouslySetInnerHTML`.
   - Validación de formularios en cliente y re-validación en servidor.
   - Subidas: validar MIME, extensión y tamaño del MP3; políticas de Storage por carpeta de usuario.
   - YouTube: validar dominio, extraer solo el video ID, embeber solo vía IFrame API oficial.
   - Cabeceras de seguridad (CSP, etc.); secretos solo en variables de entorno.
4. **Dependencias en su última versión estable** verificada en npm al instalar; lockfile versionado; `npm audit` en cada fase que agregue paquetes.
5. **Pruebas unitarias solo para lógica crítica y pura:** parser de búsqueda de acordes (ES/EN/voz), parser/render de ChordPro (`{key:}`, `{strum:}`), y cálculo de sincronización/interpolación del karaoke. Sin e2e en v1.

## Diseño: `design_handoff_yuthikal_audiotech/` es la fuente de verdad de UI

- Alta fidelidad: colores, tipografía, espaciado e interacciones son finales. Cada pantalla se recrea como componentes React idiomáticos (los `.dc.html` y `support.js` no se portan, solo se consultan).
- Los Design Tokens del README del handoff se trasladan una sola vez a Tailwind/CSS variables en la Fase 0.
- El diagrama de acordes SVG sigue la spec del handoff (`frets` 6ª→1ª con -1/0/n, cejilla `{fret, from, to}`, etiqueta "Nfr").
- Logos canónicos: `yuthikal-logo-crop.png` (tema oscuro) y `yuthikal-logo-claro.png` (tema claro), tomados del handoff.
- Iconos con `lucide-react` manteniendo el trazo de los prototipos.
- Una pantalla está "terminada" cuando es fiel al prototipo en ambos temas y ambos idiomas.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · next-themes · next-intl (default ES) · Supabase (Postgres, Google OAuth, Storage, RLS) · Vercel (hosting + cron) · `@tombatossals/chords-db` · `lucide-react` · Vitest (tests unitarios de lógica crítica).

## Modelo de datos

| Tabla | Contenido | Acceso |
|---|---|---|
| `profiles` | id (= auth.users), nombre, idioma y tema preferidos | Dueño |
| `chords` | nota raíz ES/EN, sufijo, categoría paraguas | Público lectura |
| `chord_positions` | chord_id, trastes, dedos, cejillas, capo, orden, popularity (reservado) | Público lectura |
| `playlists` | user_id, nombre, descripción, género (+ "otro"), rating_gusto 1–5, rating_dificultad 1–5 | RLS solo dueño |
| `songs` | playlist_id, nombre, descripción, tonalidad, ChordPro (con `{key:}` y `{strum:}` por sección) | RLS solo dueño |
| `song_audio` | song_id, tipo (youtube/archivo), url o ruta Storage | RLS solo dueño |
| `song_sync` | song_id, granularidad (línea/palabra), timestamps JSONB | RLS solo dueño |

Género: Rock, Pop, Balada, Bolero, Ranchera, Cumbia, Salsa, Reggae, Blues, Country, Cristiana, Otro (revela campo libre).

## Rutas

```
/                                Landing
/guitar                          Selección de instrumento
/guitar/strings                  Cuerdas
/guitar/notes                    Notas musicales
/guitar/chords                   Chord finder
/guitar/chords/[id]              Chord detail
/login                           Login con Google
/playlists                       Mis playlists (privado)
/playlists/[id]                  Detalle de playlist
/playlists/[id]/songs/[songId]   Canción — ?mode=view|edit|calibrate|karaoke
/api/keepalive                   Cron ping (previene pausa del free tier)
```

## Fases

### Fase 0 — Fundaciones
Next.js (TS estricto) + Tailwind con design tokens del handoff; ESLint/Prettier; deps última versión estable + `npm audit`; cabeceras de seguridad; Supabase + deploy Vercel; header compartido (logo por tema, pill ES/EN, toggle claro/oscuro/sistema); i18n default ES; Vercel Cron diario → `/api/keepalive`; pantallas Loading y Error DB ("La base de datos se encuentra inaccesible por inactividad, contacta al administrador"); logos del handoff integrados, duplicado `assets/yuthikal-logo.png` eliminado.
**Entregable:** sitio desplegado con sistema de diseño, seguridad base y estados globales.

### Fase 1 — Landing + instrumentos
Landing (hero 2 col, 4 features, banda karaoke, stats, footer) e Instruments (grid 2×2, Guitarra activa, resto "Próximamente").

### Fase 2 — Referencia musical
Guitar Strings (6 cuerdas, notación doble, nombres tradicionales) y Musical Notes (12 notas con enarmonías ES/EN).

### Fase 3 — Catálogo y buscador de acordes
Import de chords-db a Supabase (categorías: Mayores, Menores, Séptimas, Suspendidos, Disminuidos, Aumentados, Extendidos, Otros; nombres ES). Diagrama SVG. Chord Finder (oscuro/claro: búsqueda, mic con estados + nota Chrome/Edge, segmentado categoría/nota, contador "N de Y", headers sticky, scroll infinito, FAB) y Chord Detail (posiciones de más a menos común, badges cejilla). Tests: parser de búsqueda.

### Fase 4 — Autenticación + playlists
Google OAuth (única forma de registro); RLS verificada con pruebas de acceso cruzado. Login y Playlists (grid con doble rating, avatar, estado vacío, modal con género + "Otro"). Validación cliente + servidor.

### Fase 5 — Canciones + editor
Playlist Detail (filas con tonalidad, fuente, badge sync, acciones), Song View (acordes sobre la sílaba, chips de rasgueo, popover de diagrama, leyenda, FAB) y Song Editor (split ChordPro con highlight + preview; modo visual con picker; drawer metadatos; estado de guardado). Tests: parser/render ChordPro.

### Fase 6 — Audio + calibración
Calibration: tabs YouTube/Archivo, granularidad línea (default) o palabra, tap-zone + ESPACIO, corrección puntual de timestamps, transporte onda. Validación de URL/video ID y MIME/tamaño MP3.

### Fase 7 — Modo karaoke
Variante sincronizada (glow cian único de la app, barrido interpolado, Ahora/Sigue, transporte grande) y fallback sin calibración (velocidad de autoscroll + nota). Tests: sincronización/interpolación.

### Fase 8 — Pulido y cierre
Estados restantes; responsive móvil/tablet; accesibilidad básica; textos ES/EN. Pasada final de seguridad: `npm audit`, RLS y Storage, cabeceras, ningún secreto en cliente. **Entregable final: `IMPLEMENTATION.md`** (en español) con: (1) prerequisitos y cuentas (Vercel, Supabase, Google Cloud OAuth), (2) variables de entorno, (3) base de datos (esquema, migraciones, RLS, script de import), (4) ejecución local, (5) despliegue + cron, (6) estructura del proyecto, (7) dependencias con versión y propósito, (8) operación (BD pausada, actualización de deps, límites de free tiers).
