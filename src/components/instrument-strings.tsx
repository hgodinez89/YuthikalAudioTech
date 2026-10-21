import { getTranslations } from "next-intl/server";
import { TUNINGS, type TuningString } from "@/lib/instruments";

/** Ilustración del mástil (Guitar Strings.dc.html); colores del tema (`--neck-*`). */
function NeckIllustration({ strings }: { strings: TuningString[] }) {
  const W = 908;
  const H = 210;
  const x0 = 118;
  const xEnd = 800;
  const yFirst = 34;
  const yLast = 174;
  const ys = strings.map(
    (_, i) => yFirst + (i * (yLast - yFirst)) / Math.max(strings.length - 1, 1),
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="mx-auto block max-w-[908px]"
      aria-hidden
    >
      {/* diapasón */}
      <rect
        x={x0}
        y={16}
        width={xEnd - x0}
        height={H - 32}
        rx={6}
        fill="var(--neck-board)"
        stroke="var(--neck-edge)"
        strokeWidth={1.4}
      />
      {/* clavijero */}
      <path
        d={`M${x0} 20 L40 32 Q20 40 20 105 Q20 170 40 178 L${x0} 190 Z`}
        fill="var(--neck-head)"
        stroke="var(--neck-edge)"
        strokeWidth={1.4}
      />
      {/* cejuela */}
      <rect x={x0 - 4} y={16} width={6} height={H - 32} rx={2} fill="var(--neck-nut)" />
      {/* trastes con sus puntos guía */}
      {[0.2, 0.4, 0.6, 0.8].map((f, i) => {
        const x = x0 + (xEnd - x0) * f;
        return (
          <g key={i}>
            <line
              x1={x}
              y1={22}
              x2={x}
              y2={H - 22}
              stroke="var(--neck-fret)"
              strokeWidth={2}
            />
            <circle cx={x} cy={H / 2 + 4} r={3} fill="var(--neck-dot)" />
          </g>
        );
      })}
      {/* cuerdas, clavijas y etiquetas */}
      {strings.map((s, i) => {
        const y = ys[i];
        const sw = 1 + (s.th - 1) * 0.8;
        return (
          <g key={s.num}>
            <line
              x1={x0}
              y1={y}
              x2={xEnd}
              y2={y}
              stroke="var(--neck-string)"
              strokeWidth={sw}
              strokeLinecap="round"
              opacity={0.9}
            />
            <line
              x1={x0}
              y1={y}
              x2={40}
              y2={y}
              stroke="var(--neck-string-back)"
              strokeWidth={sw}
            />
            <circle
              cx={34}
              cy={y}
              r={5}
              fill="var(--neck-peg)"
              stroke="var(--neck-peg-edge)"
              strokeWidth={1.6}
            />
            <text
              x={xEnd + 14}
              y={y + 5}
              fontSize={16}
              fontFamily="var(--font-inter), sans-serif"
            >
              <tspan fill="var(--accent)" fontWeight={800}>
                {s.noteEs}
              </tspan>
              <tspan fill="var(--neck-sep)" fontWeight={600}>
                {"  ·  "}
              </tspan>
              <tspan fill="var(--neck-label)" fontWeight={600} fontSize={13}>
                {s.noteEn}
              </tspan>
            </text>
            <text
              x={x0 + 8}
              y={y - 6}
              fill="var(--neck-index)"
              fontSize={10}
              fontWeight={700}
              fontFamily="var(--font-inter), sans-serif"
            >
              {s.num}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GaugeBar({ th }: { th: number }) {
  return (
    <svg width={120} height={16} viewBox="0 0 120 16" aria-hidden>
      <line
        x1={4}
        y1={8}
        x2={116}
        y2={8}
        stroke="var(--accent)"
        strokeWidth={0.6 + th * 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sección "Cuerdas" de Básicos: afinación estándar del instrumento. */
export async function InstrumentStrings({
  instrument,
}: {
  instrument: "guitar" | "ukulele";
}) {
  const t = await getTranslations("strings");
  const strings = TUNINGS[instrument];

  return (
    <section id="strings" className="scroll-mt-36">
      <h2 className="mb-3 text-[28px] font-extrabold tracking-[-0.02em]">
        {t("title", { instrument })}
      </h2>
      <p className="mb-[26px] max-w-[620px] leading-relaxed text-sub">
        {t("intro", { instrument })}
      </p>

      <div className="yk-stage mb-8 rounded-[20px] border border-edge px-6 py-[26px] shadow-card">
        <NeckIllustration strings={strings} />
      </div>

      <div className="flex flex-col gap-3">
        {strings.map((s, i) => (
          <article
            key={s.num}
            className="grid grid-cols-[66px_1fr] items-center gap-x-[22px] gap-y-3 rounded-2xl border border-edge bg-surface px-[22px] py-[18px] transition-colors duration-150 hover:border-edge-2 sm:grid-cols-[66px_1fr_auto]"
          >
            <div className="flex size-[66px] flex-col items-center justify-center rounded-[14px] border border-accent/[0.22] bg-accent/[0.08]">
              <span className="text-2xl font-extrabold leading-none text-accent">
                {s.num}
              </span>
              <span className="mt-[3px] text-[9.5px] uppercase tracking-[0.1em] text-accent/70">
                {t("stringWord")}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-[22px] font-extrabold">{s.noteEs}</span>
                <span className="font-semibold text-tert">— {s.noteEn}</span>
                {s.trad && (
                  <span className="rounded-full border border-edge-2 bg-surface-2 px-2.5 py-[3px] text-xs font-semibold">
                    {s.trad}
                  </span>
                )}
              </div>
              <div className="mt-[5px] text-[13px] text-tert">
                {t(`pitch.${instrument}.${i + 1}`)}
              </div>
            </div>
            <div className="col-span-2 flex min-w-[120px] flex-row items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
              <span className="text-[10.5px] uppercase tracking-[0.1em] text-mute">
                {t("gauge")}
              </span>
              <GaugeBar th={s.th} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
