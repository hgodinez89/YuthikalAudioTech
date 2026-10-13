import { redirect } from "next/navigation";
import { DEFAULT_SCALE_SLUG } from "@/lib/scales";

/** La sección abre en Do mayor; cada escala tiene su propia URL. */
export default async function ScalesPage({
  params,
}: {
  params: Promise<{ instrument: string }>;
}) {
  const { instrument } = await params;
  redirect(`/${instrument}/scales/${DEFAULT_SCALE_SLUG}`);
}
