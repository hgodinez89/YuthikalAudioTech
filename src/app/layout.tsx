/* El layout real (html, idioma, tema, header) es [locale]/layout.tsx. Este
   solo pasa los hijos: hace falta para la 404 de rutas sin idioma. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
