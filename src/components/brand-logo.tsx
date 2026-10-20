import { useId } from "react";

const HEIGHT = 42;
const WIDTH = 1140;
const VIEW_HEIGHT = 610;

/* Azul de "AUDIOTECH" y del travesaño de la A (igual en ambos temas, como el logo original). */
const SUB = "#1e9be8";

/**
 * Logo en SVG de trazos (sin fuentes): un solo dibujo para ambos temas. El
 * wordmark usa el color del texto y la onda el gradiente del tema
 * (--grad-from/--grad-to), así cambia con el tema sin desajustes de
 * hidratación.
 */
export function BrandLogo({ height = HEIGHT }: { height?: number }) {
  // Id único: el header y el login pueden mostrar el logo a la vez.
  const grad = useId();
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${VIEW_HEIGHT}`}
      width={Math.round((WIDTH / VIEW_HEIGHT) * height)}
      height={height}
      role="img"
      aria-label="Yuthikal AudioTech"
      className="block shrink-0 text-ink"
    >
      <defs>
        <linearGradient
          id={grad}
          x1="200"
          y1="0"
          x2="920"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--grad-from)" />
          <stop offset="1" stopColor="var(--grad-to)" />
        </linearGradient>
      </defs>
      <rect
        x="203"
        y="18"
        width="714"
        height="334"
        rx="17"
        fill="none"
        stroke={`url(#${grad})`}
        strokeWidth="7"
      />
      <g
        fill={`url(#${grad})`}
        stroke={`url(#${grad})`}
        strokeWidth="10.5"
        strokeLinecap="round"
      >
        <circle cx="262" cy="185" r="4.5" stroke="none" />
        <circle cx="284" cy="185" r="6" stroke="none" />
        <line x1="306" y1="170" x2="306" y2="200" />
        <line x1="328" y1="151" x2="328" y2="219" />
        <line x1="350" y1="148" x2="350" y2="222" />
        <line x1="372" y1="130" x2="372" y2="240" />
        <line x1="394" y1="139" x2="394" y2="231" />
        <line x1="416" y1="99" x2="416" y2="271" />
        <line x1="438" y1="102" x2="438" y2="268" />
        <line x1="460" y1="107" x2="460" y2="263" />
        <line x1="482" y1="64" x2="482" y2="306" />
        <line x1="504" y1="77" x2="504" y2="293" />
        <line x1="526" y1="62" x2="526" y2="308" />
        <line x1="548" y1="84" x2="548" y2="286" />
        <line x1="570" y1="47" x2="570" y2="323" />
        <line x1="592" y1="78" x2="592" y2="292" />
        <line x1="614" y1="59" x2="614" y2="311" />
        <line x1="636" y1="75" x2="636" y2="295" />
        <line x1="658" y1="103" x2="658" y2="267" />
        <line x1="680" y1="76" x2="680" y2="294" />
        <line x1="702" y1="104" x2="702" y2="266" />
        <line x1="724" y1="104" x2="724" y2="266" />
        <line x1="746" y1="135" x2="746" y2="235" />
        <line x1="768" y1="125" x2="768" y2="245" />
        <line x1="790" y1="150" x2="790" y2="220" />
        <line x1="812" y1="156" x2="812" y2="214" />
        <line x1="834" y1="172" x2="834" y2="198" />
        <circle cx="856" cy="185" r="6" stroke="none" />
        <circle cx="878" cy="185" r="4.5" stroke="none" />
      </g>
      <g transform="translate(5 0)" fill="none" strokeWidth="14">
        {/* Travesaño de la A en forma de nube, debajo de las letras. */}
        <path
          fill={SUB}
          stroke="none"
          d="M875 478 L880.5 470 Q899 465.5 907.5 465 C909.5 464.5 910.5 460.5 913 460 C915.5 460.5 916.5 464.5 918.5 465 Q927 465.5 945.5 470 L951 478 Z"
        />
        <path
          stroke="currentColor"
          d="M22 422 L81 467 L140 422 M81 467 V512 M190 422 V460 A52 52 0 0 0 294 460 V422 M344 422 H454 M399 422 V512 M504 422 V512 M606 422 V512 M504 467 H606 M656 422 V512 M706 422 V512 M802 422 L714 471 M740 457 L806 512 M852 512 L913 422 L974 512 M1024 422 V512 H1108"
        />
      </g>
      <g fill="none" stroke={SUB} strokeWidth="8" strokeLinejoin="round">
        <path
          transform="translate(272 0)"
          d="M0 591 L19 553 L38 591 M9.1 579 H28.9 M80 553 V576 A15 15 0 0 0 110 576 V553 M152 553 V591 H166.4 A17.6 19 0 0 0 166.4 553 Z M226 553 V591 M287 553 A19 19 0 1 0 287 591 A19 19 0 1 0 287 553 Z M348 553 H380 M364 553 V591 M450 553 H422 V591 H450 M422 572 H446 M524 559 A17 19 0 1 0 524 585 M566 553 V591 M596 553 V591 M566 572 H596"
        />
        <path strokeWidth="3" d="M48 572 H232 M908 572 H1092" />
      </g>
    </svg>
  );
}
