# Yuthikal AudioTech — Design Brief for AI Design Tools

> **How to use this document:** Paste the **Master Context** block into Google Stitch / Claude Design first (or include it at the top of every prompt). Then generate one screen at a time using the **Screen Prompts** below — each one is self-contained. Generate the dark theme first (it is the primary theme), then ask the tool for the light variant.
>
> **Logo asset:** `assets/yuthikal-logo.png` (repo) — upload it to the design tool when it supports image references so the generated screens use the real brand mark.

---

## 1. Master Context (include in every prompt)

```
APP: Yuthikal AudioTech — a web app for guitarists to learn chords and play
songs in karaoke mode with real audio synchronization.

AUDIENCE: A guitarist (hobbyist/intermediate) who uses the app as a digital
music stand: browsing chords, writing songs with lyrics + chords, and playing
them back karaoke-style while singing and playing guitar.

PLATFORM: Responsive web app (Next.js + Tailwind CSS). Mobile-first is
critical — the app will often sit on a phone/tablet on a music stand while
the user plays. Desktop layout should use the extra width for side-by-side
panels (e.g., editor + preview).

LANGUAGE: UI copy is bilingual Spanish/English with Spanish as default.
Use Spanish labels in the mockups (examples provided per screen). Include a
language switcher (ES/EN) and a theme toggle (light/dark/system) in the header.

BRAND / LOGO: The logo is an audio waveform inside a rounded rectangle with
a gradient from electric blue to cyan, above the wordmark "YUTHIKAL" in
white (wide letter-spacing, geometric sans) and "AUDIOTECH" in cyan. It
lives on a black background. The waveform is the brand motif — reuse it
subtly (hero visuals, loaders, progress bars, section dividers).

VISUAL IDENTITY:
- Dark-first design. The primary theme is dark: the logo is born on black,
  and guitarists use the app in dimly lit rooms and on stage. Light theme
  is the secondary variant.
- Background: near-black (#05070A range), matching the logo. Surfaces/cards
  slightly lighter with a cool tint (#12151C range), soft 12–16px radius.
- Primary accent: the brand gradient — electric blue (#2E6BF0 range) to
  cyan (#35D6E8 range). Used for CTAs, active states, highlighted chords,
  progress/waveform elements. For small elements (icons, text links, star
  ratings, focus states) use flat cyan (#35D6E8) instead of the gradient.
- Neutrals: white and cool greys for text; avoid warm tones entirely.
- Typography: modern geometric sans (Inter or similar) for UI; uppercase
  with wide letter-spacing for section eyebrows/labels, echoing the
  wordmark. A monospace font (JetBrains Mono or similar) ONLY inside the
  ChordPro text editor. Chord names always render bold.
- Iconography: clean line icons (Lucide style). Music/audio icons welcome
  (guitar, waveform, music note, mic, play) but never clip-art.
- Mood: sleek, precise, focused — a modern recording studio at night.
  Premium audio-tech, NOT corporate, NOT neon-gamer RGB, NOT childish.
  Use glow effects sparingly (only the karaoke current line and the active
  mic state).

KEY UI OBJECTS (reused across screens):
- CHORD DIAGRAM CARD: a card showing a guitar chord diagram (vertical
  fretboard grid, dots for fingers, "x"/"o" markers above the nut for
  muted/open strings, optional barre bar), with the chord name below in two
  notations, e.g. "Am — La menor". Diagrams are monochrome line art that
  adapts to the theme, with cyan finger dots.
- CHORD SHEET: song lyrics with bold chord names on their own line directly
  above the exact syllable where the chord changes (classic chords-over-
  lyrics format). Section labels (Verso, Coro) as small uppercase
  wide-tracked eyebrows. A strumming-pattern chip may appear next to a
  section label, e.g. "↓ – ↓ ↑ – ↑ ↓ ↑".
- RATING STARS: 1–5 cyan stars, two rows when both ratings are shown
  ("Me gusta" and "Dificultad").
```

---

## 2. App Map (for flow-capable tools)

```
Landing (public)
 └─ Instruments (guitar active, others "coming soon")
     ├─ Guitar strings (public reference)
     ├─ Musical notes (public reference)
     └─ Chord finder (public, voice + text search)
         └─ Chord detail (all positions)
 └─ Login with Google
     └─ My Playlists (private)
         └─ Playlist detail
             └─ Song — modes: View / Edit / Calibrate / Karaoke
```

---

## 3. Screen Prompts

### 3.1 Landing page (`/`)

```
Design a marketing landing page for Yuthikal AudioTech (dark theme).
Header: waveform logo left; nav links "Instrumentos", "Acordes", "Mis
Playlists"; language switcher ES/EN; theme toggle; gradient (blue→cyan) CTA
button "Iniciar con Google".
Hero: headline "Tu música, tus acordes, tu escenario", subtext about
learning chords and playing songs karaoke-style with real audio, primary
CTA "Explorar acordes" (brand gradient) + secondary CTA "Ver cómo
funciona". Hero visual: the brand waveform flowing into a stylized guitar
fretboard, or a mock chord-sheet card with a waveform progress bar.
Features section, 4 cards with line icons:
1. "Buscador de acordes" — search by voice or text, see every position.
2. "Referencia musical" — strings and notes in Spanish and English.
3. "Tus canciones" — lyrics with chords anchored to each syllable.
4. "Modo karaoke" — play the real audio and follow synced lyrics & chords.
Then a visual band showing the karaoke screen mockup in a device frame.
Footer: minimal, logo + language/theme controls.
```

### 3.2 Instrument selection (`/instruments`)

```
Design an instrument selection page (dark theme). Title "Elige tu
instrumento". A grid of large instrument cards. Only "Guitarra" is active:
guitar line illustration, cyan border on hover, arrow affordance. Two or
three more cards (Piano, Ukelele, Bajo) shown disabled/greyed with an
outlined cyan badge "Próximamente". Keep the page airy and simple — this
is a hub, not a dashboard.
```

### 3.3 Guitar strings reference (`/guitar/strings`)

```
Design an educational reference page about the 6 guitar strings (dark
theme). Title "Las cuerdas de la guitarra". Main visual: a horizontal
guitar neck/headstock illustration with the 6 strings drawn at increasing
thickness, each labeled. Below or beside it, 6 rows/cards, one per string:
string number (1ª–6ª), note in Spanish and English ("Mi — E"), traditional
Spanish name ("Prima" for 1st, "Bordona" for 6th), and thickness indicator.
Order shown from 1st (thinnest, highest pitch) to 6th (thickest, lowest).
Educational tone, generous spacing, no interactivity beyond hover.
```

### 3.4 Musical notes reference (`/guitar/notes`)

```
Design an educational reference page for the 12 chromatic musical notes
(dark theme). Title "Las notas musicales". A grid of 12 note cards. Natural
notes (7): large Spanish name "Do" with English equivalent "C" below.
Altered notes (5): show the enharmonic pair prominently, e.g. "Do# / Reb"
with "C# / Db" below, plus small labels "sostenido" and "bemol". Altered
note cards get a subtly different surface tone so the pattern
natural/altered is visible at a glance, mimicking piano white/black keys.
Optional footer strip: one octave of a piano keyboard as a visual anchor.
```

### 3.5 Chord finder (`/guitar/chords`) — the flagship public screen

```
Design a chord search & catalog page (dark theme). Top: a prominent search
bar with placeholder "Busca un acorde… ej. La menor, C#7, Si bemol" and a
microphone button for voice search (cyan with a subtle waveform pulse
animation when active/listening — the brand motif). Below the mic, a small
info note: "La búsqueda por voz requiere Chrome o Edge" — and design a
disabled state for the mic with a tooltip when the browser lacks support.
Under the search bar, a control row: grouping toggle (segmented control)
"Por categoría" (default) / "Por nota", and a results counter "Mostrando 24
de 132 acordes". Clear-search "x" resets to full catalog.
Body: chord results as a responsive grid of CHORD DIAGRAM CARDS (see master
context), grouped under sticky section headers ("Mayores", "Menores",
"Séptimas", "Suspendidos", "Disminuidos", "Aumentados", "Extendidos",
"Otros") in uppercase wide-tracked style. Infinite scroll — design a bottom
loading state (a small animated waveform), not pagination buttons. Each
card: diagram, bold name "Am — La menor", small outlined badge "cejilla"
when the default position requires a barre.
```

### 3.6 Chord detail (`/guitar/chords/[id]`)

```
Design a chord detail page (dark theme). Header: big chord name in both
notations "A# / Sib — La# / Si bemol — menor séptima", umbrella category
chip ("Séptimas"). Body: "Posiciones" — a horizontal sequence or grid of
CHORD DIAGRAM CARDS, one per playable position on the neck, ordered from
most common to least common, numbered "Posición 1, 2, 3…". Each position
card shows fret number offset (e.g. "traste 3"), cyan finger dots, and an
outlined "cejilla" badge when it uses a barre. First (most common) position
larger or visually featured. Back link to the catalog.
```

### 3.7 My Playlists (`/playlists`)

```
Design a private dashboard listing the user's playlists (dark theme).
Header shows the logged-in user's Google avatar + menu. Title "Mis
playlists" + gradient button "Nuevo playlist". Grid of playlist cards:
name, one-line description, genre chip ("Balada"), two star ratings
stacked with labels "Me gusta ★★★★☆" and "Dificultad ★★☆☆☆" (cyan stars),
and a song count "8 canciones". Empty state design too: friendly line
illustration of a guitar with a waveform + text "Aún no tienes playlists"
+ CTA.
Also design the "Nuevo playlist" modal/form: name, description (textarea),
genre select (Rock, Pop, Balada, Bolero, Ranchera, Cumbia, Salsa, Reggae,
Blues, Country, Cristiana, Otro) where choosing "Otro" reveals a free-text
input, and the two 1–5 star rating inputs.
```

### 3.8 Playlist detail (`/playlists/[id]`)

```
Design a playlist detail page (dark theme). Header block: playlist name,
description, genre chip, both star ratings, edit button. Below: "Canciones"
list + gradient button "Nueva canción". Each song row: song name, key chip
("Tonalidad: Sol — G"), audio-source icon (YouTube logo or file icon),
sync status badge (cyan "Sincronizada" or grey "Sin calibrar"), and action
icons: view, edit, calibrate, play-karaoke (the karaoke play button is the
prominent gradient action). Include an empty state for a playlist with no
songs.
```

### 3.9 Song view — chord sheet (`/playlists/[id]/songs/[songId]`, mode: view)

```
Design a song reading view reproducing a classic chord sheet (dark theme).
Header: song title "St. James Infirmary Blues", artist/subtitle
"Traditional", key chip "Tonalidad: Mi menor — Em", mode switcher tabs:
"Ver" (active) / "Editar" / "Calibrar" / "Karaoke".
Body: the CHORD SHEET — lyrics in comfortable reading size; bold cyan
chord names (Em, Am, B7, C) on their own line exactly above the syllable
where each chord change happens; section eyebrows "VERSO 1", "CORO"
(uppercase, wide-tracked) with a strumming chip next to them: "Rasgueo:
↓ – ↓ ↑ – ↑ ↓ ↑".
Footer of the sheet: "Acordes en esta canción" — a horizontal row of small
CHORD DIAGRAM CARDS for each unique chord used (Em, Am, B7, C). Design a
hover/tap popover: hovering a chord name inside the lyrics shows its mini
diagram.
```

### 3.10 Song editor (`mode: edit`)

```
Design a two-mode song editor (dark theme, desktop layout). Same header as
song view with "Editar" tab active. A sub-toggle: "Editor de texto" /
"Editor visual".
TEXT MODE: split view — left panel is a monospace ChordPro editor with
syntax highlighting (chords in [brackets] tinted cyan, {directives} tinted
blue, lyrics in normal text), right panel is the live-rendered chord sheet
preview. Show sample content including {key: Em}, {strum: D - D U - U D U}
and inline chords like "I went [Em]down to the St [Am]James In[Em]firmary".
VISUAL MODE: the rendered lyrics are directly editable; clicking a word
opens a chord picker popover (searchable list of chords with mini
diagrams) that anchors the chord above that syllable; section headers have
a strumming-pattern selector (arrows ↓ ↑ builder). Include save state
("Guardado" checkmark / "Guardando…").
Also show the song metadata form: name, description, key (tonalidad)
selector listing notes in both notations.
```

### 3.11 Audio & calibration (`mode: calibrate`)

```
Design an audio-sync calibration screen (dark theme). Header with
"Calibrar" tab active.
Top block — audio source: two tabs "YouTube" (URL input + video thumbnail
preview) and "Archivo" (MP3 upload dropzone). Show one connected state:
YouTube video card with title and duration.
Settings row: granularity choice as radio cards — "Por línea
(recomendado)" default, "Por palabra/acorde (avanzado)".
Main area: the chord sheet with the CURRENT target line highlighted
(cyan left border + brighter text), previous lines dimmed with a check +
captured timestamp ("0:34.2"), upcoming lines neutral. Big instruction
banner: "Presiona ESPACIO o toca aquí cuando empiece esta línea" with a
large tap zone. Transport bar at bottom: play/pause, a waveform-styled
audio progress bar (brand motif), elapsed/total time, buttons "Reiniciar
calibración" and a per-line "re-mark" icon to fix a single timestamp
without redoing all.
```

### 3.12 Karaoke mode (`mode: karaoke`) — the hero screen

```
Design a full-screen karaoke playback view (dark theme) — this is the
app's hero feature, used on a music stand while playing guitar. Minimal
chrome, maximum lyrics.
Center: the chord sheet auto-scrolling; the CURRENT line is enlarged and
bright with its chord names glowing cyan (the only glow effect in the
app); a smooth progress highlight sweeps within the current line; past
lines dim upward, future lines preview below. Section changes show the
section name + strumming chip briefly.
Top corner: current + next chord as two mini chord diagrams ("Ahora: Em /
Sigue: Am").
Bottom transport (large touch targets, thumb-reachable): play/pause,
restart, section skip back/forward, a waveform-styled progress bar with
timestamps, exit button. If the song has no calibration, show the fallback
variant: same screen but with an auto-scroll speed control (– / speed
value / +) instead of the synced progress bar, and a grey note "Sin
sincronización — scroll automático".
Design both this variant and the synced variant.
```

### 3.13 Auth & global states

```
Design supporting screens/components (dark theme):
1. LOGIN: a centered card with the Yuthikal AudioTech waveform logo,
   "Inicia sesión en Yuthikal AudioTech", a single "Continuar con Google"
   button (official Google button style), and the note "El registro solo
   está disponible con Google".
2. DB-PAUSED ERROR: full-page friendly error — warning illustration built
   from a flatlined waveform, text "La base de datos se encuentra
   inaccesible por inactividad, contacta al administrador", retry button.
3. LIGHT THEME SAMPLE: regenerate the chord finder (3.5) in the light
   variant: cool white background (#F8FAFC range), same blue→cyan accents
   (darkened slightly for contrast on white), dark ink text — to establish
   the light-mode token set.
```

---

## 4. Generation order suggestion

1. **3.5 Chord finder** — establishes cards, search, grid, and tokens.
2. **3.9 Song view** — establishes the chord sheet, the app's core artifact.
3. **3.12 Karaoke** — hero screen, derives from 3.9.
4. **3.1 Landing** — reuses visuals produced above.
5. Remaining screens in any order; **3.13.3** last to lock the light theme.

## 5. Out of scope for design (do not generate)

- Admin panels, public/social features (playlists are strictly private).
- Instruments other than guitar (only "coming soon" cards).
- Native mobile app chrome (this is a responsive web app).
