import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SkipLink } from "@/components/skip-link";
import { clientMessages } from "@/i18n/client-messages";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

// Fuente variable: un solo archivo cubre todos los pesos.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  // Solo la usan el editor y el reproductor de canciones: sin precarga global.
  preload: false,
});

/* Un árbol por idioma, generado en el build. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    // Nombre bajo el icono al añadir a la pantalla de inicio en iOS.
    appleWebApp: { title: "Yuthikal" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Al navegador solo viajan los textos que usan los componentes de cliente.
  const messages = clientMessages(await getMessages({ locale }));

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {/* Idioma explícito: en rutas dinámicas con streaming el de
              setRequestLocale no siempre llega a los componentes hijos. */}
          <NextIntlClientProvider locale={locale} messages={messages}>
            <SkipLink />
            <SiteHeader />
            {/* Cada pantalla pone su único <main id="main"> (la portada deja
                su pie fuera de él). */}
            <div className="flex flex-1 flex-col">{children}</div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
