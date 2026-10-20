import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { clientMessages, type Section } from "@/i18n/client-messages";

/** Proveedor de textos de una sección: comunes + los de sus componentes de cliente. */
export async function SectionMessages({
  locale,
  section,
  children,
}: {
  locale: string;
  section: Section;
  children: ReactNode;
}) {
  const messages = clientMessages(await getMessages({ locale }), section);
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
