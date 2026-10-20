import { notFound } from "next/navigation";

/* Cualquier ruta inexistente dentro de un idioma: 404 con el layout del idioma. */
export default function CatchAll() {
  notFound();
}
