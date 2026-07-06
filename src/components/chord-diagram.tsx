export type Barre = { fret: number; from: number; to: number };

export type ChordShape = {
  /** 6 valores, cuerdas 6ª→1ª: -1 muteada, 0 al aire, n>0 traste pisado. */
  frets: number[];
  barres?: Barre[];
};

/* Geometría base del handoff: padX 16, padTop 24, gap cuerdas 15,
   gap trastes 21, 4 trastes visibles. Colores vía tokens de tema. */
const PAD_X = 16;
const PAD_TOP = 24;
const STRING_GAP = 15;
const FRET_GAP = 21;
const FRETS_SHOWN = 4;

export function ChordDiagram({
  frets,
  barres = [],
  scale = 1,
}: ChordShape & { scale?: number }) {
  const played = frets.filter((f) => f > 0);
  const maxFret = played.length ? Math.max(...played) : 0;
  // Si el traste máximo no cabe en la ventana, se desplaza y se etiqueta "Nfr".
  const start = maxFret > FRETS_SHOWN ? Math.min(...played) : 1;
  const shifted = start > 1;

  const leftPad = PAD_X + (shifted ? 15 : 0);
  const gridW = STRING_GAP * 5;
  const svgW = leftPad + gridW + PAD_X;
  const gridH = FRET_GAP * FRETS_SHOWN;
  const svgH = PAD_TOP + gridH + 6;

  const stringX = (i: number) => leftPad + i * STRING_GAP;
  const fretY = (f: number) => PAD_TOP + (f - start + 0.5) * FRET_GAP;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width={svgW * scale}
      height={svgH * scale}
      className="block"
      aria-hidden
    >
      {/* cuerdas */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`s${i}`}
          x1={stringX(i)}
          y1={PAD_TOP}
          x2={stringX(i)}
          y2={PAD_TOP + gridH}
          stroke="var(--diagram-grid)"
          strokeWidth={1.2}
        />
      ))}
      {/* trastes (el primero es la cejuela gruesa si no hay desplazamiento) */}
      {Array.from({ length: FRETS_SHOWN + 1 }, (_, k) => (
        <line
          key={`f${k}`}
          x1={leftPad}
          y1={PAD_TOP + k * FRET_GAP}
          x2={leftPad + gridW}
          y2={PAD_TOP + k * FRET_GAP}
          stroke={k === 0 && !shifted ? "var(--diagram-nut)" : "var(--diagram-grid)"}
          strokeWidth={k === 0 && !shifted ? 3.5 : 1.2}
          strokeLinecap="round"
        />
      ))}
      {/* etiqueta de traste inicial */}
      {shifted && (
        <text
          x={leftPad - 6}
          y={PAD_TOP + 0.5 * FRET_GAP + 3.5}
          textAnchor="end"
          fontSize={10}
          fontWeight={600}
          fill="var(--diagram-mark)"
        >
          {start}fr
        </text>
      )}
      {/* cejillas */}
      {barres.map((b, i) => (
        <rect
          key={`b${i}`}
          x={stringX(b.from) - 5.5}
          y={fretY(b.fret) - 5}
          width={(b.to - b.from) * STRING_GAP + 11}
          height={10}
          rx={5}
          fill="var(--accent-dot)"
        />
      ))}
      {/* marcas ×/○ y puntos */}
      {frets.map((f, i) => {
        const x = stringX(i);
        if (f === -1) {
          const y = PAD_TOP - 10;
          const r = 3.4;
          return (
            <g
              key={`m${i}`}
              stroke="var(--diagram-mark)"
              strokeWidth={1.5}
              strokeLinecap="round"
            >
              <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
              <line x1={x + r} y1={y - r} x2={x - r} y2={y + r} />
            </g>
          );
        }
        if (f === 0) {
          return (
            <circle
              key={`m${i}`}
              cx={x}
              cy={PAD_TOP - 10}
              r={3.6}
              fill="none"
              stroke="var(--diagram-mark)"
              strokeWidth={1.4}
            />
          );
        }
        return (
          <circle key={`m${i}`} cx={x} cy={fretY(f)} r={5.5} fill="var(--accent-dot)" />
        );
      })}
    </svg>
  );
}
