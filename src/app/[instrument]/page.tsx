import { redirect } from "next/navigation";

export default async function InstrumentHome({
  params,
}: {
  params: Promise<{ instrument: string }>;
}) {
  const { instrument } = await params;
  redirect(`/${instrument}/chords`);
}
