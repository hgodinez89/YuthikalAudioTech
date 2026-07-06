# Yuthikal AudioTech

App web responsive para guitarristas: referencia de acordes, canciones con letra + cifrado (ChordPro) y modo karaoke con audio real sincronizado. **Tu atril digital para guitarra.**

## Documentos

- [`PLAN.md`](./PLAN.md) — plan por fases, principios de ingeniería, modelo de datos y rutas.
- [`DESIGN-BRIEF.md`](./DESIGN-BRIEF.md) — brief usado para generar el diseño.
- [`design_handoff_yuthikal_audiotech/`](./design_handoff_yuthikal_audiotech/README.md) — **fuente de verdad de UI** (prototipos hi-fi + design tokens).

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · next-intl (ES/EN, default ES) · next-themes · Supabase (Postgres, Google OAuth, Storage, RLS) · Vercel.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar con las credenciales de Supabase
npm run dev
```

Verificaciones: `npm run lint` · `npm run format` · `npm run build`.
