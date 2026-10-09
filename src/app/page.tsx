import { ArrowRight, CirclePlay, FileText, Search } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/brand-logo";
import { InstrumentIcon } from "@/components/instrument-icons";
import {
  COMING_SOON,
  INSTRUMENT_COOKIE,
  INSTRUMENTS,
  isInstrument,
} from "@/lib/instruments";

export default async function LandingPage() {
  // Quien ya eligió instrumento vuelve directo a él.
  const remembered = (await cookies()).get(INSTRUMENT_COOKIE)?.value;
  if (isInstrument(remembered)) redirect(`/${remembered}/chords`);

  const t = await getTranslations("landing");
  const tInstruments = await getTranslations("instruments");

  const features = [
    { icon: Search, title: t("features.finderTitle"), desc: t("features.finderDesc") },
    { icon: FileText, title: t("features.songsTitle"), desc: t("features.songsDesc") },
    {
      icon: CirclePlay,
      title: t("features.karaokeTitle"),
      desc: t("features.karaokeDesc"),
    },
  ];

  return (
    <>
      {/* HERO + ELECCIÓN DE INSTRUMENTO */}
      <section className="relative mx-auto max-w-[1000px] px-6 pb-12 pt-14 text-center md:pt-[72px]">
        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-[360px] w-[720px] -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_40%,rgba(46,107,240,0.18),transparent_70%)] dark:block" />
        <div className="relative">
          <div className="mb-[22px] inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-[13px] py-1.5 text-xs font-semibold tracking-[0.04em] text-accent">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            {t("badge")}
          </div>
          <h1 className="mx-auto mb-5 max-w-[760px] text-balance text-[38px] font-extrabold leading-[1.06] tracking-[-0.025em] md:text-[52px]">
            {t.rich("title", {
              accent: (chunks) => (
                <span className="bg-gradient-to-r from-[var(--grad-from)] to-[var(--grad-to)] bg-clip-text text-transparent">
                  {chunks}
                </span>
              ),
            })}
          </h1>
          <p className="mx-auto mb-11 max-w-[560px] text-lg leading-relaxed text-sub">
            {t("subtitle")}
          </p>

          <div className="mb-[18px] text-xs font-bold uppercase tracking-[0.22em] text-accent">
            {t("chooseInstrument")}
          </div>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4 md:gap-[18px]">
            {INSTRUMENTS.map((key) => (
              <Link
                key={key}
                href={`/${key}/chords`}
                className="group relative flex flex-col items-center rounded-[22px] border border-edge-2 bg-surface px-4 pb-6 pt-8 transition-[border-color,transform,box-shadow] duration-[180ms] hover:-translate-y-1 hover:border-accent hover:shadow-[0_20px_50px_rgba(46,107,240,0.22)] dark:bg-[linear-gradient(180deg,#12151c,#0e1118)]"
              >
                <div className="yk-gradient absolute right-3.5 top-3.5 grid size-[30px] place-items-center rounded-full">
                  <ArrowRight size={15} strokeWidth={2.4} />
                </div>
                <div className="mb-4 text-accent">
                  <InstrumentIcon name={key} size={72} />
                </div>
                <h2 className="mb-1 text-lg font-bold">{tInstruments(`${key}.name`)}</h2>
                <p className="text-[13px] leading-snug text-sub">
                  {tInstruments(`${key}.desc`)}
                </p>
              </Link>
            ))}
            {COMING_SOON.map((key) => (
              <div
                key={key}
                aria-disabled
                className="relative flex cursor-not-allowed flex-col items-center rounded-[22px] border border-edge bg-surface-3 px-4 pb-6 pt-8 dark:border-[#171c28] dark:bg-[#0c0e13]"
              >
                <span className="absolute right-3 top-3 rounded-full border border-accent/35 px-[9px] py-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-accent">
                  {tInstruments("soon")}
                </span>
                <div className="mb-4 text-disabled">
                  <InstrumentIcon name={key} size={72} />
                </div>
                <h2 className="mb-1 text-lg font-bold text-mute">
                  {tInstruments(`${key}.name`)}
                </h2>
                <p className="text-[13px] leading-snug text-tert dark:text-[#454e5e]">
                  {tInstruments(`${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUÉ PUEDES HACER */}
      <section className="mx-auto grid max-w-[1000px] gap-3.5 px-6 pb-14 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3.5 rounded-[18px] p-3 text-left">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent/[0.22] bg-accent/10 text-accent">
              <Icon size={19} strokeWidth={2} />
            </div>
            <div>
              <h3 className="mb-1 text-[15px] font-bold">{title}</h3>
              <p className="text-[13.5px] leading-[1.5] text-sub">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      <footer className="border-t border-edge">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-between gap-5 px-6 py-7">
          <div className="opacity-85">
            <BrandLogo height={30} />
          </div>
          <span className="text-[12.5px] text-mute">{t("footerCopy")}</span>
        </div>
      </footer>
    </>
  );
}
