"use client";

/** Nota a dibujar sobre el mástil. */
export type FretboardNote = {
  /** Cuerda (0 = 1.ª, arriba). */
  string: number;
  fret: number;
  midi: number;
  /** Texto dentro del círculo (nota, grado o dedo). */
  label: string;
  /** Tónica: va con el gradiente de la app. */
  tonic: boolean;
};

const STRING_GAP = 28;
const OPEN_W = 40;
const NAME_W = 22;
const TOP = 20;
const BOTTOM = 26;
const R = 11.5;
const SINGLE_DOTS = [3, 5, 7, 9, 15];

/**
 * Mástil horizontal en SVG (estilo de la ilustración de Básicos, con los
 * colores del tema `--neck-*`): 1.ª cuerda arriba, cuerdas al aire a la izquierda de la cejuela.
 * Dibuja del traste `from` al `to`; si `from` es 0 incluye la cejuela.
 */
export function Fretboard({
  stringNames,
  from,
  to,
  notes,
  fretWidth: FRET_W = 54,
  onNote,
}: {
  /** Nombre de cada cuerda al aire, de la 1.ª a la última. */
  stringNames: string[];
  from: number;
  to: number;
  notes: FretboardNote[];
  /** Ancho de cada traste (px del viewBox). */
  fretWidth?: number;
  onNote?: (midi: number) => void;
}) {
  const first = Math.max(from, 1);
  const count = to - first + 1;
  const left = NAME_W + (from === 0 ? OPEN_W : 0);
  const width = left + count * FRET_W + 6;
  const boardH = (stringNames.length - 1) * STRING_GAP;
  const height = TOP + boardH + BOTTOM;
  const y = (s: number) => TOP + s * STRING_GAP;
  const x = (fret: number) =>
    fret === 0 ? NAME_W + OPEN_W / 2 : left + (fret - first) * FRET_W + FRET_W / 2;
  const frets = Array.from({ length: count }, (_, i) => first + i);
  const midY = TOP + boardH / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      className="mx-auto block max-w-none select-none"
      aria-hidden={!onNote}
    >
      <defs>
        <linearGradient id="yk-fret-tonic" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--grad-from)" />
          <stop offset="1" stopColor="var(--grad-to)" />
        </linearGradient>
      </defs>

      {/* diapasón */}
      <rect
        x={left}
        y={TOP - 10}
        width={count * FRET_W}
        height={boardH + 20}
        rx={4}
        fill="var(--neck-board)"
        stroke="var(--neck-edge)"
      />

      {/* puntos guía */}
      {frets.map((f) =>
        f % 12 === 0 ? (
          <g key={f} fill="var(--neck-dot)">
            <circle cx={x(f)} cy={midY - STRING_GAP} r={4} />
            <circle cx={x(f)} cy={midY + STRING_GAP} r={4} />
          </g>
        ) : SINGLE_DOTS.includes(f) ? (
          <circle key={f} cx={x(f)} cy={midY} r={4} fill="var(--neck-dot)" />
        ) : null,
      )}

      {/* trastes y cejuela */}
      {Array.from({ length: count + 1 }, (_, i) => {
        const lx = left + i * FRET_W;
        const nut = i === 0 && from === 0;
        return (
          <line
            key={i}
            x1={lx}
            y1={TOP - 10}
            x2={lx}
            y2={TOP + boardH + 10}
            stroke={nut ? "var(--board-nut)" : "var(--board-fret)"}
            strokeWidth={nut ? 5 : 2}
          />
        );
      })}

      {/* número de traste */}
      {frets.map((f) => (
        <text
          key={f}
          x={x(f)}
          y={height - 4}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={700}
          fill={
            SINGLE_DOTS.includes(f) || f % 12 === 0
              ? "var(--neck-num-strong)"
              : "var(--neck-num)"
          }
          fontFamily="var(--font-inter), sans-serif"
        >
          {f}
        </text>
      ))}

      {/* cuerdas con su nombre */}
      {stringNames.map((name, s) => (
        <g key={s}>
          <line
            x1={from === 0 ? NAME_W + 4 : left}
            y1={y(s)}
            x2={left + count * FRET_W}
            y2={y(s)}
            stroke="var(--neck-string)"
            strokeWidth={0.9 + (s / Math.max(stringNames.length - 1, 1)) * 1.6}
            opacity={0.85}
          />
          <text
            x={NAME_W / 2 - 2}
            y={y(s) + 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="var(--neck-index)"
            fontFamily="var(--font-inter), sans-serif"
          >
            {name}
          </text>
        </g>
      ))}

      {/* notas de la escala */}
      {notes.map((n) => (
        <g
          key={`${n.string}-${n.fret}`}
          {...(onNote
            ? {
                onPointerDown: () => onNote(n.midi),
                style: { cursor: "pointer" },
                role: "button",
                "aria-label": n.label,
              }
            : {})}
        >
          <circle
            cx={x(n.fret)}
            cy={y(n.string)}
            r={R}
            fill={n.tonic ? "url(#yk-fret-tonic)" : "var(--neck-note-fill)"}
            stroke={n.tonic ? "none" : "var(--accent-dot)"}
            strokeWidth={1.6}
          />
          <text
            x={x(n.fret)}
            y={y(n.string) + 3.8}
            textAnchor="middle"
            fontSize={n.label.length > 2 ? 8.5 : 10.5}
            fontWeight={800}
            fill={n.tonic ? "var(--ongrad)" : "var(--neck-note-text)"}
            fontFamily="var(--font-inter), sans-serif"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
