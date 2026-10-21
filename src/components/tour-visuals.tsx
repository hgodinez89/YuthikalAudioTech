import { InstrumentIcon } from "./instrument-icons";

/* Ilustraciones del recorrido: alusiones a cada instrumento, con los tokens
   del mástil para que funcionen en claro y oscuro. */

const PEG = { fill: "var(--edge-2)" };
const GLOW_STRING = { stroke: "var(--accent)", filter: "drop-shadow(var(--glow))" };

/** Mástil con clavijero: 3+3 clavijas y 6 cuerdas (guitarra) o 2+2 y 4 (ukelele). */
function Neck({ strings, label }: { strings: 4 | 6; label: string }) {
  const six = strings === 6;
  const top = six ? 40 : 54;
  const height = six ? 120 : 92;
  const end = six ? 471 : 405;
  const frets = six
    ? [165, 222, 273, 319, 360, 397, 431, 462]
    : [175, 238, 294, 344, 388];
  const dots = six ? [247, 339, 414] : [266, 366];
  const pegsX = six ? [28, 51, 74] : [56, 80];
  const stringsY = six ? [50, 70, 90, 110, 130, 150] : [66, 89, 112, 135];
  const widths = six ? [1, 1.4, 1.8, 2.2, 2.8, 3.4] : [1.6, 2, 2.4, 1.8];
  const glow = six ? 3 : 1;
  return (
    <svg viewBox="0 0 480 200" className="w-full" role="img" aria-label={label}>
      <rect
        x={six ? 8 : 38}
        y={top - 10}
        width={six ? 86 : 60}
        height={height + 20}
        rx="14"
        style={{ fill: "var(--surface-2)", stroke: "var(--edge-2)", strokeWidth: 1.5 }}
      />
      {pegsX.map((x) => (
        <g key={x} style={PEG}>
          <circle cx={x} cy={top - 20} r="8" />
          <circle cx={x} cy={top + height + 20} r="8" />
        </g>
      ))}
      <rect
        x={six ? 101 : 105}
        y={top}
        width={end - (six ? 101 : 105)}
        height={height}
        rx="3"
        style={{ fill: "var(--neck-board)", stroke: "var(--neck-edge)" }}
      />
      <rect
        x={six ? 95 : 99}
        y={top - 2}
        width="7"
        height={height + 4}
        style={{ fill: "var(--neck-nut)" }}
      />
      {frets.map((x) => (
        <line
          key={x}
          x1={x}
          y1={top}
          x2={x}
          y2={top + height}
          style={{ stroke: "var(--neck-fret)", strokeWidth: 2.5 }}
        />
      ))}
      {dots.map((x) => (
        <circle key={x} cx={x} cy="100" r="6" style={{ fill: "var(--neck-dot)" }} />
      ))}
      {stringsY.map((y, i) => (
        <line
          key={y}
          x1={six ? 40 : 66}
          y1={y}
          x2={end}
          y2={y}
          style={{
            stroke: "var(--neck-string)",
            strokeWidth: widths[i],
            ...(i === glow ? GLOW_STRING : {}),
          }}
        />
      ))}
    </svg>
  );
}

export function GuitarNeck({ label }: { label: string }) {
  return <Neck strings={6} label={label} />;
}

export function UkuleleNeck({ label }: { label: string }) {
  return <Neck strings={4} label={label} />;
}

/** Una octava: siete teclas blancas (Do marcado) y cinco negras. */
export function PianoKeys({ label, first }: { label: string; first: string }) {
  const blacks = ["10%", "24.3%", "52.9%", "67.1%", "81.4%"];
  return (
    <div role="img" aria-label={label} className="relative flex h-[170px]">
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className={`flex flex-1 items-end justify-center rounded-b-lg border border-edge-2 pb-2.5 text-[13px] font-bold ${
            i === 0 ? "yk-gradient" : "bg-white text-[#0f172a]"
          }`}
        >
          {i === 0 ? first : ""}
        </span>
      ))}
      {blacks.map((left) => (
        <span
          key={left}
          className="absolute top-0 h-[100px] w-[8%] rounded-b-md bg-[#111827]"
          style={{ left }}
        />
      ))}
    </div>
  );
}

/** «Para Guitarra · Ukelele · Piano»: a quién sirve cada parte. */
export function InstrumentStrip({
  label,
  instruments,
}: {
  label: string;
  instruments: { id: string; name: string }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs uppercase tracking-[0.12em] text-sub">
      <span className="text-mute">{label}</span>
      {instruments.map(({ id, name }) => (
        <span key={id} className="inline-flex items-center gap-1.5">
          <span className="text-accent">
            <InstrumentIcon name={id} size={18} />
          </span>
          {name}
        </span>
      ))}
    </div>
  );
}

/** Ecualizador de la marca latiendo al fondo (decorativo). */
export function TourEqualizer() {
  const heights = [
    20, 34, 28, 50, 42, 64, 56, 78, 70, 86, 80, 86, 70, 78, 56, 64, 42, 50, 28, 34, 20,
  ];
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-0 flex h-[90px] items-end justify-center gap-1.5 opacity-40"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="block w-1.5 origin-bottom rounded-[3px]"
          style={{
            height: h,
            background: "linear-gradient(180deg, var(--grad-to), var(--grad-from))",
            animation: "yk-eq 1.1s ease-in-out infinite",
            animationDelay: `${(Math.abs(i - 10) * 0.05).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}
