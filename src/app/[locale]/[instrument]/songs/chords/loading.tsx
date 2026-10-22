import { MyChordsSkeleton } from "@/components/my-chords-skeleton";

/* Tarjetas fantasma al entrar a "Mis acordes": como es estática, Next la
   precarga y aparece al instante mientras el servidor trae la biblioteca. */
export default function Loading() {
  return <MyChordsSkeleton />;
}
