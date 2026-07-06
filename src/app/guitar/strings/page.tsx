import { getTranslations } from "next-intl/server";

/* Datos de las 6 cuerdas (afinación estándar), de la 1ª a la 6ª. */
const STRINGS = [
  { num: "1ª", noteEs: "Mi", noteEn: "E", trad: "Prima", pitchKey: "pitch1", th: 1 },
  { num: "2ª", noteEs: "Si", noteEn: "B", trad: "Segunda", pitchKey: "pitch2", th: 2 },
  { num: "3ª", noteEs: "Sol", noteEn: "G", trad: "Tercera", pitchKey: "pitch3", th: 3 },
  { num: "4ª", noteEs: "Re", noteEn: "D", trad: "Cuarta", pitchKey: "pitch4", th: 4 },
  { num: "5ª", noteEs: "La", noteEn: "A", trad: "Quinta", pitchKey: "pitch5", th: 5 },
  { num: "6ª", noteEs: "Mi", noteEn: "E", trad: "Bordona", pitchKey: "pitch6", th: 6 },
] as const;

/** Ilustración del mástil (Guitar Strings.dc.html) — vitrina siempre oscura. */
function NeckIllustration() {
  const W = 908;
  const H = 210;
  const x0 = 118;
  const xEnd = 800;
  const ys = [34, 62, 90, 118, 146, 174];

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
        fill="#171a22"
        stroke="#242b3a"
        strokeWidth={1.4}
      />
      {/* clavijero */}
      <path
        d={`M${x0} 20 L40 32 Q20 40 20 105 Q20 170 40 178 L${x0} 190 Z`}
        fill="#12141b"
        stroke="#242b3a"
        strokeWidth={1.4}
      />
      {/* cejuela */}
      <rect x={x0 - 4} y={16} width={6} height={H - 32} rx={2} fill="#5a6474" />
      {/* trastes con sus puntos guía */}
      {[0.2, 0.4, 0.6, 0.8].map((f, i) => {
        const x = x0 + (xEnd - x0) * f;
        return (
          <g key={i}>
            <line x1={x} y1={22} x2={x} y2={H - 22} stroke="#2a3242" strokeWidth={2} />
            <circle cx={x} cy={H / 2 + 4} r={3} fill="#2a3242" />
          </g>
        );
      })}
      {/* cuerdas, clavijas y etiquetas */}
      {STRINGS.map((s, i) => {
        const y = ys[i];
        const sw = 1 + i * 0.8;
        return (
          <g key={s.num}>
            <line
              x1={x0}
              y1={y}
              x2={xEnd}
              y2={y}
              stroke="#aeb6c4"
              strokeWidth={sw}
              strokeLinecap="round"
              opacity={0.9}
            />
            <line x1={x0} y1={y} x2={40} y2={y} stroke="#4a5568" strokeWidth={sw} />
            <circle
              cx={34}
              cy={y}
              r={5}
              fill="#0d0f14"
              stroke="#5a6474"
              strokeWidth={1.6}
            />
            <text
              x={xEnd + 14}
              y={y + 5}
              fontSize={16}
              fontFamily="var(--font-inter), sans-serif"
            >
              <tspan fill="#35d6e8" fontWeight={800}>
                {s.noteEs}
              </tspan>
              <tspan fill="#4f5a6d" fontWeight={600}>
                {"  ·  "}
              </tspan>
              <tspan fill="#8b93a3" fontWeight={600} fontSize={13}>
                {s.noteEn}
              </tspan>
            </text>
            <text
              x={x0 + 8}
              y={y - 6}
              fill="#5b6577"
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

export default async function GuitarStringsPage() {
  const t = await getTranslations("strings");

  return (
    <div className="mx-auto max-w-[960px] px-7 pb-[90px] pt-14">
      <div className="mb-[34px]">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.22em] text-accent">
          {t("eyebrow")}
        </div>
        <h1 className="mb-3 text-4xl font-extrabold tracking-[-0.025em]">{t("title")}</h1>
        <p className="max-w-[620px] leading-relaxed text-sub">{t("intro")}</p>
      </div>

      <div className="dark mb-10 rounded-[20px] border border-[#1b2130] bg-[linear-gradient(180deg,#101017,#0b0d12)] px-6 py-[26px]">
        <NeckIllustration />
      </div>

      <div className="flex flex-col gap-3">
        {STRINGS.map((s) => (
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
                <span className="rounded-full border border-edge-2 bg-surface-2 px-2.5 py-[3px] text-xs font-semibold">
                  {s.trad}
                </span>
              </div>
              <div className="mt-[5px] text-[13px] text-tert">{t(s.pitchKey)}</div>
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
    </div>
  );
}
