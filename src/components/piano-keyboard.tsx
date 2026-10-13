"use client";

import { useLocale } from "next-intl";
import { isBlackKey, noteName, octaveOf } from "@/lib/piano";

/* Colores de los dedos (1 pulgar … 5 meñique), como en los métodos de piano. */
export const FINGER_COLORS: Record<number, string> = {
  1: "#3b82f6",
  2: "#14b8c8",
  3: "#22c55e",
  4: "#f59e0b",
  5: "#8b5cf6",
};

/* Desplazamiento en semitonos de las 7 teclas blancas de una octava. */
const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];
/* Teclas negras: índice de la blanca a cuya derecha caen y su semitono. */
const BLACK_AFTER = [
  [0, 1],
  [1, 3],
  [3, 6],
  [4, 8],
  [5, 10],
] as const;

/**
 * Teclado de piano en SVG.
 * - `pressed`: teclas a resaltar (MIDI); `fingers`: dedo por tecla.
 * - `labels`: nombres de nota bajo las teclas resaltadas ("pressed"), en
 *   todas las teclas ("all") o ninguno.
 * - `noteLabels`: textos propios bajo las teclas resaltadas (escalas: Mi♯,
 *   grados) en lugar del nombre calculado.
 * - `strong`: teclas destacadas (tónica); con él, el resto se atenúa.
 * - `onKey`: tocar una tecla (p. ej. para que suene).
 */
export function PianoKeyboard({
  start,
  octaves,
  pressed = [],
  fingers,
  labels = "none",
  flats = false,
  flatNotes,
  whiteWidth = 24,
  height = 110,
  marks,
  noteLabels,
  strong,
  onKey,
  className = "",
}: {
  start: number;
  octaves: number;
  pressed?: number[];
  fingers?: Record<number, number>;
  labels?: "none" | "pressed" | "all";
  flats?: boolean;
  /** Notas que se escriben con bemol (ortografía por intervalo del acorde). */
  flatNotes?: number[];
  whiteWidth?: number;
  height?: number;
  /** Texto marcado sobre una tecla (p. ej. "C4" en el Do central). */
  marks?: Record<number, string>;
  /** Etiquetas propias por tecla: [principal, secundaria]. */
  noteLabels?: Record<number, [string, string?]>;
  /** Teclas destacadas entre las resaltadas (p. ej. la tónica). */
  strong?: number[];
  onKey?: (midi: number) => void;
  className?: string;
}) {
  const lang = useLocale() === "en" ? "en" : "es";
  const other = lang === "es" ? "en" : "es";
  const W = whiteWidth;
  const H = height;
  const bw = W * 0.6;
  const bh = H * 0.62;
  const whiteCount = octaves * 7;
  const showFingers = Boolean(fingers && Object.keys(fingers).length);
  const top = showFingers ? W * 1.15 : marks ? 16 : 0;
  const name = (midi: number, l: "es" | "en") =>
    noteName(midi, l, flats || Boolean(flatNotes?.includes(midi)));
  const width = whiteCount * W;
  const isOn = (midi: number) => pressed.includes(midi);
  const keyFill = (midi: number, off: string) =>
    !isOn(midi)
      ? off
      : strong && !strong.includes(midi)
        ? "url(#yk-key-soft)"
        : "url(#yk-key-on)";
  const label = (midi: number): [string, string?] =>
    noteLabels?.[midi] ?? [name(midi, lang), name(midi, other)];

  const whites = Array.from({ length: whiteCount }, (_, i) => ({
    i,
    midi: start + 12 * Math.floor(i / 7) + WHITE_STEPS[i % 7],
  }));
  const blacks = Array.from({ length: octaves }, (_, o) =>
    BLACK_AFTER.map(([after, step]) => ({
      x: (o * 7 + after + 1) * W - bw / 2,
      midi: start + 12 * o + step,
    })),
  ).flat();

  const centerX = (midi: number) => {
    if (isBlackKey(midi)) return (blacks.find((b) => b.midi === midi)?.x ?? 0) + bw / 2;
    const w = whites.find((k) => k.midi === midi);
    return w ? w.i * W + W / 2 : 0;
  };

  /* Nombres bajo las teclas: si dos quedan muy juntas (p. ej. Do y Do♯), la
     segunda baja una fila para no encimarse. */
  const labelRows = new Map<number, number>();
  let lastX = -Infinity;
  let lastRow = 1;
  for (const midi of [...pressed].sort((a, b) => centerX(a) - centerX(b))) {
    const x = centerX(midi);
    // blanca y negra contiguas (~media tecla) se encimarían; dos blancas no
    const row = x - lastX < W * 0.75 && lastRow === 0 ? 1 : 0;
    labelRows.set(midi, row);
    lastX = x;
    lastRow = row;
  }
  const bottom =
    labels === "pressed" ? ([...labelRows.values()].includes(1) ? 62 : 34) : 0;

  const keyProps = (midi: number) =>
    onKey
      ? {
          onPointerDown: () => onKey(midi),
          style: { cursor: "pointer" },
          role: "button",
          "aria-label": `${name(midi, lang)}${octaveOf(midi)}`,
        }
      : {};

  return (
    <svg
      viewBox={`0 0 ${width} ${top + H + bottom}`}
      width={width}
      className={`block max-w-full ${className}`}
      aria-hidden={!onKey}
    >
      <defs>
        <linearGradient id="yk-key-on" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--grad-to)" />
          <stop offset="1" stopColor="var(--grad-from)" />
        </linearGradient>
        <linearGradient id="yk-key-soft" x1="0" y1="0" x2="0" y2="1">
          {/* versión clara del gradiente: opaca, para que no se vea el fondo */}
          <stop offset="0" stopColor="#a9eef6" />
          <stop offset="1" stopColor="#a8c2f8" />
        </linearGradient>
      </defs>

      {/* blancas */}
      {whites.map(({ i, midi }) => (
        <g key={midi} {...keyProps(midi)}>
          <rect
            x={i * W + 0.5}
            y={top}
            width={W - 1}
            height={H}
            rx={Math.min(4, W / 6)}
            fill={keyFill(midi, "#e9edf3")}
            stroke="#9aa3b2"
            strokeWidth={0.6}
          />
          {labels === "all" && (
            <>
              <text
                x={i * W + W / 2}
                y={top + H - W * 0.62}
                textAnchor="middle"
                fontSize={W * 0.4}
                fontWeight={800}
                fill={isOn(midi) ? "#04121a" : "#0d1017"}
                fontFamily="var(--font-inter), sans-serif"
              >
                {name(midi, lang)}
              </text>
              <text
                x={i * W + W / 2}
                y={top + H - W * 0.22}
                textAnchor="middle"
                fontSize={W * 0.3}
                fontWeight={700}
                fill="#5b6577"
                fontFamily="var(--font-inter), sans-serif"
              >
                {name(midi, other)}
              </text>
            </>
          )}
        </g>
      ))}

      {/* negras */}
      {blacks.map(({ x, midi }) => (
        <g key={midi} {...keyProps(midi)}>
          <rect
            x={x}
            y={top}
            width={bw}
            height={bh}
            rx={Math.min(3, bw / 6)}
            fill={keyFill(midi, "#151922")}
            stroke="#05070a"
            strokeWidth={0.6}
          />
          {labels === "all" && (
            <text
              x={x + bw / 2}
              y={top + bh - bw * 0.45}
              textAnchor="middle"
              fontSize={bw * 0.36}
              fontWeight={700}
              fill={isOn(midi) ? "#04121a" : "#cfd6e0"}
              fontFamily="var(--font-inter), sans-serif"
            >
              {name(midi, lang)}
            </text>
          )}
        </g>
      ))}

      {/* marcas sobre teclas (p. ej. Do central) */}
      {marks &&
        Object.entries(marks).map(([midi, text]) => (
          <text
            key={midi}
            x={centerX(Number(midi))}
            y={11}
            textAnchor="middle"
            fontSize={10}
            fontWeight={800}
            fill="var(--accent)"
            fontFamily="var(--font-inter), sans-serif"
          >
            {text}
          </text>
        ))}

      {/* dedos */}
      {showFingers &&
        Object.entries(fingers!).map(([midi, finger]) => {
          const cx = centerX(Number(midi));
          const r = W * 0.42;
          return (
            <g key={midi}>
              <circle cx={cx} cy={top - r - 3} r={r} fill={FINGER_COLORS[finger]} />
              <text
                x={cx}
                y={top - r - 3 + r * 0.38}
                textAnchor="middle"
                fontSize={r * 1.15}
                fontWeight={800}
                fill="#fff"
                fontFamily="var(--font-inter), sans-serif"
              >
                {finger}
              </text>
            </g>
          );
        })}

      {/* nombres bajo las teclas tocadas */}
      {labels === "pressed" &&
        pressed.map((midi) => (
          <g key={midi}>
            <text
              x={centerX(midi)}
              y={top + H + 15 + (labelRows.get(midi) ?? 0) * 28}
              textAnchor="middle"
              fontSize={12}
              fontWeight={800}
              fill="var(--accent)"
              fontFamily="var(--font-inter), sans-serif"
            >
              {label(midi)[0]}
            </text>
            <text
              x={centerX(midi)}
              y={top + H + 29 + (labelRows.get(midi) ?? 0) * 28}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="var(--tert)"
              fontFamily="var(--font-inter), sans-serif"
            >
              {label(midi)[1]}
            </text>
          </g>
        ))}
    </svg>
  );
}
