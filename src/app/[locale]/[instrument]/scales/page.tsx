import { redirect } from "@/i18n/navigation";
import { DEFAULT_SCALE_SLUG } from "@/lib/scales";

/** La sección abre en Do mayor; cada escala tiene su propia URL. */
export default async function ScalesPage({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}) {
  const { locale, instrument } = await params;
  redirect({ href: `/${instrument}/scales/${DEFAULT_SCALE_SLUG}`, locale });
}
