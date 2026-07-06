import {
  ArrowRight,
  CirclePlay,
  FileText,
  Music,
  Play,
  Search,
  SkipBack,
  SkipForward,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/brand-logo";
import { ChordDiagram } from "@/components/chord-diagram";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

/* Contenido de muestra del hero (Landing.dc.html) */
const HERO_LINES: { c: string; t: string }[][] = [
  [
    { c: "Em", t: "I went down to the St. " },
    { c: "Am", t: "James In" },
    { c: "Em", t: "firmary" },
  ],
  [
    { c: "Em", t: "Saw my " },
    { c: "B7", t: "baby " },
    { c: "Em", t: "lyin' there" },
  ],
];

const EM = { frets: [0, 2, 2, 0, 0, 0] };
const AM = { frets: [-1, 0, 2, 2, 1, 0] };

/** Barras de onda deterministas (misma fórmula del prototipo). */
function Wave({
  count,
  baseH,
  filledFrac,
}: {
  count: number;
  baseH: number;
  filledFrac: number;
}) {
  const filled = Math.round(count * filledFrac);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const h = baseH * (0.35 + Math.abs(Math.sin(i * 0.5)) * 0.9 + (i % 3) * 0.06);
        const on = i <= filled;
        return (
          <span
            key={i}
            className="min-w-[2px] flex-1 rounded-[2px]"
            style={{
              height: Math.round(h),
              background: on
                ? "linear-gradient(180deg, var(--grad-to), var(--grad-from))"
                : "var(--edge)",
            }}
          />
        );
      })}
    </>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const features = [
    { icon: Search, title: t("features.finderTitle"), desc: t("features.finderDesc") },
    {
      icon: Music,
      title: t("features.referenceTitle"),
      desc: t("features.referenceDesc"),
    },
    { icon: FileText, title: t("features.songsTitle"), desc: t("features.songsDesc") },
    {
      icon: CirclePlay,
      title: t("features.karaokeTitle"),
      desc: t("features.karaokeDesc"),
    },
  ];

  return (
    <>
      {/* HERO */}
      <section className="mx-auto grid max-w-[1180px] items-center gap-14 px-7 pb-[60px] pt-[76px] lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-[22px] inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-[13px] py-1.5 text-xs font-semibold tracking-[0.04em] text-accent">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            {t("badge")}
          </div>
          <h1 className="mb-5 text-balance text-[42px] font-extrabold leading-[1.06] tracking-[-0.025em] md:text-[52px]">
            {t.rich("title", {
              accent: (chunks) => (
                <span className="bg-gradient-to-r from-[var(--grad-from)] to-[var(--grad-to)] bg-clip-text text-transparent">
                  {chunks}
                </span>
              ),
            })}
          </h1>
          <p className="mb-8 max-w-[520px] text-lg leading-relaxed text-sub">
            {t("subtitle")}
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link
              href="/guitar"
              className="yk-gradient inline-flex items-center gap-[9px] rounded-[13px] px-[26px] py-[15px] text-base font-bold shadow-[0_8px_30px_rgba(46,107,240,0.32)]"
            >
              {t("ctaStart")}
              <ArrowRight size={18} strokeWidth={2.2} />
            </Link>
            <a
              href="#karaoke"
              className="inline-flex items-center gap-[9px] rounded-[13px] border border-edge-2 bg-surface-2 px-6 py-[15px] text-base font-semibold text-ink"
            >
              <Play size={17} fill="currentColor" strokeWidth={0} />
              {t("ctaHow")}
            </a>
          </div>
        </div>

        {/* HERO CARD */}
        <div className="relative">
          <div className="absolute -inset-[30px] hidden bg-[radial-gradient(60%_60%_at_70%_20%,rgba(46,107,240,0.22),transparent_70%)] blur-[10px] dark:block" />
          <div className="relative rounded-[22px] border border-edge bg-surface p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#1f2636] dark:bg-[linear-gradient(180deg,#12151c,#0d1017)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
            <div className="mb-[18px] flex items-center justify-between">
              <div>
                <div className="text-base font-extrabold">St. James Infirmary</div>
                <div className="text-xs text-tert">{t("heroCard.songMeta")}</div>
              </div>
              <span className="rounded-full border border-accent/30 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent">
                {t("heroCard.karaokeBadge")}
              </span>
            </div>
            <div className="text-[15px] leading-[1.85]">
              <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em] text-mute">
                {t("heroCard.verse")}
              </div>
              {HERO_LINES.map((line, li) => (
                <div key={li} className="mb-0.5 flex flex-wrap items-end">
                  {line.map((seg, si) => (
                    <span key={si} className="inline-flex flex-col whitespace-pre">
                      <span className="min-h-5 text-[12.5px] font-extrabold leading-normal tracking-[0.01em] text-accent">
                        {seg.c}
                      </span>
                      <span>{seg.t}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-[22px] flex items-center gap-3 border-t border-edge pt-[18px]">
              <div className="yk-gradient grid size-[42px] shrink-0 place-items-center rounded-full shadow-[0_0_20px_rgba(53,214,232,0.4)]">
                <Play size={17} fill="currentColor" strokeWidth={0} className="ml-0.5" />
              </div>
              <div className="flex h-[34px] flex-1 items-center gap-[2.5px]">
                <Wave count={46} baseH={26} filledFrac={0.55} />
              </div>
              <span className="text-[11px] tabular-nums text-tert">1:12</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-[1180px] px-7 pb-5 pt-10">
        <div className="mb-11 text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-accent">
            {t("featuresEyebrow")}
          </div>
          <h2 className="text-[34px] font-extrabold tracking-[-0.02em]">
            {t("featuresTitle")}
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="rounded-[18px] border border-edge bg-surface p-6 transition-[border-color,transform] duration-150 hover:-translate-y-[3px] hover:border-accent"
            >
              <div className="mb-[18px] grid size-[46px] place-items-center rounded-xl border border-accent/[0.22] bg-accent/10 text-accent">
                <Icon size={22} strokeWidth={2} />
              </div>
              <h3 className="mb-2 text-[16.5px] font-bold">{title}</h3>
              <p className="text-sm leading-[1.55] text-sub">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* KARAOKE BAND */}
      <section id="karaoke" className="mx-auto max-w-[1180px] px-7 pb-10 pt-[72px]">
        <div className="relative grid items-center gap-12 overflow-hidden rounded-[28px] border border-edge bg-surface p-8 md:p-14 lg:grid-cols-[1fr_340px] dark:bg-[linear-gradient(140deg,#0a1220,#0b0e14)]">
          <div className="absolute -right-[60px] -top-20 hidden size-[340px] bg-[radial-gradient(circle,rgba(46,107,240,0.22),transparent_68%)] dark:block" />
          <div className="relative">
            <div className="mb-3.5 text-xs font-bold uppercase tracking-[0.22em] text-accent">
              {t("karaokeEyebrow")}
            </div>
            <h2 className="mb-4 text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em]">
              {t("karaokeTitle")}
            </h2>
            <p className="mb-6 max-w-[460px] leading-relaxed text-sub">
              {t("karaokeDesc")}
            </p>
            <div className="flex flex-wrap gap-[22px]">
              {[
                ["132", t("statChords")],
                ["2", t("statLanguages")],
                ["∞", t("statPlaylists")],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className="text-2xl font-extrabold text-accent">{value}</div>
                  <div className="text-[12.5px] text-tert">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* DEVICE FRAME */}
          <div className="relative justify-self-center">
            <div className="dark flex h-[470px] w-[250px] flex-col rounded-[40px] border-8 border-[#1a1f2b] bg-[#05070a] px-4 py-[18px] text-[#e7ecf3] shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
              <div className="mb-3.5 flex justify-between">
                <div className="flex flex-col items-center">
                  <span className="mb-[3px] text-[8px] font-bold uppercase tracking-[0.14em] text-[#35d6e8]">
                    {t("deviceNow")}
                  </span>
                  <div className="rounded-[9px] border border-[#222833] bg-[#10141c] p-[5px] shadow-[0_0_16px_rgba(53,214,232,0.3)]">
                    <ChordDiagram frets={EM.frets} scale={0.56} />
                  </div>
                </div>
                <div className="flex flex-col items-center opacity-60">
                  <span className="mb-[3px] text-[8px] font-bold uppercase tracking-[0.14em] text-[#7d8798]">
                    {t("deviceNext")}
                  </span>
                  <div className="rounded-[9px] border border-[#1b2130] bg-[#0d1017] p-[5px]">
                    <ChordDiagram frets={AM.frets} scale={0.52} />
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center">
                <div className="text-[13px] text-[#c3cad6] opacity-35">
                  Saw my baby lyin&apos; there
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-[#35d6e8] [text-shadow:0_0_12px_rgba(53,214,232,0.8)]">
                    Em&nbsp;&nbsp;&nbsp;Am&nbsp;&nbsp;&nbsp;C
                  </div>
                  <div className="text-lg font-bold text-white">
                    Stretched out on a long white table
                  </div>
                </div>
                <div className="text-[13px] text-[#c3cad6] opacity-35">
                  So sweet, so cold, so fair
                </div>
              </div>
              <div className="mb-3 flex h-5 items-center gap-1.5">
                <Wave count={26} baseH={16} filledFrac={0.45} />
              </div>
              <div className="flex items-center justify-center gap-4">
                <SkipBack size={16} fill="#9aa3b2" strokeWidth={0} />
                <div className="grid size-11 place-items-center rounded-full bg-[linear-gradient(135deg,#2e6bf0,#35d6e8)] text-[#04121a] shadow-[0_0_22px_rgba(53,214,232,0.45)]">
                  <Play
                    size={18}
                    fill="currentColor"
                    strokeWidth={0}
                    className="ml-0.5"
                  />
                </div>
                <SkipForward size={16} fill="#9aa3b2" strokeWidth={0} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-10 border-t border-edge">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-5 px-7 py-8">
          <div className="opacity-85">
            <BrandLogo height={34} />
          </div>
          <span className="text-[12.5px] text-mute">{t("footerCopy")}</span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </>
  );
}
