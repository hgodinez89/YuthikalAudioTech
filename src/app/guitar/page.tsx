import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

/* Ilustraciones de línea del handoff (Instruments.dc.html) */
const ICON_PROPS = {
  width: 96,
  height: 96,
  viewBox: "0 0 96 96",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function GuitarIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <path d="M74 14l-8 8" />
      <path d="M78 10a4 4 0 0 1 4 4l-4 4a4 4 0 0 1-4-4z" />
      <path d="M66 22 41 47" />
      <path d="M41 47c-4-4-11-3-16 2s-8 15-2 21 16 3 21-2 6-13 2-16z" />
      <circle cx="35" cy="58" r="7" />
    </svg>
  );
}

function PianoIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <rect x="18" y="26" width="60" height="44" rx="4" />
      <path d="M32 26v28M46 26v28M60 26v28" />
      <path d="M27 54v16M41 54v16M53 54v16M67 54v16" />
    </svg>
  );
}

function UkuleleIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <path d="M70 20l-6 6" />
      <path d="M64 26 46 44" />
      <path d="M46 44c-3-3-9-2-13 2s-6 12-2 16 13 2 17-2 4-11 1-14z" />
      <circle cx="40" cy="54" r="5.5" />
    </svg>
  );
}

function BassIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <path d="M76 12l-4 4M80 8l-8 8" />
      <path d="M74 16 40 50" />
      <path d="M40 50c-4-4-11-3-15 1s-5 12 0 17 13 4 17 0 3-14-2-18z" />
      <path d="M74 16l2 2M70 20l2 2M66 24l2 2" />
    </svg>
  );
}

const COMING_SOON = [
  { key: "piano", Icon: PianoIcon },
  { key: "ukulele", Icon: UkuleleIcon },
  { key: "bass", Icon: BassIcon },
] as const;

export default async function InstrumentsPage() {
  const t = await getTranslations("instruments");

  return (
    <div className="mx-auto max-w-[1000px] px-7 pb-[90px] pt-[72px]">
      <div className="mb-14 text-center">
        <div className="mb-3.5 text-xs font-bold uppercase tracking-[0.22em] text-accent">
          {t("eyebrow")}
        </div>
        <h1 className="mb-3.5 text-[34px] font-extrabold tracking-[-0.025em] md:text-[42px]">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-[480px] text-[17px] leading-relaxed text-sub">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid gap-[22px] sm:grid-cols-2">
        {/* GUITARRA (activa) */}
        <Link
          href="/guitar/chords"
          className="group relative flex flex-col items-center rounded-[22px] border border-edge-2 bg-surface px-8 pb-[34px] pt-11 text-center transition-[border-color,transform,box-shadow] duration-[180ms] hover:-translate-y-1 hover:border-accent hover:shadow-[0_20px_50px_rgba(46,107,240,0.22)] dark:bg-[linear-gradient(180deg,#12151c,#0e1118)]"
        >
          <div className="yk-gradient absolute right-[18px] top-[18px] grid size-[34px] place-items-center rounded-full">
            <ArrowRight size={17} strokeWidth={2.4} />
          </div>
          <div className="mb-[22px] text-accent">
            <GuitarIcon />
          </div>
          <h2 className="mb-1.5 text-[22px] font-bold">{t("guitar.name")}</h2>
          <p className="text-sm text-sub">{t("guitar.desc")}</p>
          <span className="mt-[18px] inline-flex items-center gap-[7px] text-[13px] font-semibold text-accent">
            {t("explore")}
            <ArrowRight size={15} strokeWidth={2.2} />
          </span>
        </Link>

        {/* PRÓXIMAMENTE */}
        {COMING_SOON.map(({ key, Icon }) => (
          <div
            key={key}
            className="relative flex cursor-not-allowed flex-col items-center rounded-[22px] border border-edge bg-surface-3 px-8 pb-[34px] pt-11 text-center dark:border-[#171c28] dark:bg-[#0c0e13]"
          >
            <span className="absolute right-[18px] top-[18px] rounded-full border border-accent/35 px-[11px] py-[5px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-accent">
              {t("soon")}
            </span>
            <div className="mb-[22px] text-disabled">
              <Icon />
            </div>
            <h2 className="mb-1.5 text-[22px] font-bold text-mute">{t(`${key}.name`)}</h2>
            <p className="text-sm text-tert dark:text-[#454e5e]">{t(`${key}.desc`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
