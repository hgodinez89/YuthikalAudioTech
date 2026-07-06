import { getTranslations } from "next-intl/server";

type NaturalNote = { kind: "natural"; es: string; en: string };
type AlteredNote = {
  kind: "altered";
  sharpEs: string;
  sharpEn: string;
  flatEs: string;
  flatEn: string;
};

/* Las 12 notas cromáticas con sus enarmonías (♯ = sostenido, ♭ = bemol). */
const NOTES: (NaturalNote | AlteredNote)[] = [
  { kind: "natural", es: "Do", en: "C" },
  { kind: "altered", sharpEs: "Do♯", sharpEn: "C♯", flatEs: "Re♭", flatEn: "D♭" },
  { kind: "natural", es: "Re", en: "D" },
  { kind: "altered", sharpEs: "Re♯", sharpEn: "D♯", flatEs: "Mi♭", flatEn: "E♭" },
  { kind: "natural", es: "Mi", en: "E" },
  { kind: "natural", es: "Fa", en: "F" },
  { kind: "altered", sharpEs: "Fa♯", sharpEn: "F♯", flatEs: "Sol♭", flatEn: "G♭" },
  { kind: "natural", es: "Sol", en: "G" },
  { kind: "altered", sharpEs: "Sol♯", sharpEn: "G♯", flatEs: "La♭", flatEn: "A♭" },
  { kind: "natural", es: "La", en: "A" },
  { kind: "altered", sharpEs: "La♯", sharpEn: "A♯", flatEs: "Si♭", flatEn: "B♭" },
  { kind: "natural", es: "Si", en: "B" },
];

const WHITE_KEYS = NOTES.filter((n): n is NaturalNote => n.kind === "natural");

/* Teclas negras posicionadas en porcentaje sobre las 7 blancas. */
const BLACK_KEYS = [
  { label: "Do♯ Re♭", left: "10%" },
  { label: "Re♯ Mi♭", left: "24.3%" },
  { label: "Fa♯ Sol♭", left: "53%" },
  { label: "Sol♯ La♭", left: "67.3%" },
  { label: "La♯ Si♭", left: "81.6%" },
];

export default async function MusicalNotesPage() {
  const t = await getTranslations("notes");

  return (
    <div className="mx-auto max-w-[980px] px-7 pb-[90px] pt-14">
      <div className="mb-[30px]">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.22em] text-accent">
          {t("eyebrow")}
        </div>
        <h1 className="mb-3 text-4xl font-extrabold tracking-[-0.025em]">{t("title")}</h1>
        <p className="max-w-[640px] leading-relaxed text-sub">
          {t.rich("intro", {
            em: (chunks) => <span className="text-ink">{chunks}</span>,
          })}
        </p>
      </div>

      {/* LEYENDA */}
      <div className="mb-[22px] flex items-center gap-[18px] text-[12.5px] text-sub">
        <span className="tracking-[0.04em]">{t("legend")}</span>
        <span className="inline-flex items-center gap-2">
          <span className="h-6 w-[15px] rounded-[3px_3px_5px_5px] bg-[linear-gradient(180deg,#e9edf3,#cfd6e0)]" />
          {t("natural")}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-6 w-[15px] rounded-[3px_3px_5px_5px] border border-[#1b2130] bg-[linear-gradient(180deg,#23272f,#0d0f13)]" />
          {t("altered")}
        </span>
      </div>

      {/* GRID DE NOTAS */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3.5">
        {NOTES.map((n) =>
          n.kind === "natural" ? (
            <article
              key={n.es}
              className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-edge-2 bg-surface p-5 text-center transition-colors duration-150 hover:border-accent dark:border-[#262d3b] dark:bg-[#14171f]"
            >
              <span className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
                {t("natural")}
              </span>
              <span className="text-[40px] font-extrabold leading-none tracking-[-0.02em]">
                {n.es}
              </span>
              <span className="mt-2 text-[17px] font-bold text-accent">{n.en}</span>
            </article>
          ) : (
            /* Alterada: siempre oscura, como las teclas negras del piano */
            <article
              key={n.sharpEs}
              className="dark flex min-h-[150px] flex-col justify-center rounded-2xl border border-[#1b2130] bg-[#090b0f] p-[18px] text-[#e7ecf3] transition-colors duration-150 hover:border-accent"
            >
              <span className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#4f5a6d]">
                {t("altered")}
              </span>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-extrabold leading-none">
                    {n.sharpEs}
                  </span>
                  <span className="text-[13px] font-bold text-accent">{n.sharpEn}</span>
                </div>
                <div className="-mt-1.5 text-[10px] uppercase tracking-[0.06em] text-mute">
                  {t("sharp")}
                </div>
                <div className="h-px bg-[#1b2130]" />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-extrabold leading-none">{n.flatEs}</span>
                  <span className="text-[13px] font-bold text-accent">{n.flatEn}</span>
                </div>
                <div className="-mt-1.5 text-[10px] uppercase tracking-[0.06em] text-mute">
                  {t("flat")}
                </div>
              </div>
            </article>
          ),
        )}
      </div>

      {/* OCTAVA DE PIANO — vitrina siempre oscura */}
      <div className="mt-[46px]">
        <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sub">
          {t("pianoTitle")}
        </div>
        <div className="relative h-[168px] overflow-hidden rounded-[14px] border border-[#1b2130] bg-[#0c0e13] p-3.5">
          <div className="relative flex h-full gap-[5px]">
            {WHITE_KEYS.map((w) => (
              <div
                key={w.es}
                className="flex flex-1 flex-col items-center justify-end rounded-b-lg bg-[linear-gradient(180deg,#e9edf3,#cfd6e0)] pb-3 shadow-[inset_0_-3px_0_rgba(0,0,0,0.08)]"
              >
                <span className="text-[15px] font-extrabold text-[#0d1017]">{w.es}</span>
                <span className="text-[10px] font-bold text-[#5b6577]">{w.en}</span>
              </div>
            ))}
            {BLACK_KEYS.map((b) => (
              <div
                key={b.label}
                className="absolute top-0 z-[2] flex h-[62%] w-[8.5%] items-end justify-center rounded-b-md border border-[#05070a] bg-[linear-gradient(180deg,#23272f,#0d0f13)] pb-[7px] shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                style={{ left: b.left }}
              >
                <span className="text-center text-[8.5px] font-bold leading-[1.2] text-[#cfd6e0]">
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
