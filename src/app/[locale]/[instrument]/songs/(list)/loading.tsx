import { LoadingScreen } from "@/components/loading-screen";

/* Pantalla de carga solo al entrar a Mis canciones (sesión + BD). El route
   group (list) evita que cubra la canción y sus modos: ahí la pantalla sigue
   visible y el enlace pulsado muestra que carga (link-pending.tsx). */
export default function Loading() {
  return <LoadingScreen />;
}
