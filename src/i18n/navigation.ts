import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/* Navegación con el idioma en la URL: `Link`, `useRouter`, `usePathname` y
   `redirect` agregan (o quitan, en usePathname) el prefijo /es o /en. */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
