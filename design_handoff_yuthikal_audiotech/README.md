# Handoff: Yuthikal AudioTech — App web (guitarra)

## Overview
Yuthikal AudioTech es una app web responsive ("tu atril digital para guitarra") para aprender acordes, escribir canciones con letra + cifrado, y tocarlas en modo karaoke con audio real sincronizado. Este paquete contiene el set completo de pantallas de la sección de diseño: referencia de acordes, editor de canciones, calibración de audio, karaoke, playlists privados y estados de soporte (login, error, loading).

## About the Design Files
Los archivos `*.dc.html` de este bundle son **referencias de diseño creadas en HTML** — prototipos que muestran el look & feel y el comportamiento buscado, **no** código de producción para copiar tal cual. Cada archivo abre directo en el navegador y es autocontenido.

La tarea es **recrear estos diseños en el entorno del codebase destino** (React, Vue, SvelteKit, etc.) usando sus patrones y librerías establecidas. Si aún no existe un entorno, elige el framework más apropiado (se recomienda **React + TypeScript**, ya que los prototipos usan un runtime tipo React con clases de lógica) e impleméntalos ahí. No embarques el HTML directamente.

> Nota técnica sobre el formato: los prototipos están escritos como "Design Components" (`.dc.html`). Cada archivo tiene una **plantilla** (markup con estilos inline) y una **clase de lógica** `class Component extends DCLogic` (equivalente a un componente React de clase sin `render()`; `renderVals()` devuelve los datos/handlers que la plantilla consume). Los diagramas de acordes y las ondas animadas se construyen con `React.createElement` dentro de la lógica. Traduce esto a componentes funcionales/hooks idiomáticos del codebase destino.

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciado, radios, sombras e interacciones son finales. Recrear la UI de forma fiel a los pixeles usando las librerías del codebase. Todos los valores exactos están en la sección **Design Tokens**.

---

## Design Tokens

### Tema oscuro (modo por defecto)
| Rol | Valor |
|---|---|
| Fondo página | `#05070A` |
| Superficie / tarjeta | `#12151C` |
| Superficie 2 (inputs, chips) | `#0F131B` |
| Superficie 3 (barras, pills) | `#0C0F15` |
| Borde | `#1b2130` / `#12151C` (divisores) |
| Borde acentuado (hover, activo) | `#2a3346` |
| Texto principal (ink) | `#E7ECF3` |
| Texto secundario | `#9AA3B2` |
| Texto terciario / mute | `#7d8798` / `#5b6577` |
| Texto deshabilitado | `#3b4454` |

### Tema claro
| Rol | Valor |
|---|---|
| Fondo página | `#EDF1F7` (gris frío; **no** blanco puro) |
| Superficie / tarjeta | `#FFFFFF` |
| Borde | `#E2E8F0` (tarjetas `#E8EDF3`) |
| Texto principal (ink) | `#0F172A` |
| Texto secundario | `#64748B` |
| Texto terciario | `#94A3B8` |
| Divisor / grid diagramas | `#CBD5E1` |

### Acento de marca (ambos temas)
- **Gradiente primario (oscuro):** `linear-gradient(135deg, #2E6BF0, #35D6E8)` — azul → cian.
- **Gradiente primario (claro, oscurecido para contraste sobre blanco):** `linear-gradient(135deg, #2560D6, #0FA5BE)`.
- **Cian sólido (oscuro):** `#35D6E8` (eyebrows, iconos, puntos de acorde, glow).
- **Cian sólido (claro):** `#0C93AD` (texto/acento) · `#0B8BA3` (puntos de acorde en diagramas).
- **Texto sobre gradiente:** `#04121a` (casi negro) en oscuro; `#ffffff` en claro.
- **Aviso / warning:** `#d68a35` (bg `rgba(214,138,53,0.1)`, borde `rgba(214,138,53,0.3)`). En claro `#B7791F`.

### Tipografía
- Familia UI: **Inter** (400/500/600/700/800). `font-family: 'Inter', system-ui, sans-serif`.
- Monospace (editor ChordPro): **JetBrains Mono** (400/500/700).
- Escala típica: H1 26–52px / 800 / letter-spacing −0.02 a −0.03em; H2 18–34px / 700–800; eyebrow 11–12px / 700 / `text-transform: uppercase` / `letter-spacing: 0.14–0.24em`; cuerpo 14–18px; captions 11.5–13px.
- Números tabulares en timers: `font-variant-numeric: tabular-nums`.

### Radios
- Botón/campo: `10–14px` · Tarjeta: `16–22px` · Modal/drawer: `20–24px` · Pills/badges: `999px` · FAB: `50%`.

### Sombras
- Tarjeta (claro): `0 1px 2px rgba(15,23,42,0.04)`; hover `0 10px 26px rgba(15,165,190,0.14)`.
- Modal/popover: `0 24px 60px rgba(0,0,0,0.6)` (oscuro).
- FAB oscuro: `0 8px 24px rgba(46,107,240,0.4)`; FAB claro: `0 8px 24px rgba(15,165,190,0.35)`.
- Botón primario (landing): `0 8px 30px rgba(46,107,240,0.32)`.

### Espaciado
- Contenedores centrados con `max-width` según densidad: 860px (lectura/canción), 960–1120px (listas/grids), 1180–1240px (layouts anchos), 420–520px (auth/modales).
- Padding de página típico: `28–40px` horizontal, `28–90px` vertical. Gaps de grid: `12–22px`.

### Animaciones (keyframes reutilizables)
- `yk-bar` / `yk-eq`: barras de onda que escalan en Y (`scaleY(0.28→1)`), usadas en loaders y transporte. Duración ~1–1.1s, `ease-in-out`, `infinite`, con `animation-delay` escalonado.
- `yk-pulse-ring`: anillo que crece y se desvanece (`scale(0.9→2.1)`, opacity→0) tras el botón de micrófono al escuchar. 1.6s.
- `yk-flat-pulse`: opacidad 0.5↔1 en el "latido" de la ilustración de error. 2.2s.
- `yk-fade-up`: entrada (opacity 0→1, translateY 8px→0). 0.5s.
- Transiciones de hover en tarjetas: `border-color .15s, transform .15s` (+ `box-shadow` en claro); hover eleva `translateY(-2px a -4px)` y pinta borde cian.

---

## Motivo transversal: diagrama de acorde (SVG)
Componente reutilizado en casi todas las pantallas. Dibuja un mástil de guitarra:
- Entrada: array `frets` de 6 valores (cuerdas de 6ª→1ª, es decir Mi grave → Mi agudo). `-1` = cuerda muteada (marca "×" sobre el mástil), `0` = al aire (círculo "○" sobre el mástil), `n>0` = traste pisado (punto relleno cian).
- Cejilla (barre) opcional: `{ fret, from, to }` dibuja una cápsula cian sobre las cuerdas `from..to` en ese traste.
- Si el traste máximo > 4, la ventana se desplaza y se muestra etiqueta "Nfr" a la izquierda; si no, se dibuja la cejuela (nut) gruesa arriba.
- Tokens: cuerdas/trastes gris (`#39414f` oscuro / `#CBD5E1` claro), nut/marcas (`#5a6474`/`#8b93a3` oscuro; `#94A3B8`/`#64748B` claro), punto cian (`#35D6E8` oscuro / `#0B8BA3` claro).
- Geometría base: `padX 16, padTop 24, gap cuerdas 15, gap trastes 21, 4 trastes visibles`. Escalable vía `scale`.

Ejemplos de digitaciones (frets 6ª→1ª): C `[-1,3,2,0,1,0]`, G `[3,2,0,0,0,3]`, Em `[0,2,2,0,0,0]`, Am `[-1,0,2,2,1,0]`, D `[-1,-1,0,2,3,2]`, F `[1,3,3,2,1,1]` + barre `{fret:1,from:0,to:5}`, B7 `[-1,2,1,2,0,2]`.

---

## Screens / Views

Todas comparten: header sticky (logo Yuthikal a la izquierda, controles a la derecha: switcher **ES/EN** como pill segmentado y botón de **tema** sol/luna), fondo y tokens según tema. Logo: usar `yuthikal-logo-crop.png` en oscuro y `yuthikal-logo-claro.png` (wordmark tinta oscura, onda cian, fondo transparente) en claro.

### 1. Landing (`Landing.dc.html`)
- **Propósito:** entrada pública / marketing.
- **Layout:** header con nav (Instrumentos · Acordes · Mis Playlists) + CTA gradiente "Comenzar" (lleva a selección de instrumento). Hero en 2 columnas (1.05fr / 0.95fr): izquierda titular "Tu música, tus acordes, **tu escenario**" (última palabra en gradiente), subtexto, CTAs "Explorar acordes" (gradiente) y "Ver cómo funciona" (contorno); derecha una tarjeta chord-sheet con barra de progreso tipo onda. Debajo: 4 features (grid 4 col) con iconos de línea; banda de karaoke (2 col) con mockup en marco de dispositivo + stats (132 acordes / 2 idiomas / ∞ playlists); footer.
- **Badge "Tu atril digital para guitarra"** con punto cian glow. El texto del eyebrow es un **prop configurable** por instrumento (hoy fijo "guitarra").

### 2. Instrumentos (`Instruments.dc.html`)
- **Propósito:** elegir instrumento (primer paso del flujo).
- **Layout:** título centrado "Elige tu instrumento" + grid 2×2. Tarjeta **Guitarra** activa (ilustración de línea cian, hover eleva + borde cian, badge de flecha, enlace "Explorar" → Chord Finder). Piano, Ukelele, Bajo en estado deshabilitado gris con badge cian "Próximamente".

### 3. Cuerdas de la guitarra (`Guitar Strings.dc.html`)
- **Propósito:** referencia de las 6 cuerdas al aire.
- Notación doble ES/EN (Mi–La–Re–Sol–Si–Mi / E–A–D–G–B–e), diagrama del mástil y nombres tradicionales.

### 4. Notas musicales (`Musical Notes.dc.html`)
- **Propósito:** referencia pública de las 12 notas con notación doble (Do/C … Si/B, incluyendo sostenidos/bemoles enarmónicos "Do# / Reb").

### 5. Chord finder (`Chord Finder.dc.html` — oscuro · `Chord Finder Light.dc.html` — claro)
- **Propósito:** buscar acordes por texto o voz y ver su digitación.
- **Layout:** eyebrow "Referencia · Guitarra" + H1 "Buscador de acordes". Barra de búsqueda (input 54px alto, icono lupa, botón "×" para limpiar cuando hay query) + botón de **micrófono** (54×54, cian). Nota informativa "La búsqueda por voz requiere Chrome o Edge". Fila de control: segmentado **Por categoría / Por nota** (funcional) + contador "Mostrando N de 132 acordes". Resultados en grid (`minmax(150px,1fr)`) agrupados bajo encabezados sticky en mayúsculas espaciadas; cada tarjeta = diagrama SVG + nombre (ej. "Am") + nombre ES ("La menor") + badge "cejilla" si aplica.
- **Estados:** micrófono escuchando → botón gradiente con glow + anillo `yk-pulse-ring`; micrófono no soportado → deshabilitado + tooltip. Estado vacío "Sin resultados para …". Loader de scroll infinito al final (barras `yk-bar` animadas + "Cargando más acordes…").
- **Categorías:** Mayores, Menores, Séptimas, Suspendidos, Disminuidos, Aumentados, Extendidos, Otros. Agrupación por nota usa raíz C…B con etiquetas ES.
- **Botón flotante (FAB):** círculo gradiente fijo abajo-derecha (52px). Baja al fondo; al llegar, invierte la flecha y sube al inicio (scroll suave). Detecta posición vía `onScroll` (umbral 100px del fondo).

### 6. Chord detail (`Chord Detail.dc.html`)
- **Propósito:** todas las posiciones de un acorde en el mástil.
- **Layout:** cabecera con diagrama grande destacado (posición "más usada", escala 1.5) + nombre grande en doble notación ("A#7 / Sib7", con el sufijo 7 en cian) + chip de categoría ("Séptimas") + metadatos (notas, intervalos, nº de posiciones). Grid "Posiciones" (`minmax(168px,1fr)`) de más común a menos común, cada tarjeta numerada ("Posición N"), con nº de traste ("traste 6"), puntos cian, badge "cejilla" si usa barre. Back link al buscador.

### 7. Mis Playlists (`Playlists.dc.html`)
- **Propósito:** dashboard privado del usuario.
- **Layout:** header con avatar de Google (iniciales "MR") + menú desplegable (perfil / cerrar sesión). Título "Mis playlists" + contador + botón gradiente "Nuevo playlist". Grid de tarjetas (`minmax(300px,1fr)`): nombre, descripción, chip de género, doble rating de estrellas cian ("Me gusta" / "Dificultad", 5 estrellas), contador de canciones, botón eliminar (aparece al hover).
- **Estado vacío:** ilustración de línea (guitarra + onda) + "Aún no tienes playlists" + CTA.
- **Modal "Nuevo playlist"** (funcional): nombre, descripción (textarea), select de género (Rock, Pop, Balada, Bolero, Ranchera, Cumbia, Salsa, Reggae, Blues, Country, Cristiana, **Otro**) — elegir "Otro" **revela** un campo de texto libre; dos inputs de estrellas 1–5 (Me gusta / Dificultad). "Crear playlist" agrega la tarjeta al inicio.

### 8. Detalle de playlist (`Playlist Detail.dc.html`)
- **Propósito:** ver/gestionar las canciones de un playlist.
- **Layout:** cabecera (nombre, chip de género, descripción, ambos ratings de estrellas, botón "Editar"). Sección "Canciones" + botón "Nueva canción". Filas de canción: nombre, chip de tonalidad ("Tonalidad: Sol — G"), icono de fuente (logo YouTube o icono de archivo MP3), badge de estado (cian "Sincronizada" / gris "Sin calibrar"), y acciones: ver (→ Song View), editar, calibrar, **play-karaoke** (acción prominente en gradiente, → Karaoke). Estado vacío para playlist sin canciones.

### 9. Song view — chord sheet (`Song View.dc.html`)
- **Propósito:** leer una canción en formato cifrado clásico.
- **Layout:** header de canción (título "St. James Infirmary Blues", "Traditional", chip tonalidad "Mi menor — Em") + tabs de modo **Ver** (activo) / Editar / Calibrar / Karaoke. Cuerpo: la letra en tamaño cómodo (18px) con los **acordes en cian bold** en su propia línea exactamente sobre la sílaba del cambio; eyebrows de sección "VERSO 1", "CORO" con chip de "Rasgueo: ↓ – ↓ ↑ – ↑ ↓ ↑" al lado. Pie: "Acordes en esta canción" — fila de mini diagramas de cada acorde único (Em, Am, B7, C).
- **Interacción:** popover al hacer hover sobre un nombre de acorde en la letra → muestra su mini diagrama (posición fija, sigue al cursor sobre el acorde).
- **FAB** de scroll idéntico al del Chord Finder.

### 10. Song editor (`Song Editor.dc.html`)
- **Propósito:** editar la canción en dos modos.
- Header igual al Song View con tab "Editar" activo + sub-toggle **Editor de texto / Editor visual** + botón "Datos de la canción" (abre drawer lateral con nombre, descripción, tonalidad). Estado de guardado en el header ("Guardado" con check cian).
- **Modo texto:** split 2 columnas. Izquierda editor **ChordPro** monospace con resaltado de sintaxis (`[acordes]` en cian, `{directivas}` en azul `#5b8cff`, letra en gris claro). Derecha preview del chord sheet renderizado en vivo. Contenido de muestra incluye `{title}`, `{artist}`, `{key: Em}`, `{strum: D - D U - U D U}`, `{start_of_verse}` y acordes inline `I went [Em]down to the St. [Am]James In[Em]firmary`.
- **Modo visual:** la letra renderizada es editable; clic en una palabra abre un **popover selector de acordes** (buscador + lista con mini diagramas) que ancla el acorde sobre esa sílaba; los headers de sección tienen selector de patrón de rasgueo. Palabras con subrayado punteado al hover.

### 11. Audio & calibración (`Calibration.dc.html`)
- **Propósito:** sincronizar el audio con la letra.
- Header con tab "Calibrar" activo. Layout 2 col (340px / resto). Izquierda: **fuente de audio** con tabs "YouTube" (input URL + tarjeta de video conectado con thumbnail de onda, título y duración) / "Archivo" (dropzone MP3); y **granularidad** como radio cards ("Por línea (recomendado)" / "Por palabra/acorde (avanzado)"). Derecha: banner/tap-zone grande "Presiona **ESPACIO** o toca aquí cuando empiece esta línea"; chord sheet con la **línea objetivo** resaltada (borde izquierdo cian + texto más brillante + badge "Ahora"), líneas previas atenuadas con check + timestamp capturado ("0:12.4"), próximas neutrales. Barra de transporte fija abajo: play/pausa, tiempo, **barra de progreso tipo onda**, "Reiniciar calibración", y por línea un icono "re-marcar" para corregir un timestamp sin rehacer todo.
- **Interacción:** ESPACIO o clic en la tap-zone marca la línea actual (captura timestamp) y avanza a la siguiente línea de letra.

### 12. Karaoke (`Karaoke.dc.html`) — pantalla hero
- **Propósito:** reproducción a pantalla completa para tocar (uso en atril). Chrome mínimo, máxima letra.
- **Centro:** chord sheet con auto-scroll; la **línea actual** agrandada y brillante con sus acordes en **glow cian** (único efecto glow de la app); barrido de progreso dentro de la línea; líneas pasadas se atenúan hacia arriba, futuras se previsualizan abajo. Los cambios de sección muestran el nombre + chip de rasgueo. **Esquina superior:** acorde actual + siguiente como dos mini diagramas ("Ahora: Em / Sigue: Am"). **Transporte inferior** (targets grandes, alcanzables con el pulgar): play/pausa, reiniciar, saltar sección atrás/adelante, barra de progreso tipo onda con timestamps, salir.
- **Dos variantes:** (a) **sincronizada** (barra de progreso ligada al audio calibrado); (b) **fallback sin calibración** — mismo diseño pero con control de velocidad de auto-scroll (– / valor / +) en lugar de la barra sincronizada, y nota gris "Sin sincronización — scroll automático".

### 13. Login (`Login.dc.html`)
- Card centrada (max 420px) con logo Yuthikal, "Inicia sesión en Yuthikal AudioTech", subtexto, un único botón **"Continuar con Google"** (estilo oficial: fondo blanco, logo Google multicolor, texto oscuro), y nota con candado "El registro solo está disponible con Google". Glow radial azul detrás de la card.

### 14. Error — base de datos pausada (`Error DB.dc.html`)
- Página de error a pantalla completa: ilustración de **onda "flatline"** (línea plana con un latido cian animado `yk-flat-pulse`), badge ámbar "Servicio interrumpido", título "La base de datos está inaccesible por inactividad", texto "Contacta al administrador… Tus playlists y canciones están a salvo", botones "Reintentar" (gradiente) y "Contactar al administrador" (contorno).

### 15. Loading (`Loading.dc.html`)
- Estado de carga a pantalla completa reutilizando el motivo de onda: logo + **ecualizador animado** (44 barras que "respiran" desde el centro con envolvente senoidal, `yk-eq` con delay según distancia al centro) + eyebrow + mensaje. **Funciona en oscuro y claro** vía prop `theme` (`dark`/`light`); `eyebrow` y `message` también son props/editables. Entrada con `yk-fade-up`.

---

## Interactions & Behavior (resumen)
- **Navegación:** enlaces relativos entre pantallas (Instrumentos → Chord Finder; Playlist Detail → Song View / Karaoke; Song View ↔ Editor/Calibrar/Karaoke vía tabs). En la app real, mapear a rutas (ver rutas sugeridas abajo).
- **Búsqueda de acordes:** filtra el catálogo por nombre (EN o ES) o categoría, en vivo. Botón de voz es un placeholder de Web Speech API (solo Chrome/Edge).
- **FAB de scroll:** en Chord Finder (ambos temas) y Song View; alterna bajar/subir según posición del contenedor scrolleable.
- **Modal / drawer:** click fuera cierra; `stopPropagation` en el contenido. "Otro" en género revela input libre.
- **Calibración:** tecla ESPACIO (listener global) o tap marca la línea y avanza.
- **Karaoke:** auto-scroll + resaltado de línea; glow cian solo aquí.
- **Ratings de estrellas:** 1–5 clickeables, se rellenan en cian.

## State Management (por pantalla)
- **Chord Finder:** `query`, `grouping` ('cat'|'note'), `listening`, `micSupported`, `atBottom` (FAB).
- **Playlists:** lista de playlists, `menuOpen`, `modalOpen`, `form` (name, desc, genre, otro, like, diff), `nextId`.
- **Song Editor:** `mode` ('text'|'visual'), `metaOpen`, `picker` (palabra + posición), `pickerQuery`, `assigned` (acordes asignados por palabra), estado de guardado.
- **Calibration:** `source` ('youtube'|'file'), `gran` ('line'|'word'), `playing`, `current` (línea objetivo), `stamps` (timestamps por línea), `progress`.
- **Song View:** `popover` (acorde en hover), `atBottom`.
- **Loading:** props `theme`, `eyebrow`, `message`.
- **Karaoke:** línea actual, estado play/pausa, variante (synced|fallback), velocidad de scroll (fallback).

## Rutas sugeridas (del brief original)
```
/                         Landing
/guitar                   Instrumentos (elige instrumento)
/guitar/strings           Cuerdas
/guitar/notes             Notas musicales
/guitar/chords            Chord finder (público)
/guitar/chords/[id]       Chord detail (todas las posiciones)
/login                    Login con Google
/playlists                Mis Playlists (privado)
/playlists/[id]           Detalle de playlist
/playlists/[id]/songs/[songId]           Song view (mode: view)
   ?mode=edit | calibrate | karaoke        Editor / Calibración / Karaoke
```

## Design Tokens
Ver la sección **Design Tokens** arriba (colores oscuro + claro, gradientes, tipografía, radios, sombras, espaciado, keyframes).

## Assets
- `assets/yuthikal-logo-crop.png` — logo para **tema oscuro** (wordmark blanco, onda cian, sobre negro; se funde con el fondo oscuro).
- `assets/yuthikal-logo-claro.png` — logo para **tema claro** (wordmark en tinta oscura, onda cian, **fondo transparente**).
- `assets/yuthikal-logo.png` — original sin recortar (referencia).
- **Iconos:** todos son SVG inline estilo "línea" (Feather/Lucide-like), `stroke-width` 2–2.4, `stroke-linecap/linejoin: round`. Reemplazar por la librería de iconos del codebase (ej. `lucide-react`) manteniendo el mismo trazo.
- **Logo de Google:** SVG multicolor oficial inline en el botón de login.
- No se usan imágenes de terceros; las ilustraciones (guitarra, onda flatline) son SVG propios.

## Files
Prototipos incluidos en este bundle (raíz del proyecto):
- `Landing.dc.html`, `Instruments.dc.html`, `Guitar Strings.dc.html`, `Musical Notes.dc.html`
- `Chord Finder.dc.html` (oscuro), `Chord Finder Light.dc.html` (claro), `Chord Detail.dc.html`
- `Playlists.dc.html`, `Playlist Detail.dc.html`
- `Song View.dc.html`, `Song Editor.dc.html`, `Calibration.dc.html`, `Karaoke.dc.html`
- `Login.dc.html`, `Error DB.dc.html`, `Loading.dc.html`
- `support.js` — runtime de los Design Components (solo para abrir los prototipos en el navegador; **no** portar al codebase).
- `assets/` — logos.

Para abrir cualquier prototipo: servir la carpeta con un servidor estático (p. ej. `npx serve`) y abrir el `.dc.html` — cada archivo carga `support.js` y se renderiza solo.
