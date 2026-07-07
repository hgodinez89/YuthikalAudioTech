# Yuthikal AudioTech

App web responsive para guitarristas: referencia de acordes, canciones con letra + cifrado (ChordPro) y modo karaoke con audio real sincronizado. **Tu atril digital para guitarra.**

Proyecto completo y funcional — bilingüe (ES/EN), tema claro/oscuro, con catálogo de 481 acordes, playlists privados por usuario y modo karaoke sincronizado.

## Documentación

Empieza por **SETUP** si vas a levantar el proyecto desde cero; usa **IMPLEMENTATION** como referencia de operación del día a día.

| Documento | Para qué |
|---|---|
| [`docs/SETUP.md`](./docs/SETUP.md) | Configurar los servicios externos paso a paso: Supabase, GitHub + Vercel y Google OAuth. |
| [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) | Operar el proyecto: variables de entorno, base de datos y migraciones, ejecución local, despliegue, estructura, dependencias y decisiones registradas. |
| [`docs/PLAN.md`](./docs/PLAN.md) | Arquitectura, principios de ingeniería, modelo de datos, rutas y registro del plan por fases. |
| [`design_handoff_yuthikal_audiotech/`](./design_handoff_yuthikal_audiotech/README.md) | **Fuente de verdad de UI**: prototipos hi-fi y design tokens. |

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · next-intl (ES/EN, default ES) · next-themes · Supabase (Postgres, Google OAuth, Storage, RLS) · Vercel.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar con las credenciales de Supabase (ver docs/SETUP.md)
npm run dev
```

Verificaciones: `npm run lint` · `npm test` · `npm run format` · `npm run build`.
