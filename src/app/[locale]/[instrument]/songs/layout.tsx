import { setRequestLocale } from "next-intl/server";
import { SectionMessages } from "@/components/section-messages";
import { ToastProvider } from "@/components/toast";

/* Textos de cliente de esta sección (además de los comunes). */
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SectionMessages locale={locale} section="songs">
      {/* Avisos con «Deshacer»: siguen visibles al pasar del editor a la lista. */}
      <ToastProvider>{children}</ToastProvider>
    </SectionMessages>
  );
}
