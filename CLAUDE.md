@AGENTS.md

# Yuthikal AudioTech — guía para agentes

App web para guitarristas (Next.js App Router + TypeScript + Supabase): referencia de acordes, canciones con cifrado ChordPro y modo karaoke con audio real sincronizado. Bilingüe ES/EN, tema claro/oscuro.

## Comandos

- `npm run dev` — desarrollo · `npm run build` — build de producción · `npm run start` — sirve el build
- `npm test` — Vitest (solo lógica crítica pura)
- `npm run lint` — ESLint (reglas React 19 estrictas) · `npm run format` — Prettier

Antes de dar por terminado un cambio: `npm run lint && npm test && npm run build` deben pasar, y `npm audit` sin vulnerabilidades.

## Principios que no se rompen

- **Sin sobreingeniería:** la solución más simple que cumpla el requisito; sin abstracciones especulativas. Cada dependencia nueva se justifica.
- **Seguridad:** RLS de Supabase es la defensa principal (privacidad en la BD, no solo en la UI). Nunca la `service_role` key en el cliente — solo la anon key. El ChordPro del usuario se renderiza como nodos de texto React, jamás `dangerouslySetInnerHTML`. Formularios validados en cliente **y** re-validados en servidor.
- **Dependencias:** última versión estable verificada en npm; lockfile versionado.
- **Tests:** solo para lógica pura crítica (parser de acordes, ChordPro, sincronización); sin e2e.

## i18n y temas

- next-intl por cookie, **español por defecto**. Todo texto visible vive en `messages/es.json` y `messages/en.json` (ambos idiomas siempre).
- next-themes claro/oscuro/sistema. Los design tokens (colores, gradientes) son CSS variables en `src/app/globals.css`.

## Fuente de verdad de diseño

`design_handoff_yuthikal_audiotech/` contiene los prototipos hi-fi (`.dc.html`) y los design tokens. **Recrear como componentes React idiomáticos** siguiendo su README — nunca portar el HTML de los prototipos ni el `support.js`.

## Documentación

`docs/SETUP.md` (servicios externos) · `docs/IMPLEMENTATION.md` (operación, BD, deploy, decisiones) · `docs/PLAN.md` (arquitectura y modelo de datos).
